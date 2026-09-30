// Vercel Cron — materialise due fulfilment events and send buyer updates.
// TrackingEvent's (orderId, status) unique key provides the existing
// idempotency boundary without introducing a new database table.

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ensureTracking } from '@/lib/tracking';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function authorised(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  return req.headers.get('authorization') === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!authorised(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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
    ok: failures.length === 0,
    scanned: orders.length,
    checked,
    changed,
    failed: failures.length,
    at: new Date().toISOString(),
  });
}
