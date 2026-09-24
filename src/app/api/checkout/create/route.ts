import { NextRequest, NextResponse } from 'next/server';
import { createHash, randomUUID } from 'node:crypto';
import { z } from 'zod';
import { db } from '@/lib/db';
import { rateLimit } from '@/lib/rate-limit';
import {
  repriceCart,
  sanitizeNotes,
  newAccessToken,
  CheckoutValidationError,
} from '@/lib/checkout';
import { resolvePaymentCurrency } from '@/lib/payments/payment-capabilities';
import { ORDER_NOTES_MAX } from '@/lib/constants';
import { withCheckoutLock } from '@/lib/payments/checkout-session';
import { toMinorUnit } from '@/lib/payments/amounts';

export const dynamic = 'force-dynamic';


const orderItemSchema = z.object({
  slug: z.string().min(1),
  quantity: z.number().int().min(1).max(99),
  variantId: z.string().max(60).optional().nullable(),
});

const createCheckoutSchema = z.object({
  checkoutToken: z.string().min(8).max(80), // client checkout-session id
  email: z.union([z.string().email(), z.literal('')]).default(''),
  firstName: z.string().max(80).default(''),
  lastName: z.string().max(80).default(''),
  address: z.string().max(200).default(''),
  address2: z.string().max(200).optional().nullable(),
  city: z.string().max(100).default(''),
  postalCode: z.string().max(20).default(''),
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

    stage = 'persist_session';
    const sessionKey = createHash('sha256').update(`${data.checkoutToken}:${totals.pricingHash}:${totals.country}:${data.shippingMethod}`).digest('hex');
    const session = await withCheckoutLock(sessionKey, async (tx) => {
      const existing = await tx.checkoutSession.findUnique({ where: { sessionKey } });
      if (existing) {
        // Once submitted, preserve the exact customer and pricing snapshot.
        if (existing.readyAt || existing.orderId) return existing;
        return tx.checkoutSession.update({ where: { id: existing.id }, data: {
          snapshotJson: JSON.stringify(payload),
          trackingJson: data.trackingParameters ? JSON.stringify(data.trackingParameters) : existing.trackingJson,
        } });
      }
      return tx.checkoutSession.create({ data: {
        reference: `CS-${randomUUID()}`, sessionKey, accessToken: newAccessToken(),
        snapshotJson: JSON.stringify(payload),
        trackingJson: data.trackingParameters ? JSON.stringify(data.trackingParameters) : null,
        amountMinor: toMinorUnit(payload.total, payload.currency), currency: payload.currency, country: payload.country,
      } });
    });

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

    return NextResponse.json({
      // Compatibility name for existing clients; this is a checkout reference, not an order.
      orderNumber: session.reference,
      accessToken: session.accessToken,
      totals: { subtotal: payload.subtotal, shipping: payload.shipping, discount: payload.discount, total: payload.total, currency: payload.currency },
      pricingHash: payload.pricingHash,
      intentExists: Boolean(session.paymentIntentId),
    }, { headers: { 'Cache-Control': 'no-store' } });
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
