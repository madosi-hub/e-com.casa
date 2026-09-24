// POST /api/checkout/create
// Creates (or updates, same checkout session) an internal order
// in PENDING_PAYMENT. Totals are repriced server-side; client
// totals are never trusted. The order is NOT paid at creation —
// it becomes PAID only after a verified gateway event.
// Response carries the order access token ONCE; the browser uses
// (orderNumber, accessToken) for every later payment call.

import { after, NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { db } from '@/lib/db';
import { rateLimit } from '@/lib/rate-limit';
import {
  repriceCart,
  hasCheckoutContact,
  sanitizeNotes,
  newOrderNumber,
  newAccessToken,
  CheckoutValidationError,
} from '@/lib/checkout';
import { resolvePaymentCurrency } from '@/lib/payments/payment-capabilities';
import { ORDER_NOTES_MAX } from '@/lib/constants';
import { sendUtmifyOrder } from '@/lib/utmify';

export const dynamic = 'force-dynamic';



const orderItemSchema = z.object({
  slug: z.string().min(1),
  quantity: z.number().int().min(1).max(99),
  variantId: z.string().max(60).optional().nullable(),
});

const createCheckoutSchema = z.object({
  checkoutToken: z.string().min(8).max(80), // client checkout-session id
  draft: z.boolean().default(false),
  email: z.union([z.string().trim().email(), z.literal('')]).default(''),
  firstName: z.string().trim().max(80).default(''),
  lastName: z.string().trim().max(80).default(''),
  address: z.string().trim().max(200).default(''),
  address2: z.string().max(200).optional().nullable(),
  city: z.string().trim().max(100).default(''),
  postalCode: z.string().trim().max(20).default(''),
  country: z.string().min(2).max(2),
  phone: z.string().max(40).optional().nullable(),
  shippingMethod: z.enum(['standard', 'express']),
  promoCode: z.string().max(40).optional().nullable(),
  giftWrap: z.boolean().default(false),
  notes: z.string().max(ORDER_NOTES_MAX).optional().nullable(),
  marketingConsent: z.boolean().default(false),
  items: z.array(orderItemSchema).min(1),
  trackingParameters: z.object({
    src: z.string().max(500).nullable().optional(),
    sck: z.string().max(500).nullable().optional(),
    utm_source: z.string().max(200).nullable().optional(),
    utm_medium: z.string().max(200).nullable().optional(),
    utm_campaign: z.string().max(200).nullable().optional(),
    utm_content: z.string().max(200).nullable().optional(),
    utm_term: z.string().max(200).nullable().optional(),
  }).nullable().optional(),
}).superRefine((data, ctx) => {
  if (!data.draft && !hasCheckoutContact(data)) {
    ctx.addIssue({ code: 'custom', path: ['email'], message: 'Complete contact and delivery details before payment confirmation' });
  }
});

export async function POST(req: NextRequest) {
  let stage = 'request';
  const limit = rateLimit(req, 'checkout-create', 12, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait a moment.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } },
    );
  }

  try {
    stage = 'parse_body';
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
    stage = 'reprice_cart';
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
    stage = 'load_order';
    const existing = data.checkoutToken
      ? await db.order.findUnique({ where: { checkoutToken: data.checkoutToken } })
      : null;

    if (existing && (existing.paidAt || !['PENDING_PAYMENT', 'PAYMENT_FAILED', 'CANCELLED'].includes(existing.paymentStatus))) {
      return NextResponse.json({ error: 'Este checkout já foi submetido. Consulte o estado do pagamento.' }, { status: 409 });
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

    stage = 'persist_order';
    let order;
    if (existing) {
      // Do not overwrite a payment confirmed concurrently by a webhook/poll.
      const updated = await db.order.updateMany({
        where: { id: existing.id, paidAt: null, paymentStatus: { in: ['PENDING_PAYMENT', 'PAYMENT_FAILED', 'CANCELLED'] } },
        data: { ...payload, status: 'CHECKOUT_DRAFT', paymentStatus: 'PENDING_PAYMENT', paymentFailureReason: null },
      });
      if (updated.count !== 1) return NextResponse.json({ error: 'O estado do pagamento mudou. Consulte o checkout.' }, { status: 409 });
      order = await db.order.findUniqueOrThrow({ where: { id: existing.id } });
    } else {
      order = await db.order.create({ data: {
        ...payload, orderNumber: newOrderNumber(), accessToken: newAccessToken(),
        checkoutToken: data.checkoutToken, status: 'CHECKOUT_DRAFT', paymentStatus: 'PENDING_PAYMENT',
      } });
    }

    stage = 'load_payment';
    // If a stale PaymentIntent exists with a different pricing hash it
    // will be cancelled by /api/payments/create-intent automatically.
    const payment = await db.payment.findUnique({ where: { orderId: order.id } });

    stage = 'consent';
    // Explicit marketing consent captured at checkout — consent is
    // never inferred from the order submission itself.
    if (data.marketingConsent && data.email) {
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

    stage = 'tracking';
    // A completed contact form is a lead, not a captured order.
    if (!data.draft && data.email) {
      after(() => sendUtmifyOrder(order, 'waiting_payment', data.trackingParameters));
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
    const requestId = randomUUID();
    const details = error as { code?: string; errorCode?: string; name?: string; message?: string; meta?: unknown };
    const code = details.code ?? details.errorCode ?? 'UNKNOWN_ERROR';
    const message = details.message ?? (error instanceof Error ? error.message : String(error));
    const name = details.name ?? (error instanceof Error ? error.name : 'UnknownError');
    console.error('[checkout/create]', {
      requestId,
      stage,
      code,
      name,
      message,
      meta: details.meta,
    });

    const publicError = code === 'P2021' || code === 'P2022'
      ? 'A base de dados de produção precisa de uma atualização. Contacte o suporte com a referência apresentada.'
      : 'Não foi possível preparar o checkout. Contacte o suporte com a referência apresentada.';

    return NextResponse.json(
      { error: publicError, errorCode: code, stage, requestId },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
