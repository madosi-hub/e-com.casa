// Vercel Cron — background XPayments reconciliation
// Covers delayed/asynchronous methods when the shopper closes the
// browser and no merchant webhook is configured. This job NEVER
// creates/captures a payment; it only retrieves already-created
// PaymentIntents and applies verified provider state idempotently.

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { refreshOrderPayment } from '@/lib/payments/reconcile-payment';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function authorised(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  return req.headers.get('authorization') === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!authorised(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const orders = await db.order.findMany({
    where: {
      paymentStatus: { in: ['PENDING_PAYMENT', 'PAYMENT_PROCESSING'] },
      createdAt: { gte: since },
      paymentIntentId: { not: null },
    },
    orderBy: { createdAt: 'asc' },
    take: 60,
    select: { id: true, orderNumber: true, paymentStatus: true },
  });

  let checked = 0;
  let changed = 0;
  let unavailable = 0;
  const failures: string[] = [];

  // Small batches avoid unnecessary pressure on XPayments and the DB.
  for (let offset = 0; offset < orders.length; offset += 5) {
    const batch = orders.slice(offset, offset + 5);
    const results = await Promise.allSettled(batch.map(async (order) => ({
      order,
      result: await refreshOrderPayment(order.id),
    })));

    for (const settled of results) {
      if (settled.status === 'rejected') {
        unavailable += 1;
        continue;
      }
      const { order, result } = settled.value;
      if (result.checked) checked += 1;
      else unavailable += 1;
      if (result.changed) changed += 1;
      if (result.reason === 'amount_currency_mismatch' || result.reason === 'intent_mismatch') {
        failures.push(`${order.orderNumber}:${result.reason}`);
      }
    }
  }

  return NextResponse.json({
    ok: true,
    scanned: orders.length,
    checked,
    changed,
    unavailable,
    failures: failures.slice(0, 10),
    at: new Date().toISOString(),
  });
}
