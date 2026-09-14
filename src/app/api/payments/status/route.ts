// GET /api/payments/status?order=…&token=…
// Server-authoritative payment status for one order. Email-only
// lookups are NOT allowed; the random access token issued at
// checkout is required. Pending states are reconciled server-to-
// server against XPayments, so a merchant webhook is optional.

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { rateLimit, clientIp } from '@/lib/rate-limit';
import { tokenMatches } from '@/lib/checkout';
import { refreshOrderPayment } from '@/lib/payments/reconcile-payment';

export const dynamic = 'force-dynamic';

const terminal = new Set(['PAID', 'PAYMENT_FAILED', 'CANCELLED', 'REFUNDED', 'PARTIALLY_REFUNDED']);

export async function GET(req: NextRequest) {
  const limit = rateLimit(req, 'payment-status', 60, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } },
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const orderNumber = searchParams.get('order') ?? '';
    const token = searchParams.get('token') ?? '';
    if (!orderNumber || !token) {
      return NextResponse.json({ error: 'Order and token are required' }, { status: 400 });
    }

    let order = await db.order.findUnique({
      where: { orderNumber },
      select: {
        id: true,
        orderNumber: true,
        accessToken: true,
        paymentStatus: true,
        paymentMethodType: true,
        status: true,
        total: true,
        currency: true,
        paidAt: true,
        createdAt: true,
        paymentFailureReason: true,
      },
    });
    if (!order || !tokenMatches(order.accessToken, token)) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Without a merchant webhook, this authenticated browser poll becomes
    // the reconciliation trigger. XPayments is queried only after the
    // order access token has been validated, preventing arbitrary gateway
    // lookups from the public endpoint.
    if (!terminal.has(order.paymentStatus)) {
      await refreshOrderPayment(order.id);
      order = await db.order.findUnique({
        where: { id: order.id },
        select: {
          id: true,
          orderNumber: true,
          accessToken: true,
          paymentStatus: true,
          paymentMethodType: true,
          status: true,
          total: true,
          currency: true,
          paidAt: true,
          createdAt: true,
          paymentFailureReason: true,
        },
      });
      if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json({
      orderNumber: order.orderNumber,
      paymentStatus: order.paymentStatus,
      orderStatus: order.status,
      paymentMethodType: order.paymentMethodType,
      total: order.total,
      currency: order.currency,
      paidAt: order.paidAt,
      createdAt: order.createdAt,
    });
  } catch (error) {
    console.error(`GET /api/payments/status error (${clientIp(req)})`, error);
    return NextResponse.json({ error: 'Failed to load payment status' }, { status: 500 });
  }
}
