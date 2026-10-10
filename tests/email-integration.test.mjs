import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { createHmac } from 'node:crypto';
const require = createRequire(import.meta.url);
const ts = require('typescript');
export function load(file, mocks = {}) {
 const filename = path.resolve(file);
 if (!fs.existsSync(filename)) return {};
 const source = ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const m = {exports:{}};
 const local = name => name in mocks ? mocks[name] : name === 'server-only' ? {} : name.startsWith('.') ? load(path.resolve(path.dirname(filename), name+'.ts'), mocks) : require(name);
 new Function('require','module','exports',source)(local,m,m.exports); return m.exports;
}
const core = () => load('src/lib/email/resend.ts');
export function memoryDb() {
 const rows=new Map(), contacts=new Map(); let tail=Promise.resolve();
 const events={findUnique:async({where})=>rows.get(where.id)||null,create:async({data})=>{if(rows.has(data.id))throw Object.assign(new Error('unique'),{code:'P2002'});rows.set(data.id,{...data,processedAt:new Date()});return rows.get(data.id);},update:async({where,data})=>{rows.set(where.id,{...rows.get(where.id),...data});return rows.get(where.id);},findMany:async()=>[...rows.values()]};
 const db={webhookEvent:events,contactMessage:{create:async({data})=>{if(contacts.has(data.id))throw Object.assign(new Error('unique'),{code:'P2002'});contacts.set(data.id,data);return data;},findUnique:async({where})=>contacts.get(where.id)||null},$queryRaw:async()=>[],rows,contacts};
 db.$transaction = fn => {const p=tail.then(()=>fn(db));tail=p.catch(()=>{});return p;};return db;
}
const tracking = () => load('src/lib/email/tracking.ts');
const inbox = () => load('src/lib/email/inbox.ts');
const operations = (db) => load('src/lib/email/operations.ts',{'@/lib/company':load('src/lib/company.ts'),'@/lib/order-visibility':load('src/lib/order-visibility.ts')}).createEmailOperations(db);
test('received detail tolerates nullable provider headers without discarding body', () => {
 const email=core().normalizeReceived({id:'null-headers',from:'alice@example.com',to:['support@example.com'],subject:'Hi',created_at:'2026-10-10T00:00:00Z',text:'Hello',headers:null});
 assert.equal(email.text,'Hello');assert.equal(email.messageId,undefined);
});
test('malformed provider retrieval is retryable processing failure, not malformed webhook', async () => {
 const db=memoryDb();
 const event={type:'email.received',created_at:'2026-10-10T00:00:00Z',data:{email_id:'abc'}};
 let error;try{await inbox().processWebhook(db,'msg_bad_body',event,async()=>({id:'abc',text:'incomplete'}));}catch(caught){error=caught;}
 assert.ok(error);assert.notEqual(error.name,'ZodError');assert.equal(db.rows.size,0);
});
test('webhook body reader stops and cancels oversized chunked uploads', async () => {
 let cancelled=false;
 const stream=new ReadableStream({start(controller){controller.enqueue(new Uint8Array(256001));},cancel(){cancelled=true;}});
 const loaded=load('src/app/api/webhooks/resend/route.ts',{'@/lib/db':{db:{}},'@/lib/email/inbox':inbox(),'@/lib/email/resend':core()});
 process.env.RESEND_WEBHOOK_SECRET='whsec_'+Buffer.from('test-secret').toString('base64');
 const request=new Request('https://example.com',{method:'POST',body:stream,duplex:'half'});
 const result=await Promise.race([loaded.POST(request),new Promise(resolve=>setTimeout(()=>resolve(null),100))]);
 delete process.env.RESEND_WEBHOOK_SECRET;
 assert.ok(result,'oversized streaming uploads must not wait for stream completion');assert.equal(result.status,413);assert.equal(cancelled,true);
});
test('transport refuses redirects and rejects oversized unsigned webhook bodies', async () => {
 let options;
 await core().resendRequest('/emails',{}, {apiKey:'fake',fetcher:async(_url,init)=>{options=init;return new Response('{}');}});
 assert.equal(options.redirect,'error');
 const loaded=load('src/app/api/webhooks/resend/route.ts',{'@/lib/db':{db:{}},'@/lib/email/inbox':inbox(),'@/lib/email/resend':core()});
 process.env.RESEND_WEBHOOK_SECRET='whsec_'+Buffer.from('test-secret').toString('base64');
 const response=await loaded.POST(new Request('https://example.com',{method:'POST',body:'x'.repeat(256001)}));
 delete process.env.RESEND_WEBHOOK_SECRET;assert.equal(response.status,413);
});
test('provider correlation tags allow webhook recovery after tracking update failure', async () => {
 const db=memoryDb();let body;
 const key='tracked-order';
 const sent=await tracking().sendTracked(db,{key,from:'support@example.com',to:['a@example.com'],subject:'Hi',text:'Hi',type:'reply'},async(_path,options)=>{body=options.body;return {id:'provider'};});
 assert.ok(body.tags?.find(tag=>tag.name==='ecom_send'));
 const token=body.tags.find(tag=>tag.name==='ecom_send').value;
 await inbox().processWebhook(db,'msg_recover',{type:'email.delivered',created_at:'2026-10-10T00:00:00Z',data:{email_id:'provider',tags:{ecom_send:token}}});
 const event=JSON.parse(db.rows.get('resend:webhook:msg_recover').payloadJson);
 assert.equal(event.sendId,sent.id);
});
test('historical delivery status enriches local body and confirmation correlates retained reservations', async () => {
 const db=memoryDb();
 const sent={id:'resend:send:one',emailId:'abc',direction:'outbound',from:'support@example.com',to:['alice@example.com'],subject:'Local',text:'Local body',createdAt:'2026-10-09T00:00:00Z',status:'accepted',type:'reply'};
 db.rows.set(sent.id,{id:sent.id,provider:'resend',type:'send',payloadJson:JSON.stringify(sent)});
 db.rows.set('historical',{id:'historical',provider:'resend',type:'historical',payloadJson:JSON.stringify({...sent,id:'historical',text:'',status:'delivered',type:'historical'})});
 const reserved={...sent,id:'resend:send:two',emailId:undefined,status:'reserved'};
 db.rows.set(reserved.id,{id:reserved.id,provider:'resend',type:'send',payloadJson:JSON.stringify(reserved)});
 db.rows.set('confirmed',{id:'confirmed',provider:'resend',type:'webhook',payloadJson:JSON.stringify({emailId:'two',sendId:'resend:send:two',status:'delivered',createdAt:'2026-10-10T00:00:00Z'})});
 const activity=await operations(db).loadEmailActivity();
 assert.equal(activity.total,2);assert.ok(activity.emails.every(email=>email.status==='delivered'));assert.equal(activity.emails.find(email=>email.emailId==='abc').text,'Local body');
});
test('send budget is durable, failed replies stay recorded and reservation failure never sends', async () => {
 const db=memoryDb();let calls=0;
 const send=async()=>{calls++;return {id:`sent-${calls}`};};
 const input={from:'support@example.com',to:['a@example.com'],subject:'Hi',text:'Hi',type:'reply',requireTracking:true,rateLimited:true};
 for(let n=0;n<10;n++)await tracking().sendTracked(db,{...input,key:`rate-${n}`},send);
 await assert.rejects(tracking().sendTracked(db,{...input,key:'rate-eleven'},send),/limit/);assert.equal(calls,10);
 const down=memoryDb();down.$transaction=async()=>{throw new Error('database unavailable');};
 const result=await tracking().sendTracked(down,{...input,key:'order-safe',requireTracking:false,rateLimited:false},send);
 assert.equal(calls,10);assert.equal(result.status,'failed_or_uncertain');
 const rejected=await tracking().sendTracked(memoryDb(),{...input,key:'reject'},async()=>{throw new Error('Resend request failed (422)');});
 assert.equal(rejected.status,'failed');assert.equal(rejected.error,'Resend request failed (422)');
});
test('every exported admin action independently authenticates before delegation and returns safe errors', async () => {
 const names=['loadContacts','loadContact','searchContactOrders','linkContactOrder','replyToContact','loadEmailActivity','syncEmailInbox'];
 let auth=0,called=0;
 const ops=Object.fromEntries(names.map(name=>[name,async()=>{called++;return {marker:name};}]));
 const loaded=load('src/app/admin/email-actions.ts',{'@/lib/admin/auth':{requireAdmin:async()=>{auth++;}},'@/lib/db':{db:{}},'@/lib/email/operations':{createEmailOperations:()=>ops}});
 for(const name of names){assert.equal(typeof loaded[name],'function');const result=await loaded[name]();assert.deepEqual(result,{ok:true,data:{marker:name}});}
 assert.equal(auth,7);assert.equal(called,7);
 const unauthorized=load('src/app/admin/email-actions.ts',{'@/lib/admin/auth':{requireAdmin:async()=>{throw new Error('Unauthorized');}},'@/lib/db':{db:{}},'@/lib/email/operations':{createEmailOperations:()=>ops}});
 for(const name of names)await assert.rejects(unauthorized[name](),/Unauthorized/);
 ops.loadContact=async()=>{throw new Error('SECRET_DATABASE_URL');};
 assert.deepEqual(await loaded.loadContact('one'),{ok:false,error:'Email operations unavailable. Please try again.'});
});
test('explicit admin sync walks received then sent pages with truthful opaque cursors and historical status', async () => {
 const db=memoryDb();let calls=[];
 const request=async(path)=>{calls.push(path);if(path.startsWith('/emails/receiving?'))return {data:[],has_more:false};return {data:[{id:'old',from:'orders@example.com',to:['alice@example.com'],subject:'Old order',created_at:'2026-01-01T00:00:00Z',last_event:'delivered'}],has_more:false};};
 const ops=load('src/lib/email/operations.ts',{'@/lib/company':load('src/lib/company.ts'),'@/lib/order-visibility':load('src/lib/order-visibility.ts')}).createEmailOperations(db,{request});
 assert.equal(typeof ops.syncEmailInbox,'function');process.env.RESEND_API_KEY='test';
 const first=await ops.syncEmailInbox();assert.deepEqual(first,{imported:0,hasMore:true,nextCursor:'sent'});
 const second=await ops.syncEmailInbox({cursor:first.nextCursor});assert.deepEqual(second,{imported:1,hasMore:false});
 delete process.env.RESEND_API_KEY;
 assert.deepEqual(calls,['/emails/receiving?limit=10','/emails?limit=10']);
 const history=await ops.loadEmailActivity();assert.equal(history.emails[0].status,'delivered');assert.equal(history.emails[0].type,'historical');
});
test('replies use database recipient and inbound thread, refuse missing config and deduplicate request IDs', async () => {
 const db=memoryDb();db.contacts.set('contact',{id:'contact',name:'Alice',email:'alice@example.com',subject:'Hi',message:'Hi',orderRef:'ORDER',createdAt:new Date()});
 db.rows.set('inbound',{id:'inbound',provider:'resend',type:'inbound',payloadJson:JSON.stringify({contactId:'contact',messageId:'<one@example.com>',references:'<old@example.com>'})});
 let calls=0,body;
 const make=()=>load('src/lib/email/operations.ts',{'@/lib/company':load('src/lib/company.ts'),'@/lib/order-visibility':load('src/lib/order-visibility.ts')}).createEmailOperations(db,{request:async(_path,options)=>{calls++;body=options.body;return {id:'sent'};}});
 const ops=make();assert.equal(typeof ops.replyToContact,'function');
 delete process.env.RESEND_API_KEY;
 await assert.rejects(ops.replyToContact({contactId:'contact',message:'Hello',requestId:'request-one'}),/not configured/);
 process.env.RESEND_API_KEY='test';
 const input={contactId:'contact',message:'Hello <script>literal</script>',requestId:'request-one',to:'evil@example.com'};
 const first=await ops.replyToContact(input);await ops.replyToContact(input);
 delete process.env.RESEND_API_KEY;
 assert.equal(calls,1);assert.equal(first.email.status,'accepted');assert.deepEqual(body.to,['alice@example.com']);assert.equal(body.subject,'Re: Hi');assert.equal(body.headers['In-Reply-To'],'<one@example.com>');assert.equal(body.headers.References,'<old@example.com> <one@example.com>');assert.equal(body.html,undefined);
 await assert.rejects(ops.replyToContact({contactId:'contact',message:'',requestId:'request-two'}));
});
test('activity merges provider confirmations without duplicate rows and contact history scopes by recipient', async () => {
 const db=memoryDb();db.contacts.set('contact',{id:'contact',name:'Alice',email:'alice@example.com',subject:'Hi',message:'Hi',createdAt:new Date()});db.order={findMany:async()=>[]};
 const sent={id:'resend:send:one',emailId:'abc',direction:'outbound',from:'support@example.com',to:['alice@example.com'],subject:'Reply',text:'Hello',createdAt:'2026-10-09T00:00:00Z',status:'accepted',type:'reply'};
 db.rows.set(sent.id,{id:sent.id,provider:'resend',type:'send',payloadJson:JSON.stringify(sent)});
 db.rows.set('evt',{id:'evt',provider:'resend',type:'webhook',payloadJson:JSON.stringify({emailId:'abc',status:'delivered',createdAt:'2026-10-10T00:00:00Z'})});
 const ops=operations(db);assert.equal(typeof ops.loadEmailActivity,'function');
 const activity=await ops.loadEmailActivity({status:'delivered'});assert.equal(activity.total,1);assert.equal(activity.emails[0].status,'delivered');assert.equal(activity.emails[0].text,'Hello');
 const detail=await ops.loadContact('contact');assert.equal(detail.emails.length,1);assert.equal(detail.emails[0].subject,'Reply');
});
test('contacts paginate locally, orders search excludes drafts and explicit linking updates only stored reference', async () => {
 const db=memoryDb();const c={id:'contact',name:'Alice',email:'alice@example.com',orderRef:null,subject:'Hi',message:'hello',createdAt:new Date()};db.contacts.set(c.id,c);
 let query;
 db.contactMessage.findMany=async input=>{query=input;return [c];};db.contactMessage.count=async()=>1;db.newsletterSubscriber={count:async()=>7};
 db.order={findMany:async()=>[],findFirst:async()=>null};
 db.contactMessage.update=async({where,data})=>{db.contacts.set(where.id,{...db.contacts.get(where.id),...data});return db.contacts.get(where.id);};
 const ops=operations(db);assert.equal(typeof ops.loadContacts,'function');
 const list=await ops.loadContacts({query:'alice',page:2});assert.equal(list.subscribers,7);assert.equal(list.total,1);assert.equal(query.skip,20);assert.equal(query.where.OR[0].name.mode,'insensitive');
 assert.deepEqual(await ops.searchContactOrders({contactId:'contact',query:'missing'}),[]);
 await assert.rejects(ops.linkContactOrder({contactId:'contact',orderNumber:'DRAFT'}),/placed order/);
 const detail=await ops.linkContactOrder({contactId:'contact',orderNumber:null});assert.equal(detail.contact.orderRef,null);
});
test('contact details relate all email matches and explicit link but never checkout drafts or auto-link', async () => {
 const db=memoryDb();db.contacts.set('contact',{id:'contact',name:'Alice',email:'Alice@Example.com',orderRef:null,subject:'Hi',message:'Hi',createdAt:new Date('2026-10-10')});
 let orderQuery;
 db.order={findMany:async input=>{orderQuery=input;return [{id:'one',orderNumber:'ONE',email:'alice@example.com',firstName:'Alice',lastName:'Test',itemsJson:'[{"name":"Panel","quantity":2}]',createdAt:new Date('2026-10-10'),paidAt:new Date(),paymentStatus:'PAID',status:'PROCESSING',total:'20',currency:'EUR',trackingNumber:null}];}};
 assert.equal(typeof load('src/lib/email/operations.ts',{'@/lib/company':load('src/lib/company.ts'),'@/lib/order-visibility':load('src/lib/order-visibility.ts')}).createEmailOperations,'function');
 const detail=await operations(db).loadContact('contact');
 assert.equal(detail.contact.source,'form');assert.equal(detail.linkedOrder,null);assert.equal(detail.orders.length,1);assert.equal(detail.orders[0].customerName,'Alice Test');
 assert.equal(orderQuery.where.AND[0].OR[1].paymentStatus.in.includes('PAID'),true);
 assert.equal(orderQuery.where.AND[1].OR[0].email.mode,'insensitive');
});
test('webhook route requires config and verifies raw signature before processing', async () => {
 const calls=[];const loaded=load('src/app/api/webhooks/resend/route.ts',{'@/lib/db':{db:{}},'@/lib/email/inbox':{processWebhook:async(...args)=>calls.push(args)},'@/lib/email/resend':core()});
 assert.equal(typeof loaded.POST,'function');
 delete process.env.RESEND_WEBHOOK_SECRET;
 assert.equal((await loaded.POST(new Request('https://example.com',{method:'POST',body:'{}'}))).status,503);
 process.env.RESEND_WEBHOOK_SECRET='whsec_'+Buffer.from('test-secret').toString('base64');
 assert.equal((await loaded.POST(new Request('https://example.com',{method:'POST',body:'{}'}))).status,400);assert.equal(calls.length,0);
 const raw=JSON.stringify({type:'email.delivered',created_at:'2026-10-10T00:00:00Z',data:{email_id:'abc'}}), stamp=String(Math.floor(Date.now()/1000)), id='msg_valid';
 const sig=createHmac('sha256','test-secret').update(`${id}.${stamp}.${raw}`).digest('base64');
 assert.equal((await loaded.POST(new Request('https://example.com',{method:'POST',body:raw,headers:{'svix-id':id,'svix-timestamp':stamp,'svix-signature':`v1,${sig}`}}))).status,200);
 assert.equal(calls.length,1);delete process.env.RESEND_WEBHOOK_SECRET;
});
test('inbound webhook fetch failure remains retryable; successful concurrent retries import one contact', async () => {
 assert.equal(typeof inbox().processWebhook,'function');
 const db=memoryDb(), payload={type:'email.received',created_at:'2026-10-10T00:00:00Z',data:{email_id:'abc',from:'alice@example.com',to:['support@example.com'],subject:'Hi'}};
 await assert.rejects(inbox().processWebhook(db,'msg_one',payload,async()=>{throw new Error('down');}));
 assert.equal(db.rows.size,0);
 const request=async()=>({id:'abc',from:'alice@example.com',to:['support@example.com'],subject:'Hi',created_at:'2026-10-10T00:00:00Z',text:'Hello',message_id:'<one@example.com>'});
 await Promise.all([inbox().processWebhook(db,'msg_one',payload,request),inbox().processWebhook(db,'msg_one',payload,request)]);
 assert.equal(db.contacts.size,1); assert.equal(db.rows.size,2);
 await assert.rejects(inbox().processWebhook(db,'msg_bad',{type:'email.received',data:{email_id:'../../evil'}},request));
});
test('bounded inbox sync imports serially, uses provider pagination and no send endpoint', async () => {
 assert.equal(typeof inbox().syncInbox,'function');
 const db=memoryDb(), paths=[];
 const request=async path=>{paths.push(path);return path.includes('?limit=')?{data:[{id:'abc'}],has_more:true}:{id:'abc',from:'alice@example.com',to:['support@example.com'],subject:'Hi',created_at:'2026-10-10T00:00:00Z',text:'Hello'};};
 assert.deepEqual(await inbox().syncInbox(db,'previous',request),{imported:1,hasMore:true,nextCursor:'abc'});
 assert.equal(paths[0],'/emails/receiving?limit=10&after=previous');
 assert.equal(paths[1],'/emails/receiving/abc?html_format=cid');
});
test('existing order send templates delegate tracked delivery and preserve boolean callers', async () => {
 let recorded;
 const loaded=load('src/lib/email/order-email.ts',{'@/lib/company':load('src/lib/company.ts'),'@/lib/db':{db:{}},'./tracking':{sendTracked:async(_db,input)=>{recorded=input;return {status:'accepted'};}}});
 process.env.RESEND_API_KEY='test';
 const previousFetch=globalThis.fetch;globalThis.fetch=async()=>new Response('{"id":"test"}');
 const result=await loaded.sendPaymentConfirmedEmail({orderNumber:'ORDER-1',customerEmail:'a@example.com',firstName:'A',total:'10',currency:'EUR',itemsJson:'[]'});
 globalThis.fetch=previousFetch;
 delete process.env.RESEND_API_KEY;
 assert.equal(result,true); assert.ok(recorded,'tracked sender must be called');assert.equal(recorded.orderNumber,'ORDER-1');assert.equal(recorded.type,'payment_confirmed');assert.ok(recorded.html);
});
test('durable send reservation prevents concurrent duplicate delivery and detects changed content', async () => {
 assert.equal(typeof tracking().sendTracked,'function');
 const db=memoryDb(); let calls=0;
 const request=async()=>{calls++;return {id:'provider-one'};};
 const input={key:'reply-one',from:'support@example.com',to:['alice@example.com'],subject:'Re: Hi',text:'Reply',type:'reply',contactId:'contact',requireTracking:true,rateLimited:true};
 const results=await Promise.all([tracking().sendTracked(db,input,request),tracking().sendTracked(db,input,request)]);
 assert.equal(calls,1); assert.ok(results.some(r=>r.status==='accepted')); assert.equal(db.rows.size,2);
 assert.equal((await tracking().sendTracked(db,input,request)).emailId,'provider-one');
 await assert.rejects(tracking().sendTracked(db,{...input,text:'changed'},request),/already used/);
});
test('accepted provider send stays successful when telemetry update fails', async () => {
 assert.equal(typeof tracking().sendTracked,'function');
 const db=memoryDb();db.webhookEvent.update=async()=>{throw new Error('database down');};
 const result=await tracking().sendTracked(db,{key:'order-one',from:'support@example.com',to:['a@example.com'],subject:'Paid',text:'Paid',type:'payment_confirmed'},async()=>({id:'accepted'}));
 assert.equal(result.status,'accepted');
});
test('received metadata is reduced to plain text and safe threading fields', () => {
 assert.equal(typeof core().normalizeReceived,'function');
 const received = core().normalizeReceived({id:'abc',from:'Alice <alice@example.com>',to:['support@example.com'],subject:'Hi',created_at:'2026-10-10T00:00:00Z',text:null,html:'<style>x</style><p>Hello &amp; thanks</p><script>evil()</script><p>Second</p>',message_id:'<one@example.com>',headers:{references:'<old@example.com>',authorization:'secret'},raw:{download_url:'https://evil'},attachments:[{}]});
 assert.equal(received.text,'Hello & thanks\nSecond');
 assert.equal(received.messageId,'<one@example.com>');
 assert.equal(received.references,'<old@example.com>');
 assert.equal(received.sender,'alice@example.com');
 assert.equal('raw' in received,false); assert.equal('html' in received,false);
 assert.throws(()=>core().normalizeReceived({id:'abc',from:'bad\r\nBcc: evil@example.com',to:[],subject:'Hi'}));
});
test('provider transport uses fixed origin, bounded timeout, idempotency and safe failures', async () => {
 assert.equal(typeof core().resendRequest,'function');
 let request;
 const fetcher=async(url,init)=> {request={url,init};return new Response(JSON.stringify({id:'sent'}));};
 assert.deepEqual(await core().resendRequest('/emails',{method:'POST',body:{text:'hello'},idempotencyKey:'stable'}, {apiKey:'fake',fetcher}),{id:'sent'});
 assert.equal(request.url,'https://api.resend.com/emails');
 assert.equal(request.init.headers['Idempotency-Key'],'stable'); assert.ok(request.init.signal);
 await assert.rejects(core().resendRequest('/emails',{}, {apiKey:'fake',fetcher:async()=>new Response('SECRET',{status:401})}),/Resend request failed \(401\)/);
 await assert.rejects(core().resendRequest('https://evil',{}, {apiKey:'fake',fetcher}),/Invalid/);
});
test('signature authenticates exact bytes, rotation signatures, and rejects replay/tampering', () => {
 const secret = 'whsec_'+Buffer.from('test-secret').toString('base64');
 const raw = JSON.stringify({type:'email.received'}), timestamp='1700000000', id='msg_one';
 const signature=createHmac('sha256','test-secret').update(`${id}.${timestamp}.${raw}`).digest('base64');
 const h = new Headers({'svix-id':id,'svix-timestamp':timestamp,'svix-signature':`v1,invalid v1,${signature}`});
 assert.equal(typeof core().verifySignature,'function');
 assert.equal(core().verifySignature(raw,h,secret,1700000000000),true);
 assert.equal(core().verifySignature(raw+' ',h,secret,1700000000000),false);
 assert.equal(core().verifySignature(raw,h,secret,1700000400000),false);
 assert.equal(core().verifySignature(raw,h,'',1700000000000),false);
});
