// GET /api/orders?order=EC-…&token=…
// Secure single-order lookup. The historical email-only listing
// endpoint was removed: arbitrary order histories can never be
// enumerated. Access requires the order number plus the random
// access token issued once at checkout.

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { rateLimit } from '@/lib/rate-limit';
import { tokenMatches } from '@/lib/checkout';
import { ensureTracking } from '@/lib/tracking';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const limit = rateLimit(req, 'order-lookup', 30, 60_000);
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
      return NextResponse.json(
        { error: 'Order number and access token are required.' },
        { status: 400 },
      );
    }

    const order = await db.order.findUnique({ where: { orderNumber } });
    if (!order || !tokenMatches(order.accessToken, token)) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Keep the tracking lifecycle moving on every authenticated read
    // (idempotent — also backfills legacy paid orders that pre-date
    // the tracking engine).
    const tracked = await ensureTracking(order);
    const o = tracked.order;

    const invoice = await db.invoice.findUnique({ where: { orderId: o.id } });

    return NextResponse.json({
      order: {
        orderNumber: o.orderNumber,
        email: o.email,
        firstName: o.firstName,
        lastName: o.lastName,
        address: o.address,
        address2: o.address2,
        city: o.city,
        postalCode: o.postalCode,
        country: o.country,
        shippingMethod: o.shippingMethod,
        subtotal: o.subtotal,
        shipping: o.shipping,
        tax: o.tax,
        discount: o.discount,
        total: o.total,
        promoCode: o.promoCode,
        itemsJson: o.itemsJson,
        giftWrap: o.giftWrap,
        notes: o.notes,
        status: o.status,
        paymentStatus: o.paymentStatus,
        paymentMethodType: o.paymentMethodType,
        currency: o.currency,
        paidAt: o.paidAt,
        createdAt: o.createdAt,
        trackingNumber: o.trackingNumber,
        carrier: o.carrier,
        originWarehouse: o.originWarehouse,
        estimatedDeliveryAt: o.estimatedDeliveryAt,
      },
      invoice: invoice
        ? { invoiceNumber: invoice.invoiceNumber, status: invoice.status, issuedAt: invoice.issuedAt }
        : null,
    });
  } catch (error) {
    console.error('GET /api/orders error', error);
    return NextResponse.json({ error: 'Failed to load order' }, { status: 500 });
  }
}

/** Order creation moved to /api/checkout/create — the mock paid-order
 *  endpoint is gone for good. */
export async function POST() {
  return NextResponse.json(
    {
      error: 'Order creation moved to /api/checkout/create. Orders are never marked paid at creation.',
    },
    { status: 410 },
  );
}
