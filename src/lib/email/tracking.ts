import 'server-only';
import { createHash } from 'node:crypto';
import type { PrismaClient } from '@prisma/client';
import type { EmailSummary } from './operations-types';
import { resendRequest, identifier } from './resend';
import { z } from 'zod';

export const EMAIL_PROVIDER = 'resend';
export type SendInput = { key: string; from: string; to: string[]; subject: string; text: string; html?: string; headers?: Record<string,string>; reply_to?: string[]; tags?: Array<{name:string;value:string}>; type: string; contactId?: string; orderNumber?: string; requireTracking?: boolean; rateLimited?: boolean };
export type StoredEmail = EmailSummary & { fingerprint?: string; messageId?: string; references?: string };
export const digest = (value: string) => createHash('sha256').update(value).digest('hex');
export async function sendTracked(db: PrismaClient, input: SendInput, request = resendRequest): Promise<StoredEmail> {
  const id = `resend:send:${digest(input.key)}`;
  const {key: _key, requireTracking: _required, rateLimited: _limited, ...content} = input;
  const fingerprint = digest(JSON.stringify(content));
  const email: StoredEmail = { id, direction:'outbound', from:input.from, to:input.to, subject:input.subject, text:input.text, createdAt:new Date().toISOString(), status:'reserved', type:input.type, ...(input.contactId ? {contactId:input.contactId}:{}), ...(input.orderNumber ? {orderNumber:input.orderNumber}:{}), fingerprint };
  let reserved = false;
  let previous: StoredEmail | undefined;
  try {
    await db.$transaction(async tx => {
      // Shared cross-process lock protects duplicate reservations and the global send budget.
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext('resend-admin-send'))::text`;
      const existing = await tx.webhookEvent.findUnique({where:{id}});
      if (existing) { previous = JSON.parse(existing.payloadJson) as StoredEmail; return; }
      if (input.rateLimited) {
        const bucketId = `resend:rate:${Math.floor(Date.now()/60_000)}`;
        const bucket = await tx.webhookEvent.findUnique({where:{id:bucketId}});
        const count = bucket ? Number(JSON.parse(bucket.payloadJson).count) : 0;
        if (count >= 10) throw new Error('Send limit reached; wait one minute');
        if (bucket) await tx.webhookEvent.update({where:{id:bucketId},data:{payloadJson:JSON.stringify({count:count+1})}});
        else await tx.webhookEvent.create({data:{id:bucketId,provider:EMAIL_PROVIDER,type:'rate',payloadJson:JSON.stringify({count:1})}});
      }
      await tx.webhookEvent.create({data:{id,provider:EMAIL_PROVIDER,type:'send',payloadJson:JSON.stringify(email)}});
      reserved = true;
    });
  } catch (error) {
    if (input.requireTracking || error instanceof Error && error.message.startsWith('Send limit')) throw error;
    // Never send without a durable reservation: an outage must not cause a later duplicate.
    // Transactional callers receive false and can still complete payment independently.
    return {...email,status:'failed_or_uncertain',error:'Email storage unavailable; no provider request was made.'};
  }
  if (previous) {
    if (previous.fingerprint !== fingerprint) throw new Error('Request ID already used with different content');
    return previous;
  }
  const body = { from:input.from, to:input.to, subject:input.subject, text:input.text, ...(input.html ? {html:input.html}:{}), ...(input.headers ? {headers:input.headers}:{}), ...(input.reply_to ? {reply_to:input.reply_to}:{}), tags:[...(input.tags || []).filter(tag=>tag.name !== 'ecom_send'),{name:'ecom_send',value:digest(input.key)}] };
  try {
    const result = z.object({id:identifier}).parse(await request('/emails',{method:'POST',body,idempotencyKey:`ecom-${digest(input.key)}`}));
    email.emailId = result.id; email.status = 'accepted';
  } catch (error) {
    const safeFailure = error instanceof Error && /^Resend request failed \(\d{3}\)$/.test(error.message);
    email.status = safeFailure && /^Resend request failed \(4\d{2}\)$/.test(error.message) ? 'failed' : 'failed_or_uncertain';
    email.error = safeFailure ? error.message : 'Provider unavailable; delivery unconfirmed. Do not retry with a new request ID.';
  }
  if (reserved) {
    try { await db.webhookEvent.update({where:{id},data:{payloadJson:JSON.stringify(email),processedAt:new Date()}}); }
    catch { console.warn('Resend tracking update unavailable; reservation retained'); }
  }
  return email;
}
