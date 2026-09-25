import 'server-only';

import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { rateLimit } from '@/lib/rate-limit';

const COOKIE_NAME = 'ecom_utmify_session';
const SESSION_TTL_SECONDS = 12 * 60 * 60;
const DEFAULT_PASSWORD = 'c0r1nt4$';

type SessionPayload = { exp: number };

function configuredPassword(): string {
  return process.env.UTMIFY_PAGE_PASSWORD?.trim() || DEFAULT_PASSWORD;
}

function sessionSecret(): string {
  return process.env.UTMIFY_PAGE_SESSION_SECRET?.trim()
    || process.env.ADMIN_SESSION_SECRET?.trim()
    || configuredPassword();
}

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function sign(value: string): string {
  return createHmac('sha256', sessionSecret()).update(value).digest('base64url');
}

function encodeSession(payload: SessionPayload): string {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${body}.${sign(body)}`;
}

function decodeSession(value: string | undefined): SessionPayload | null {
  if (!value) return null;
  const [body, signature] = value.split('.');
  if (!body || !signature || !safeEqual(signature, sign(body))) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as SessionPayload;
    return payload.exp > Math.floor(Date.now() / 1000) ? payload : null;
  } catch {
    return null;
  }
}

export async function verifyUtmifyPassword(password: string): Promise<boolean> {
  const requestHeaders = await headers();
  const request = new Request('https://e-com.casa/utmify', { headers: requestHeaders });
  const limited = rateLimit(request, 'utmify-login', 8, 15 * 60_000);
  return limited.ok && safeEqual(password, configuredPassword());
}

export async function createUtmifySession(): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, encodeSession({ exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS }), {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_TTL_SECONDS,
    path: '/utmify',
  });
}

export async function clearUtmifySession(): Promise<void> {
  (await cookies()).set(COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 0,
    path: '/utmify',
  });
}

export async function getUtmifySession(): Promise<SessionPayload | null> {
  return decodeSession((await cookies()).get(COOKIE_NAME)?.value);
}

export async function requireUtmifySession(): Promise<SessionPayload> {
  const session = await getUtmifySession();
  if (!session) redirect('/utmify?login=required');
  return session;
}
