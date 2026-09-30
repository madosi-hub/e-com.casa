// Vercel Cron — materialise due fulfilment events and send buyer updates.
// TrackingEvent's (orderId, status) unique key provides the existing
// idempotency boundary without introducing a new database table.

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ensureTracking } from '@/lib/tracking';
import { redeliverPaymentPaidEvent, refreshOrderPayment } from '@/lib/payments/reconcile-payment';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function authorised(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  return req.headers.get('authorization') === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!authorised(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Vercel Hobby permits one daily cron. Use the same run to reconcile
  // abandoned-browser payments and to replay paid-event delivery. Re-reading
  // a verified SUCCEEDED intent is safe: payment state is monotonic and the
  // Umami bridge deduplicates payment_paid:<orderNumber>.
  const paymentSince = new Date(Date.now() - 7 * 24 * 60 * 60_000);
  const paymentOrders = await db.order.findMany({
    where: {
      paymentIntentId: { not: null },
      OR: [
        { paymentStatus: { in: ['PENDING_PAYMENT', 'PAYMENT_PROCESSING'] }, createdAt: { gte: paymentSince } },
        { paymentStatus: 'PAID', paidAt: { gte: paymentSince } },
      ],
    },
    orderBy: { updatedAt: 'asc' },
    take: 80,
    select: { id: true, orderNumber: true, paymentStatus: true },
  });

  let paymentsChecked = 0;
  let paymentsChanged = 0;
  const paymentFailures: string[] = [];
  for (let offset = 0; offset < paymentOrders.length; offset += 5) {
    const batch = paymentOrders.slice(offset, offset + 5);
    const results = await Promise.allSettled(batch.map(async (order) => {
      if (order.paymentStatus === 'PAID') {
        const delivery = await redeliverPaymentPaidEvent(order.id, { attempts: 1, timeoutMs: 4_000 });
        return { order, checked: true, changed: false, failed: !delivery.ok };
      }
      const result = await refreshOrderPayment(order.id, {
        paymentEventDelivery: { attempts: 1, timeoutMs: 4_000 },
      });
      return {
        order,
        checked: result.checked,
        changed: result.changed,
        failed: !result.checked || result.reason === 'payment_event_delivery_failed',
      };
    }));
    for (const [index, settled] of results.entries()) {
      paymentsChecked += 1;
      if (settled.status === 'rejected') {
        paymentFailures.push(batch[index]?.orderNumber ?? 'unknown');
        continue;
      }
      if (settled.value.failed) {
        paymentFailures.push(settled.value.order.orderNumber);
      }
      if (settled.value.changed) paymentsChanged += 1;
    }
  }

  const orders = await db.order.findMany({
    where: {
      paymentStatus: 'PAID',
      paidAt: { not: null },
      status: { notIn: ['DELIVERED', 'CANCELLED'] },
    },
    orderBy: { paidAt: 'asc' },
    take: 100,
  });

  let checked = 0;
  let changed = 0;
  const failures: string[] = [];

  for (let offset = 0; offset < orders.length; offset += 5) {
    const batch = orders.slice(offset, offset + 5);
    const results = await Promise.allSettled(batch.map(async (order) => {
      const before = order.status;
      const result = await ensureTracking(order);
      return { orderNumber: order.orderNumber, before, after: result.order.status };
    }));

    for (const result of results) {
      checked += 1;
      if (result.status === 'rejected') {
        failures.push(`batch-item-${offset + failures.length + 1}`);
        continue;
      }
      if (result.value.before !== result.value.after) changed += 1;
    }
  }

  return NextResponse.json({
    ok: failures.length === 0 && paymentFailures.length === 0,
    payments: {
      scanned: paymentOrders.length,
      checked: paymentsChecked,
      changed: paymentsChanged,
      failed: paymentFailures.length,
    },
    scanned: orders.length,
    checked,
    changed,
    failed: failures.length,
    at: new Date().toISOString(),
  });
}
