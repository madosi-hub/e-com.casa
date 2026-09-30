// Optional XPayments merchant webhook contract.
// The E-com.casa checkout does NOT depend on this route: pending
// orders are reconciled server-to-server through the PaymentIntent
// API. If XPayments provides a merchant callback secret, this route
// remains available as a faster push path and shares the same
// idempotent reconciliation logic.

import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { db } from '@/lib/db';
import { getPaymentConfig } from '@/lib/payments/payments-config';
import { applyProviderIntent } from '@/lib/payments/reconcile-payment';
import { getPaymentProvider } from '@/lib/payments/xpayments-provider';
import { toMinorUnit } from '@/lib/payments/amounts';
import type { PaymentStatus, ProviderPaymentIntent } from '@/lib/payments/payment-types';

export const dynamic = 'force-dynamic';

interface XPaymentsEvent {
  event?: string;
  transaction_id?: string;
  reference?: string;
  amount?: number;
  currency?: string;
  status?: string;
  method?: string;
  timestamp?: string;
}

function verify(rawBody: string, signature: string | null, secret: string | null): boolean {
  if (!signature || !secret || !/^[0-9a-f]{64}$/i.test(signature.trim())) return false;
  const expected = createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex');
  const supplied = Buffer.from(signature.trim(), 'hex');
  const calculated = Buffer.from(expected, 'hex');
  return supplied.length === calculated.length && timingSafeEqual(supplied, calculated);
}

function idFor(event: XPaymentsEvent): string {
  return [event.transaction_id ?? event.reference ?? 'unknown', event.event ?? event.status ?? 'unknown', event.timestamp ?? ''].join(':');
}

function mapStatus(event: XPaymentsEvent): PaymentStatus | null {
  const status = String(event.status ?? '').toLowerCase();
  const type = String(event.event ?? '').toLowerCase();
  if (type === 'payment_intent.succeeded' || status === 'succeeded') return 'SUCCEEDED';
  if (type === 'payment_intent.processing' || status === 'processing') return 'PROCESSING';
  if (type === 'payment_intent.payment_failed' || status === 'failed') return 'FAILED';
  if (type === 'payment_intent.canceled' || type === 'payment_intent.cancelled' || status === 'canceled' || status === 'cancelled') return 'CANCELLED';
  return null;
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const cfg = getPaymentConfig();

  // Fail closed if the optional merchant callback is not configured.
  // This does not affect checkout because status reconciliation uses
  // authenticated server-to-server PaymentIntent retrieval instead.
  if (!cfg.webhookSecret) {
    return NextResponse.json({ error: 'Merchant webhook not configured' }, { status: 404 });
  }
  if (!verify(rawBody, req.headers.get('x-nexflowx-signature'), cfg.webhookSecret)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  let event: XPaymentsEvent;
  try { event = JSON.parse(rawBody) as XPaymentsEvent; }
  catch { return NextResponse.json({ error: 'Invalid payload' }, { status: 400 }); }

  const transactionId = String(event.transaction_id ?? '').trim();
  const reference = String(event.reference ?? '').trim();
  const eventType = String(event.event ?? (event.status ? `payment_intent.${event.status}` : '')).trim();
  if ((!transactionId && !reference) || !eventType) {
    return NextResponse.json({ error: 'Invalid event' }, { status: 400 });
  }

  const providerStatus = mapStatus(event);
  if (!providerStatus) return NextResponse.json({ received: true, ignored: eventType });

  const eventId = idFor(event);
  try {
    await db.webhookEvent.create({ data: { id: eventId, provider: 'xpayments_stripe', type: eventType, payloadJson: rawBody.slice(0, 20_000) } });
  } catch (error) {
    if ((error as { code?: string }).code === 'P2002') {
      return NextResponse.json({ received: true, duplicate: true });
    }
    return NextResponse.json({ error: 'Event storage unavailable' }, { status: 500 });
  }

  try {
    // A successful gateway callback can be the first place where the SC-…
    // transaction id appears. The locally-created Payment is keyed by pi_…
    // and may still have providerAccount=null, so transaction-id-only lookup
    // loses a real captured sale. XPayments reference can identify either the
    // PaymentIntent or our merchant order number; accept all verified forms.
    const identifiers = Array.from(new Set([transactionId, reference].filter(Boolean)));
    let payment = await db.payment.findFirst({
      where: {
        OR: [
          ...identifiers.map(value => ({ providerAccount: value })),
          ...identifiers.map(value => ({ paymentIntentId: value })),
          ...identifiers.map(value => ({ order: { orderNumber: value } })),
        ],
      },
      include: { order: true },
    });
    let storedIntent: ProviderPaymentIntent | null = null;

    // Some callbacks use SC-… for both transaction_id and reference. If the
    // creation response did not yet expose that id, inspect a small bounded
    // set of recent open intents and match the provider's own metadata. Never
    // guess by amount alone: two buyers can legitimately pay the same total.
    if (!payment && transactionId) {
      const candidates = await db.payment.findMany({
        where: {
          provider: 'xpayments_stripe',
          order: {
            paymentStatus: { in: ['PENDING_PAYMENT', 'PAYMENT_PROCESSING'] },
            createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60_000) },
          },
        },
        include: { order: true },
        orderBy: { createdAt: 'desc' },
        take: 20,
      });
      for (const candidate of candidates) {
        let intent: ProviderPaymentIntent;
        try {
          intent = await getPaymentProvider().retrievePaymentIntent(candidate.paymentIntentId);
        } catch {
          continue;
        }
        if (intent.xpaymentsTransactionId !== transactionId) continue;
        payment = candidate;
        storedIntent = intent;
        break;
      }
    }
    // The callback may beat local payment persistence; allow provider retry.
    if (!payment) throw new Error('Payment not yet available');

    // Merchant callbacks do not include Stripe metadata. Read the existing
    // intent before applying success, so attribution survives browser closure.
    storedIntent ??= await getPaymentProvider().retrievePaymentIntent(payment.paymentIntentId);
    if (storedIntent.id !== payment.paymentIntentId) throw new Error('PaymentIntent mismatch');

    const amountMinor =
      typeof event.amount === 'number' && Number.isInteger(event.amount) && event.amount >= 0
        ? event.amount
        : payment.amountMinor ?? toMinorUnit(payment.order.total, payment.order.currency);

    const intent: ProviderPaymentIntent = {
      id: payment.paymentIntentId,
      clientSecret: null,
      status: providerStatus,
      amountMinor,
      currency: String(event.currency ?? payment.order.currency).toUpperCase(),
      paymentMethodType: event.method ?? payment.paymentMethodType ?? null,
      xpaymentsTransactionId: transactionId || payment.providerAccount,
      raw: storedIntent.raw,
    };

    const timestamp = event.timestamp ? new Date(event.timestamp) : undefined;
    const paidAt = timestamp && !Number.isNaN(timestamp.getTime()) ? timestamp : undefined;

    const result = await applyProviderIntent(payment.orderId, intent, {
      paidAt,
      eventId,
      paymentMethodType: event.method ?? null,
      xpaymentsTransactionId: transactionId || payment.providerAccount,
    });

    return NextResponse.json({ received: true, applied: result.paymentStatus });
  } catch (error) {
    console.error(`XPayments webhook ${eventId} processing error`, error instanceof Error ? error.message : 'unknown');
    await db.webhookEvent.delete({ where: { id: eventId } }).catch(() => undefined);
    return NextResponse.json({ error: 'Processing error' }, { status: 500 });
  }
}
