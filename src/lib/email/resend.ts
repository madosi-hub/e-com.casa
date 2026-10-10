import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';

export const identifier = z.string().regex(/^[A-Za-z0-9_-]{1,160}$/);
const line = z.string().max(1000).refine(value => !/[\r\n\x00]/.test(value), 'Invalid header');
export function mailbox(value: string): string {
  line.parse(value);
  const match = value.match(/<([^<>]+)>$/);
  return z.email().parse((match?.[1] || value).trim()).toLowerCase();
}
export function plainText(html: string): string {
  const entities: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
  return html.slice(0, 500_000).replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '').replace(/<(?:br\s*\/?|\/p|\/div|\/li|\/tr|\/h[1-6])\s*>/gi, '\n').replace(/<[^>]*>/g, '').replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (all, entity: string) => {
    if (!entity.startsWith('#')) return entities[entity.toLowerCase()] || all;
    const number = entity[1].toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
    return number > 0 && number <= 0x10ffff ? String.fromCodePoint(number) : '';
  }).replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n').trim().slice(0, 100_000);
}
export function threading(messageId: unknown, references: unknown): { messageId?: string; references?: string } {
  const valid = (value: unknown): value is string => typeof value === 'string' && /^<[^<>\s\r\n]{1,250}>$/.test(value);
  const ids = typeof references === 'string' ? references.split(/\s+/).filter(valid).slice(-20) : [];
  return { ...(valid(messageId) ? { messageId } : {}), ...(ids.length ? { references: ids.join(' ') } : {}) };
}
const receivedSchema = z.object({ id: identifier, from: line, to: z.array(line).max(100), subject: line, created_at: z.string().refine(value => Number.isFinite(Date.parse(value))), text: z.string().nullable().optional(), html: z.string().nullable().optional(), message_id: z.string().optional(), headers: z.record(z.string(), z.unknown()).nullable().optional() });
export function normalizeReceived(input: unknown) {
  const data = receivedSchema.parse(input);
  const headers = Object.fromEntries(Object.entries(data.headers || {}).map(([key,value]) => [key.toLowerCase(),value]));
  return { emailId: data.id, sender: mailbox(data.from), from: data.from, to: data.to, subject: data.subject, text: data.text?.trim() ? data.text.slice(0,100_000) : plainText(data.html || ''), createdAt: new Date(data.created_at).toISOString(), ...threading(data.message_id || headers['message-id'], headers.references) };
}
export async function resendRequest(path: string, options: { method?: string; body?: unknown; idempotencyKey?: string } = {}, dependencies: { apiKey?: string; fetcher?: typeof fetch } = {}): Promise<unknown> {
  if (!/^\/emails(?:\/receiving)?(?:\/[A-Za-z0-9_-]+)?(?:\?[A-Za-z0-9_=&%-]+)?$/.test(path)) throw new Error('Invalid Resend path');
  const apiKey = dependencies.apiKey ?? process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('Email integration is not configured');
  let response: Response;
  try {
    response = await (dependencies.fetcher || fetch)(`https://api.resend.com${path}`, { method: options.method || 'GET', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', ...(options.idempotencyKey ? { 'Idempotency-Key': options.idempotencyKey } : {}) }, ...(options.body ? { body: JSON.stringify(options.body) } : {}), signal: AbortSignal.timeout(10_000), redirect: 'error', cache: 'no-store' });
  } catch { throw new Error('Resend request unavailable; delivery may be uncertain'); }
  if (!response.ok) throw new Error(`Resend request failed (${response.status})`);
  try { return await response.json(); } catch { throw new Error('Invalid Resend response'); }
}

export function verifySignature(raw: string, headers: Headers, secret: string, now = Date.now()): boolean {
  const id = headers.get('svix-id'), timestamp = headers.get('svix-timestamp'), signatures = headers.get('svix-signature');
  if (!id || id.length > 200 || !timestamp || !/^\d{10,}$/.test(timestamp) || !signatures || !/^whsec_[A-Za-z0-9+/]+={0,2}$/.test(secret)) return false;
  if (Math.abs(now / 1000 - Number(timestamp)) > 300) return false;
  const key = Buffer.from(secret.slice(6), 'base64');
  if (!key.length) return false;
  const expected = createHmac('sha256', key).update(`${id}.${timestamp}.${raw}`).digest();
  return signatures.split(/\s+/).some(value => {
    if (!/^v1,[A-Za-z0-9+/]+={0,2}$/.test(value)) return false;
    const actual = Buffer.from(value.slice(3), 'base64');
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  });
}
