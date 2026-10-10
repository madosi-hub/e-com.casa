import 'server-only';
import type { PrismaClient, ContactMessage, Order } from '@prisma/client';
import { z } from 'zod';
import { placedOrderWhere } from '@/lib/order-visibility';
import { identifier, mailbox, threading, resendRequest } from './resend';
import { EMAILS, COMPANY } from '@/lib/company';
import type { ContactDetail, ContactSummary, OrderSummary, EmailSummary } from './operations-types';
import { EMAIL_PROVIDER, sendTracked } from './tracking';
import { syncInbox } from './inbox';
import { setTimeout as delay } from 'node:timers/promises';

const emailSchema = z.object({id:z.string(),emailId:identifier.optional(),direction:z.enum(['inbound','outbound']),from:z.string(),to:z.array(z.string()),subject:z.string(),text:z.string(),createdAt:z.string(),status:z.string(),orderNumber:z.string().optional(),contactId:z.string().optional(),type:z.string(),error:z.string().optional()});
const confirmationSchema = z.object({emailId:identifier,sendId:z.string().optional(),status:z.string(),createdAt:z.string(),from:z.string().optional(),to:z.array(z.string()).optional(),subject:z.string().optional(),orderNumber:z.string().optional()});
const statusRank: Record<string,number> = {reserved:0,failed_or_uncertain:0,accepted:1,scheduled:1,sent:2,delivery_delayed:2,delivered:3,opened:4,clicked:5,failed:6,bounced:7,suppressed:7,complained:8};
async function emailHistory(db: PrismaClient): Promise<EmailSummary[]> {
  const rows = await db.webhookEvent.findMany({where:{provider:EMAIL_PROVIDER,type:{in:['send','inbound','webhook','historical']}},orderBy:{processedAt:'asc'}});
  const emails = new Map<string,EmailSummary>(), confirmations: z.infer<typeof confirmationSchema>[] = [];
  for (const row of rows) {
    if (row.provider !== EMAIL_PROVIDER) continue;
    try {
      const value = JSON.parse(row.payloadJson);
      if (row.type === 'webhook') { const parsed=confirmationSchema.safeParse(value);if(parsed.success && parsed.data.status !== 'received')confirmations.push(parsed.data); }
      else { const parsed=emailSchema.safeParse(value);if(parsed.success) {
        const email=parsed.data, key=`${email.direction}:${email.emailId || email.id}`;
        if (row.type === 'historical' && email.emailId) confirmations.push({emailId:email.emailId,status:email.status,createdAt:email.createdAt});
        // Locally tracked body and linkage take precedence over metadata-only historical imports.
        if (!emails.has(key) || row.type === 'send') emails.set(key,email);
      } }
    } catch { /* Ignore unrelated or malformed legacy telemetry. */ }
  }
  confirmations.sort((a,b)=>a.createdAt.localeCompare(b.createdAt));
  for (const event of confirmations) {
    const key=`outbound:${event.emailId}`;
    const reservation = event.sendId ? [...emails.entries()].find(([,email])=>email.id===event.sendId) : undefined;
    if (reservation) { emails.delete(reservation[0]);emails.set(key,{...reservation[1],emailId:event.emailId}); }
    const email=emails.get(key);
    if (email) {
      if ((statusRank[event.status] ?? 0) >= (statusRank[email.status] ?? 0)) email.status=event.status;
    } else emails.set(key,{id:`resend:provider:${event.emailId}`,emailId:event.emailId,direction:'outbound',from:event.from || '',to:event.to || [],subject:event.subject || '(Provider event)',text:'',createdAt:event.createdAt,status:event.status,type:'provider_event',...(event.orderNumber?{orderNumber:event.orderNumber}:{})});
  }
  return [...emails.values()].sort((a,b)=>b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id));
}

function contactSummary(contact: ContactMessage): ContactSummary {
  return {id:contact.id,name:contact.name,email:contact.email,orderRef:contact.orderRef || null,subject:contact.subject,message:contact.message,createdAt:contact.createdAt.toISOString(),source:contact.id.startsWith('resend-contact-')?'email':'form'};
}
function orderSummary(order: Order): OrderSummary {
  let items: OrderSummary['items'] = [];
  try {
    items = z.array(z.object({name:z.string().optional(),slug:z.string().optional(),quantity:z.number().int().positive().optional(),price:z.union([z.string(),z.number()]).optional()})).parse(JSON.parse(order.itemsJson)).map(item => ({name:item.name || item.slug || 'Item',quantity:item.quantity || 1,...(item.price !== undefined ? {price:String(item.price)}:{})}));
  } catch { /* Legacy malformed items cannot hide a customer's placed order. */ }
  return {id:order.id,orderNumber:order.orderNumber,email:order.email,customerName:`${order.firstName} ${order.lastName}`.trim(),createdAt:order.createdAt.toISOString(),paidAt:order.paidAt?.toISOString() || null,total:order.total,currency:order.currency,status:order.status,paymentStatus:order.paymentStatus,trackingNumber:order.trackingNumber,items};
}
export function integrationStatus() {
  return {sendingConfigured:Boolean(process.env.RESEND_API_KEY),webhookConfigured:Boolean(process.env.RESEND_WEBHOOK_SECRET),historyNotice:'Local history begins with activation. Older provider history and bodies depend on Resend retention and explicit inbox sync; attachments are not supported.'};
}
const pageInput = z.object({query:z.string().trim().max(200).optional(),page:z.number().int().min(1).max(100_000).optional()});
export function createEmailOperations(db: PrismaClient, dependencies: {request?:typeof resendRequest} = {}) {
  async function syncEmailInbox(input: {cursor?:string} = {}): Promise<{imported:number;hasMore:boolean;nextCursor?:string}> {
    const {cursor}=z.object({cursor:z.string().max(200).regex(/^(?:inbox:[A-Za-z0-9_-]+|sent(?::[A-Za-z0-9_-]+)?)$/).optional()}).parse(input);
    if (!process.env.RESEND_API_KEY) throw new Error('Email integration is not configured');
    // Serial requests stay below the default provider request budget within this import.
    const request: typeof resendRequest = dependencies.request || (async(path,options)=>{await delay(600);return resendRequest(path,options);});
    if (!cursor?.startsWith('sent')) {
      const result=await syncInbox(db,cursor?.slice(6),request);
      return {...result,hasMore:true,nextCursor:result.hasMore?`inbox:${result.nextCursor}`:'sent'};
    }
    const after=cursor.startsWith('sent:')?identifier.parse(cursor.slice(5)):undefined;
    const page=z.object({data:z.array(z.object({id:identifier,from:z.string().max(1000),to:z.array(z.string().max(1000)).max(100),subject:z.string().max(1000),created_at:z.string().refine(value=>Number.isFinite(Date.parse(value))),last_event:z.string().max(100).nullable().optional()})).max(10),has_more:z.boolean()}).parse(await request(`/emails?limit=10${after?`&after=${encodeURIComponent(after)}`:''}`));
    if(page.has_more && !page.data.length)throw new Error('Invalid provider pagination');
    let imported=0;
    for(const item of page.data){
      const id=`resend:historical:${item.id}`;
      const email: EmailSummary={id,emailId:item.id,direction:'outbound',from:item.from,to:item.to,subject:item.subject,text:'',createdAt:new Date(item.created_at).toISOString(),status:item.last_event || 'provider_unknown',type:'historical'};
      await db.$transaction(async tx=>{
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${id}))::text`;
        const existing=await tx.webhookEvent.findUnique({where:{id}});
        if(existing)await tx.webhookEvent.update({where:{id},data:{payloadJson:JSON.stringify(email)}});
        else {await tx.webhookEvent.create({data:{id,provider:EMAIL_PROVIDER,type:'historical',payloadJson:JSON.stringify(email)}});imported++;}
      });
    }
    return {imported,hasMore:page.has_more,...(page.has_more?{nextCursor:`sent:${page.data[page.data.length-1].id}`}:{})};
  }
  async function replyToContact(input: {contactId:string;message:string;requestId:string}): Promise<{email:EmailSummary}> {
    const data = z.object({contactId:identifier,message:z.string().trim().min(1).max(20_000).refine(value=>!value.includes('\x00')),requestId:identifier}).parse(input);
    if (!process.env.RESEND_API_KEY) throw new Error('Email integration is not configured');
    const contact=await db.contactMessage.findUnique({where:{id:data.contactId}});
    if (!contact) throw new Error('Contact not found');
    const recipient=mailbox(contact.email);
    if (/[\r\n\x00]/.test(contact.subject)) throw new Error('Invalid contact subject');
    const inboundRows=await db.webhookEvent.findMany({where:{provider:EMAIL_PROVIDER,type:'inbound'},orderBy:{processedAt:'desc'}});
    let thread: ReturnType<typeof threading> = {};
    for (const row of inboundRows) {
      if (row.provider !== EMAIL_PROVIDER || row.type !== 'inbound') continue;
      try {const stored=JSON.parse(row.payloadJson);if(stored.contactId===contact.id){thread=threading(stored.messageId,stored.references);break;}} catch { /* malformed legacy telemetry */ }
    }
    const headers=thread.messageId?{'In-Reply-To':thread.messageId,References:[thread.references,thread.messageId].filter(Boolean).join(' ')}:undefined;
    const email=await sendTracked(db,{key:`reply:${data.requestId}`,from:`${COMPANY.brand} <${EMAILS.support}>`,to:[recipient],reply_to:[EMAILS.support],subject:(/^re:/i.test(contact.subject)?contact.subject:`Re: ${contact.subject}`).slice(0,998),text:data.message,headers,type:'reply',contactId:contact.id,...(contact.orderRef?{orderNumber:contact.orderRef}:{}),requireTracking:true,rateLimited:true},dependencies.request || resendRequest);
    return {email:emailSchema.parse(email)};
  }
  async function loadContacts(input: {query?:string;page?:number} = {}) {
    const parsed = pageInput.parse(input), page = parsed.page || 1, pageSize = 20;
    const where = parsed.query ? {OR:['name','email','subject','message','orderRef'].map(field => ({[field]:{contains:parsed.query,mode:'insensitive' as const}}))} : {};
    const [contacts,total,subscribers] = await Promise.all([db.contactMessage.findMany({where,orderBy:[{createdAt:'desc'},{id:'desc'}],skip:(page-1)*pageSize,take:pageSize}),db.contactMessage.count({where}),db.newsletterSubscriber.count()]);
    return {messages:contacts.map(contactSummary),total,page,pageSize,subscribers,integration:integrationStatus()};
  }
  async function searchContactOrders(input: {contactId:string;query:string}): Promise<OrderSummary[]> {
    const data = z.object({contactId:identifier,query:z.string().trim().max(200)}).parse(input);
    const contact = await db.contactMessage.findUnique({where:{id:data.contactId}});
    if (!contact) throw new Error('Contact not found');
    const orders = await db.order.findMany({where:{AND:[placedOrderWhere,...(data.query ? [{OR:[{orderNumber:{contains:data.query,mode:'insensitive' as const}},{email:{contains:data.query,mode:'insensitive' as const}},{firstName:{contains:data.query,mode:'insensitive' as const}},{lastName:{contains:data.query,mode:'insensitive' as const}}]}] : [{email:{equals:contact.email,mode:'insensitive' as const}}])]},orderBy:{createdAt:'desc'},take:20});
    return orders.map(orderSummary);
  }
  async function linkContactOrder(input: {contactId:string;orderNumber:string|null}): Promise<ContactDetail> {
    const data = z.object({contactId:identifier,orderNumber:identifier.nullable()}).parse(input);
    if (!await db.contactMessage.findUnique({where:{id:data.contactId}})) throw new Error('Contact not found');
    if (data.orderNumber && !await db.order.findFirst({where:{AND:[placedOrderWhere,{orderNumber:data.orderNumber}]}})) throw new Error('Select a placed order, not a checkout draft');
    await db.contactMessage.update({where:{id:data.contactId},data:{orderRef:data.orderNumber}});
    return loadContact(data.contactId);
  }
  async function loadContact(id: string): Promise<ContactDetail> {
    identifier.parse(id);
    const contact = await db.contactMessage.findUnique({where:{id}});
    if (!contact) throw new Error('Contact not found');
    const orders = await db.order.findMany({where:{AND:[placedOrderWhere,{OR:[{email:{equals:contact.email,mode:'insensitive'}},...(contact.orderRef ? [{orderNumber:contact.orderRef}]:[])]}]},orderBy:{createdAt:'desc'}});
    const history = await emailHistory(db);
    const emails = history.filter(email => email.contactId === id || email.orderNumber && orders.some(order=>order.orderNumber===email.orderNumber) || (email.direction === 'outbound' ? email.to.some(to=>to.toLowerCase()===contact.email.toLowerCase()) : email.from.toLowerCase()===contact.email.toLowerCase() || email.from.toLowerCase().endsWith(`<${contact.email.toLowerCase()}>`)));
    return {contact:contactSummary(contact),orders:orders.map(orderSummary),linkedOrder:orders.find(order => order.orderNumber === contact.orderRef) ? orderSummary(orders.find(order => order.orderNumber === contact.orderRef)!) : null,emails,historyLimited:true};
  }
  async function loadEmailActivity(input: {query?:string;status?:string;page?:number} = {}) {
    const parsed = pageInput.extend({status:z.string().max(100).optional()}).parse(input);
    const query = parsed.query?.toLowerCase(), page = parsed.page || 1, pageSize=20;
    const emails = (await emailHistory(db)).filter(email=>(!parsed.status || parsed.status === 'all' || email.status===parsed.status) && (!query || [email.from,...email.to,email.subject,email.text,email.orderNumber || ''].some(value=>value.toLowerCase().includes(query))));
    return {emails:emails.slice((page-1)*pageSize,page*pageSize),total:emails.length,page,pageSize,integration:integrationStatus()};
  }
  return {loadContact,loadContacts,searchContactOrders,linkContactOrder,loadEmailActivity,replyToContact,syncEmailInbox};
}
