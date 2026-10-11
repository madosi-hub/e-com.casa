import 'server-only';
import type { PrismaClient, Prisma } from '@prisma/client';
import { z } from 'zod';
import { identifier, normalizeReceived, resendRequest } from './resend';
import { EMAIL_PROVIDER, digest } from './tracking';
import type { StoredEmail } from './tracking';

const timestamp = z.string().refine(value => Number.isFinite(Date.parse(value)));
const eventSchema = z.object({ type: z.enum(['email.received','email.sent','email.delivered','email.delivery_delayed','email.bounced','email.complained','email.opened','email.clicked','email.failed','email.scheduled','email.suppressed']), created_at: timestamp, data: z.object({email_id:identifier,from:z.string().max(1000).optional(),to:z.array(z.string().max(1000)).max(100).optional(),subject:z.string().max(1000).optional(),tags:z.record(z.string(),z.string()).optional()}) });
async function importReceived(tx: Prisma.TransactionClient, received: ReturnType<typeof normalizeReceived>): Promise<boolean> {
  const id = `resend:inbound:${received.emailId}`;
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${id}))::text`;
  if (await tx.webhookEvent.findUnique({where:{id}})) return false;
  const contactId = `resend-contact-${digest(received.emailId)}`;
  await tx.contactMessage.create({data:{id:contactId,name:received.sender,email:received.sender,subject:received.subject,message:received.text,createdAt:new Date(received.createdAt)}});
  const email: StoredEmail = {id,emailId:received.emailId,direction:'inbound',from:received.from,to:received.to,subject:received.subject,text:received.text,createdAt:received.createdAt,status:'received',type:'received',contactId, ...(received.messageId?{messageId:received.messageId}:{}), ...(received.references?{references:received.references}:{})};
  await tx.webhookEvent.create({data:{id,provider:EMAIL_PROVIDER,type:'inbound',payloadJson:JSON.stringify(email)}});
  return true;
}
export async function processWebhook(db: PrismaClient, svixId: string, input: unknown, request = resendRequest): Promise<void> {
  identifier.parse(svixId);
  const event = eventSchema.parse(input), id = `resend:webhook:${svixId}`;
  if (await db.webhookEvent.findUnique({where:{id}})) return;
  let received: ReturnType<typeof normalizeReceived> | null = null;
  if (event.type === 'email.received') {
    try { received = normalizeReceived(await request(`/emails/receiving/${event.data.email_id}?html_format=cid`)); }
    catch { throw new Error('Received email retrieval unavailable'); }
  }
  if (received && received.emailId !== event.data.email_id) throw new Error('Received email ID mismatch');
  await db.$transaction(async tx => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${id}))::text`;
    if (await tx.webhookEvent.findUnique({where:{id}})) return;
    if (received) await importReceived(tx,received);
    // Retain only bounded metadata: never signed raw/attachment download URLs or complete headers.
    await tx.webhookEvent.create({data:{id,provider:EMAIL_PROVIDER,type:'webhook',payloadJson:JSON.stringify({emailId:event.data.email_id,status:event.type.slice(6),createdAt:new Date(event.created_at).toISOString(),from:event.data.from,to:event.data.to,subject:event.data.subject,orderNumber:event.data.tags?.order,...(event.data.tags?.ecom_send && /^[a-f0-9]{64}$/.test(event.data.tags.ecom_send)?{sendId:`resend:send:${event.data.tags.ecom_send}`}:{})})}});
  });
}
export async function syncInbox(db: PrismaClient, cursor?: string, request = resendRequest): Promise<{imported:number;hasMore:boolean;nextCursor?:string}> {
  if (cursor) identifier.parse(cursor);
  const page = z.object({data:z.array(z.object({id:identifier})).max(10),has_more:z.boolean()}).parse(await request(`/emails/receiving?limit=10${cursor ? `&after=${encodeURIComponent(cursor)}` : ''}`));
  if (page.has_more && !page.data.length) throw new Error('Invalid provider pagination');
  let imported = 0;
  for (const entry of page.data) {
    if (await db.webhookEvent.findUnique({where:{id:`resend:inbound:${entry.id}`}})) continue;
    const received = normalizeReceived(await request(`/emails/receiving/${entry.id}?html_format=cid`));
    if (received.emailId !== entry.id) throw new Error('Received email ID mismatch');
    if (await db.$transaction(tx => importReceived(tx,received))) imported++;
  }
  return {imported,hasMore:page.has_more,...(page.has_more ? {nextCursor:page.data[page.data.length-1].id}:{})};
}
