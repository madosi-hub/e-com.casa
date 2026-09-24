// POST /api/payments/create-intent
// Creates/reuses a server-priced XPayments PaymentIntent. The browser
// receives only the publishable key and client secret.

import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { db } from '@/lib/db';
import { rateLimit } from '@/lib/rate-limit';
import { tokenMatches } from '@/lib/checkout';
import { getPaymentProvider } from '@/lib/payments/xpayments-provider';
import { getPaymentConfig, isPaymentConfigured } from '@/lib/payments/payments-config';
import { resolvePaymentCapabilities } from '@/lib/payments/payment-capabilities';
import { toMinorUnit } from '@/lib/payments/amounts';
import { PaymentError } from '@/lib/payments/payment-errors';
import type { PaymentStatus } from '@/lib/payments/payment-types';

export const dynamic = 'force-dynamic';

const schema = z.object({
  orderNumber: z.string().min(3).max(40),
  accessToken: z.string().min(8).max(120),
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
const REUSABLE: PaymentStatus[] = ['CREATED', 'REQUIRES_PAYMENT_METHOD', 'REQUIRES_ACTION', 'PROCESSING'];
const PORTUGAL_PAYMENT_METHODS = ['amazon_pay', 'card', 'mb_way', 'multibanco'];

function matchesPortugalPaymentProfile(intent: { raw?: unknown }, restricted: boolean): boolean {
  if (!restricted) return true;
  const raw = intent.raw as { payment_method_types?: unknown } | undefined;
  const methods = Array.isArray(raw?.payment_method_types)
    ? raw.payment_method_types.filter((method): method is string => typeof method === 'string').sort()
    : [];
  return methods.length === PORTUGAL_PAYMENT_METHODS.length
    && methods.every((method, index) => method === PORTUGAL_PAYMENT_METHODS[index]);
}

export async function POST(req: NextRequest) {
  const limit = rateLimit(req, 'create-intent', 20, 60_000);
  if (!limit.ok) return NextResponse.json({ error: 'Too many requests. Please wait a moment.' }, { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } });

  const requestId = randomUUID();
  let stage = 'request';

  try {
    stage = 'parse_request';
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: 'Invalid payment request' }, { status: 400 });
    const { orderNumber, accessToken, trackingParameters } = parsed.data;
    stage = 'load_order';
    const order = await db.order.findUnique({ where: { orderNumber }, include: { payments: { orderBy: { createdAt: 'desc' }, take: 1 } } });
    if (!order || !tokenMatches(order.accessToken, accessToken)) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    if (order.paymentStatus === 'PAID') return NextResponse.json({ error: 'Order already paid' }, { status: 409 });
    if (['REFUNDED', 'PARTIALLY_REFUNDED'].includes(order.paymentStatus)) return NextResponse.json({ error: 'Order payment is closed' }, { status: 409 });

    stage = 'validate_configuration';
    if (!isPaymentConfigured()) {
      console.error('create-intent: XPayments not configured');
      return NextResponse.json({ error: 'Online payments are temporarily unavailable. Please try again shortly.' }, { status: 503 });
    }

    const config = getPaymentConfig();
    // isPaymentConfigured() already guarantees this, but keep the response
    // fail-closed rather than ever initialising Stripe.js with an empty key.
    if (!config.publishableKey) {
      return NextResponse.json({ error: 'Online payments are temporarily unavailable. Please try again shortly.' }, { status: 503 });
    }

    stage = 'prepare_provider';
    const provider = getPaymentProvider();
    const capabilities = resolvePaymentCapabilities(order.country, order.currency);
    const amountMinor = toMinorUnit(order.total, order.currency);
    const portugalPaymentProfile = order.country.toUpperCase() === 'PT' && order.currency.toUpperCase() === 'EUR';
    const paymentProfile = portugalPaymentProfile ? 'pt-wallets-v1' : 'automatic';
    const idempotencyKey = `order:${order.orderNumber}:payment:${order.pricingHash ?? '1'}:${paymentProfile}`;
    const existing = order.payments[0] ?? null;
    let intent;

    stage = 'reuse_intent';
    if (existing?.paymentIntentId && REUSABLE.includes(existing.status as PaymentStatus)) {
      try { intent = await provider.retrievePaymentIntent(existing.paymentIntentId); } catch { intent = null; }
      if (intent && intent.amountMinor === amountMinor && REUSABLE.includes(intent.status) && matchesPortugalPaymentProfile(intent, portugalPaymentProfile)) {
        await db.payment.update({ where: { id: existing.id }, data: { status: intent.status, provider: provider.name, providerAccount: intent.xpaymentsTransactionId ?? existing.providerAccount } });
        return NextResponse.json({
          publishableKey: config.publishableKey,
          paymentIntentId: intent.id,
          xpaymentsTransactionId: intent.xpaymentsTransactionId ?? existing.providerAccount,
          clientSecret: intent.clientSecret,
          amountMinor,
          currency: order.currency,
          environment: provider.getPaymentCapabilities().environment,
          methods: capabilities.methods.filter((m) => m.enabled),
        });
      }
    }

    stage = 'cancel_previous_intent';
    if (existing?.paymentIntentId) { try { await provider.cancelPaymentIntent(existing.paymentIntentId); } catch { /* best effort */ } }

    const trackingMetadata = Object.fromEntries(
      Object.entries(trackingParameters ?? {}).filter(([, value]) => typeof value === 'string' && value.length > 0)
        .map(([key, value]) => [`tracking_${key}`, String(value)]),
    );
    stage = 'create_provider_intent';
    intent = await provider.createPaymentIntent({ amountMinor, currency: order.currency, idempotencyKey, orderNumber: order.orderNumber, customerCountry: order.country, customerEmail: order.email, description: `E-com.casa ${order.orderNumber}`, metadata: trackingMetadata });

    stage = 'persist_payment';
    const payment = await db.payment.upsert({
      where: { orderId: order.id },
      create: { orderId: order.id, provider: provider.name, providerAccount: intent.xpaymentsTransactionId ?? null, paymentIntentId: intent.id, amount: order.total, amountMinor, currency: order.currency, status: intent.status, clientSecretCreatedAt: new Date() },
      update: { provider: provider.name, providerAccount: intent.xpaymentsTransactionId ?? null, paymentIntentId: intent.id, amount: order.total, amountMinor, currency: order.currency, status: intent.status, clientSecretCreatedAt: new Date(), failureCode: null, failureMessage: null, failedAt: null },
    });
    await db.$transaction([
      db.order.update({ where: { id: order.id }, data: { paymentProvider: provider.name, paymentIntentId: intent.id, paymentStatus: intent.status === 'PROCESSING' ? 'PAYMENT_PROCESSING' : 'PENDING_PAYMENT' } }),
      db.paymentAttempt.create({ data: { paymentId: payment.id, provider: provider.name, providerReference: intent.id, status: intent.status, amount: order.total, currency: order.currency } }),
    ]);

    return NextResponse.json({
      publishableKey: config.publishableKey,
      paymentIntentId: intent.id,
      xpaymentsTransactionId: intent.xpaymentsTransactionId ?? payment.providerAccount,
      clientSecret: intent.clientSecret,
      amountMinor,
      currency: order.currency,
      environment: provider.getPaymentCapabilities().environment,
      methods: capabilities.methods.filter((m) => m.enabled),
    });
  } catch (error) {
    const perr = error instanceof PaymentError ? error : null;
    const details = error as { code?: string; errorCode?: string; name?: string; message?: string };
    const rawCode = details.code ?? details.errorCode ?? null;
    const name = details.name ?? (error instanceof Error ? error.name : 'UnknownError');
    const message = details.message ?? (error instanceof Error ? error.message : String(error));
    console.error('POST /api/payments/create-intent error', {
      requestId,
      stage,
      code: perr?.code ?? rawCode ?? 'UNKNOWN_ERROR',
      providerCode: perr?.providerCode,
      name,
      message,
    });
    return NextResponse.json({
      error: perr?.code === 'PAYMENT_CONFIGURATION_ERROR'
        ? 'Online payments are temporarily unavailable. Please try again shortly.'
        : 'We could not start the payment. Please try again.',
      errorCode: perr?.code ?? rawCode ?? 'UNKNOWN_ERROR',
      providerCode: perr?.providerCode ?? null,
      stage,
      requestId,
    }, { status: perr?.httpStatus ?? 500, headers: { 'Cache-Control': 'no-store' } });
  }
}
