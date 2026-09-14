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
  return [event.transaction_id ?? 'unknown', event.event ?? 'unknown', event.timestamp ?? ''].join(':');
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

  const transactionId = String(event.transaction_id ?? '');
  const eventType = String(event.event ?? '');
  if (!transactionId || !eventType) return NextResponse.json({ error: 'Invalid event' }, { status: 400 });

  const providerStatus = mapStatus(event);
  if (!providerStatus) return NextResponse.json({ received: true, ignored: eventType });

  const eventId = idFor(event);
  try {
    await db.webhookEvent.create({ data: { id: eventId, provider: 'xpayments_stripe', type: eventType, payloadJson: rawBody.slice(0, 20_000) } });
  } catch {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    const payment = await db.payment.findFirst({
      where: { providerAccount: transactionId },
      include: { order: true },
    });
    if (!payment) return NextResponse.json({ received: true, unknownTransaction: true });

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
      xpaymentsTransactionId: transactionId,
    };

    const timestamp = event.timestamp ? new Date(event.timestamp) : undefined;
    const paidAt = timestamp && !Number.isNaN(timestamp.getTime()) ? timestamp : undefined;

    const result = await applyProviderIntent(payment.orderId, intent, {
      paidAt,
      eventId,
      paymentMethodType: event.method ?? null,
      xpaymentsTransactionId: transactionId,
    });

    return NextResponse.json({ received: true, applied: result.paymentStatus });
  } catch (error) {
    console.error(`XPayments webhook ${eventId} processing error`, error instanceof Error ? error.message : 'unknown');
    await db.webhookEvent.delete({ where: { id: eventId } }).catch(() => undefined);
    return NextResponse.json({ error: 'Processing error' }, { status: 500 });
  }
}
