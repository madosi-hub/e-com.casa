import 'server-only';

import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { rateLimit } from '@/lib/rate-limit';

const COOKIE_NAME = 'ecom_admin_session';
const SESSION_TTL_SECONDS = 12 * 60 * 60;

type SessionPayload = {
  exp: number;
  operator: string;
};

function configuredPassword(): string {
  const password = process.env.ADMIN_PASSWORD?.trim();
  if (!password) throw new Error('ADMIN_PASSWORD is not configured');
  return password;
}

function sessionSecret(): string {
  return process.env.ADMIN_SESSION_SECRET?.trim() || configuredPassword();
}

function operatorName(): string {
  return process.env.ADMIN_OPERATOR?.trim() || 'commerce-team';
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
    if (!payload.exp || payload.exp <= Math.floor(Date.now() / 1000)) return null;
    if (!payload.operator) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function verifyAdminPassword(password: string): Promise<boolean> {
  const requestHeaders = await headers();
  const limiterRequest = new Request('https://admin.e-com.casa/login', { headers: requestHeaders });
  const limited = rateLimit(limiterRequest, 'admin-login', 8, 15 * 60_000);
  if (!limited.ok) return false;
  return safeEqual(password, configuredPassword());
}

export async function createAdminSession(): Promise<void> {
  const store = await cookies();
  const payload: SessionPayload = {
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
    operator: operatorName(),
  };

  store.set(COOKIE_NAME, encodeSession(payload), {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_TTL_SECONDS,
    path: '/admin',
  });
}

export async function clearAdminSession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function getAdminSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  return decodeSession(store.get(COOKIE_NAME)?.value);
}

export async function requireAdmin(): Promise<SessionPayload> {
  const session = await getAdminSession();
  if (!session) redirect('/admin/login');
  return session;
}
