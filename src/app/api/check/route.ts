import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const headers = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' };

function diagnosis(error: unknown) {
  const details = error as { name?: unknown; code?: unknown; errorCode?: unknown; message?: unknown };
  const name = typeof details?.name === 'string' ? details.name : 'UnknownError';
  const rawCode = typeof details?.code === 'string' ? details.code : details?.errorCode;
  const code = typeof rawCode === 'string' && /^[A-Z][A-Z0-9_]{1,30}$/.test(rawCode) ? rawCode : null;
  const message = typeof details?.message === 'string' ? details.message : '';

  let reason = 'unknown_database_error';
  if (/environment variable not found|database_url.*(?:missing|not found)/i.test(message)) reason = 'database_url_missing';
  else if (code === 'P1000' || /authentication failed|password authentication failed/i.test(message)) reason = 'database_authentication_failed';
  else if (code === 'P1001' || /can't reach database server|econnrefused|connection refused/i.test(message)) reason = 'database_unreachable';
  else if (code === 'P1002' || /timed? out|timeout/i.test(message)) reason = 'database_timeout';
  else if (code === 'P2021') reason = 'orders_table_missing';
  else if (code === 'P2022') reason = 'orders_column_missing';
  else if (/Prisma Client.*(?:not initialized|not generated)/i.test(message)) reason = 'prisma_client_not_generated';
  else if (name === 'PrismaClientInitializationError') reason = 'database_initialization_failed';

  // Never return the raw error message: it can contain a database URL or credentials.
  return { name, code, reason };
}

export async function GET(req: NextRequest) {
  const limit = rateLimit(req, 'database-check', 5, 60_000);
  if (!limit.ok) return NextResponse.json({ ok: false, reason: 'rate_limited' }, { status: 429, headers });

  const databaseUrlConfigured = Boolean(process.env.DATABASE_URL?.trim());
  if (!databaseUrlConfigured) {
    return NextResponse.json({ ok: false, stage: 'configuration', databaseUrlConfigured, reason: 'database_url_missing' }, { status: 503, headers });
  }

  let stage = 'connection';
  try {
    const { db } = await import('@/lib/db');
    await db.$queryRaw`SELECT 1`;
    stage = 'order_lookup';
    // Same read-only lookup used at the failing checkout stage; no order is created.
    await db.order.findUnique({ where: { checkoutToken: '__ecom_health_check__' } });
    return NextResponse.json({ ok: true, databaseUrlConfigured, connection: 'ok', orderLookup: 'ok' }, { headers });
  } catch (error) {
    const requestId = randomUUID();
    const result = diagnosis(error);
    console.error('[api/check]', { requestId, stage, ...result, message: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ ok: false, databaseUrlConfigured, stage, ...result, requestId }, { status: 503, headers });
  }
}
