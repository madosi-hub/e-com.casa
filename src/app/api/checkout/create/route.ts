// POST /api/checkout/create
// Creates (or updates, same checkout session) an internal order
// in PENDING_PAYMENT. Totals are repriced server-side; client
// totals are never trusted. The order is NOT paid at creation —
// it becomes PAID only after a verified gateway event.
// Response carries the order access token ONCE; the browser uses
// (orderNumber, accessToken) for every later payment call.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { rateLimit } from '@/lib/rate-limit';
import {
  repriceCart,
  sanitizeNotes,
  newOrderNumber,
  newAccessToken,
  CheckoutValidationError,
} from '@/lib/checkout';
import { resolvePaymentCurrency } from '@/lib/payments/payment-capabilities';
import { ORDER_NOTES_MAX } from '@/lib/constants';

export const dynamic = 'force-dynamic';

const orderItemSchema = z.object({
  slug: z.string().min(1),
  quantity: z.number().int().min(1).max(99),
  variantId: z.string().max(60).optional().nullable(),
});

const createCheckoutSchema = z.object({
  checkoutToken: z.string().min(8).max(80), // client checkout-session id
  email: z.string().email(),
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  address: z.string().min(1).max(200),
  address2: z.string().max(200).optional().nullable(),
  city: z.string().min(1).max(100),
  postalCode: z.string().min(1).max(20),
  country: z.string().min(2).max(2),
  phone: z.string().max(40).optional().nullable(),
  shippingMethod: z.enum(['standard', 'express']),
  promoCode: z.string().max(40).optional().nullable(),
  giftWrap: z.boolean().default(false),
  notes: z.string().max(ORDER_NOTES_MAX).optional().nullable(),
  marketingConsent: z.boolean().default(false),
  items: z.array(orderItemSchema).min(1),
});

export async function POST(req: NextRequest) {
  const limit = rateLimit(req, 'checkout-create', 12, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait a moment.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } },
    );
  }

  try {
    const body = await req.json();
    const parsed = createCheckoutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid checkout data', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }
    const data = parsed.data;

    // Server-side repricing — the only totals we trust
    let totals;
    try {
      totals = await repriceCart({
        items: data.items,
        country: data.country,
        shippingMethod: data.shippingMethod,
        promoCode: data.promoCode,
        giftWrap: data.giftWrap,
      });
    } catch (error) {
      if (error instanceof CheckoutValidationError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
      }
      throw error;
    }

    const currencyResolved = resolvePaymentCurrency(totals.currency);
    if (!currencyResolved.supported) {
      return NextResponse.json(
        { error: 'Online payment is not available for this currency yet.' },
        { status: 400 },
      );
    }

    // Idempotent per checkout session: same checkoutToken → update the
    // still-pending order instead of creating a new one.
    const existing = data.checkoutToken
      ? await db.order.findUnique({ where: { checkoutToken: data.checkoutToken } })
      : null;

    if (existing && !['PENDING_PAYMENT', 'PAYMENT_FAILED', 'CANCELLED'].includes(existing.paymentStatus)) {
      // Session already finished — force a fresh order.
      await db.order.update({
        where: { id: existing.id },
        data: { checkoutToken: null },
      });
    }

    const payload = {
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      address: data.address,
      address2: data.address2 || null,
      city: data.city,
      postalCode: data.postalCode,
      country: totals.country,
      phone: data.phone || null,
      shippingMethod: data.shippingMethod,
      subtotal: totals.subtotal.toFixed(2),
      shipping: totals.shipping.toFixed(2),
      tax: '0.00', // VAT-inclusive pricing — country/tax engine owns any future VAT breakdown
      discount: totals.discount.toFixed(2),
      total: totals.total.toFixed(2),
      promoCode: totals.promoCode,
      itemsJson: JSON.stringify(totals.lineItems),
      giftWrap: data.giftWrap,
      notes: sanitizeNotes(data.notes) || null,
      currency: totals.currency,
      pricingHash: totals.pricingHash,
    };

    let order = existing && ['PENDING_PAYMENT', 'PAYMENT_FAILED', 'CANCELLED'].includes(existing.paymentStatus)
      ? await db.order.update({
          where: { id: existing.id },
          data: {
            ...payload,
            paymentStatus: 'PENDING_PAYMENT',
            paymentFailureReason: null,
          },
        })
      : await db.order.create({
          data: {
            ...payload,
            orderNumber: newOrderNumber(),
            accessToken: newAccessToken(),
            checkoutToken: data.checkoutToken,
            status: 'PENDING',
            paymentStatus: 'PENDING_PAYMENT',
          },
        });

    // If a stale PaymentIntent exists with a different pricing hash it
    // will be cancelled by /api/payments/create-intent automatically.
    const payment = await db.payment.findUnique({ where: { orderId: order.id } });

    // Explicit marketing consent captured at checkout — consent is
    // never inferred from the order submission itself.
    if (data.marketingConsent) {
      await db.newsletterSubscriber.upsert({
        where: { email: data.email },
        update: {
          marketingConsent: true,
          consentAt: new Date(),
          source: 'checkout',
          country: totals.country,
        },
        create: {
          email: data.email,
          marketingConsent: true,
          source: 'checkout',
          country: totals.country,
        },
      }).catch(() => undefined); // consent must never block checkout
    }

    return NextResponse.json(
      {
        orderNumber: order.orderNumber,
        accessToken: order.accessToken,
        totals: {
          subtotal: order.subtotal,
          shipping: order.shipping,
          discount: order.discount,
          total: order.total,
          currency: order.currency,
        },
        pricingHash: order.pricingHash,
        intentExists: Boolean(payment && payment.paymentIntentId === order.paymentIntentId),
      },
      { status: existing ? 200 : 201 },
    );
  } catch (error) {
    console.error('POST /api/checkout/create error', error);
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
}
