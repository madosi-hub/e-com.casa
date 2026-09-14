// GET /api/tracking?code=ECC-YYMM-XXXXXX
// Public tracking endpoint for buyers. Lookup is ONLY by the
// generated tracking number — a high-entropy code handed to the
// customer at dispatch (success page, order history, dispatch
// email). Order numbers are never accepted here: that surface
// stays protected by the per-order access token.
// The response is deliberately privacy-minimal: no email, no
// name, no street address — city + country at most, plus the
// items summary and the fulfilment timeline.

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { rateLimit } from '@/lib/rate-limit';
import {
  ensureTracking,
  ensureCancelledEvent,
  normaliseTrackingCode,
  warehouseView,
  countryName,
} from '@/lib/tracking';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const limit = rateLimit(req, 'tracking-lookup', 15, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } },
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const code = normaliseTrackingCode(searchParams.get('code') ?? '');
    if (!code) {
      return NextResponse.json({ error: 'Tracking number is required.' }, { status: 400 });
    }

    const order = await db.order.findUnique({ where: { trackingNumber: code } });

    // Uniform "not found" — never reveal whether an order number exists.
    if (!order) {
      return NextResponse.json({ found: false }, { status: 404 });
    }

    // Cancelled fulfilment — make sure the event history reflects it.
    if (order.status === 'CANCELLED') {
      await ensureCancelledEvent(order.id);
    }

    const result = await ensureTracking(order);
    const o = result.order;

    // Waiting for payment — no tracking lifecycle to show yet.
    if (o.paymentStatus !== 'PAID') {
      return NextResponse.json({
        found: true,
        awaitingPayment: true,
        order: {
          orderNumber: o.orderNumber,
          paymentStatus: o.paymentStatus,
          shippingMethod: o.shippingMethod,
          destination: { city: o.city, country: countryName(o.country) },
        },
        timeline: [],
      });
    }

    let items: { name: string; image: string; quantity: number; variantLabel?: string | null }[] = [];
    try {
      const parsed = JSON.parse(o.itemsJson) as { name: string; image: string; quantity: number; variantLabel?: string | null }[];
      items = parsed.map((i) => ({ name: i.name, image: i.image, quantity: i.quantity, variantLabel: i.variantLabel ?? null }));
    } catch {
      items = [];
    }

    let timeline: {
      status: string;
      description: string;
      location: string | null;
      occurredAt: string;
      occurred: boolean;
    }[];

    if (o.status === 'CANCELLED') {
      // Cancelled fulfilment → the persisted event history is the
      // source of truth (CONFIRMED/PROCESSING… up to CANCELLED).
      const events = await db.trackingEvent.findMany({
        where: { orderId: o.id },
        orderBy: { occurredAt: 'asc' },
      });
      timeline = events.map((ev) => ({
        status: ev.status,
        description: ev.description,
        location: ev.location,
        occurredAt: ev.occurredAt.toISOString(),
        occurred: true,
      }));
    } else {
      timeline = result.timeline.map((ev) => ({
        status: ev.status as string,
        description: ev.description,
        location: ev.location,
        occurredAt: ev.occurredAt.toISOString(),
        occurred: ev.occurredAt.getTime() <= Date.now(),
      }));
    }

    return NextResponse.json({
      found: true,
      awaitingPayment: false,
      order: {
        orderNumber: o.orderNumber,
        trackingNumber: o.trackingNumber,
        carrier: o.carrier,
        status: o.status,
        paymentStatus: o.paymentStatus,
        shippingMethod: o.shippingMethod,
        placedAt: o.createdAt.toISOString(),
        estimatedDeliveryAt: o.estimatedDeliveryAt ? o.estimatedDeliveryAt.toISOString() : null,
        destination: { city: o.city, country: countryName(o.country) },
        originWarehouse: warehouseView(o.originWarehouse),
        items,
      },
      timeline,
    });
  } catch (error) {
    console.error('GET /api/tracking error', error);
    return NextResponse.json({ error: 'Failed to load tracking information' }, { status: 500 });
  }
}
