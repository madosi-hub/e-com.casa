import 'server-only';

import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { verifyPaymentEventsSecret, type PaymentTrackingParameters } from '@/lib/payment-events';
import { getPaymentProvider } from '@/lib/payments/xpayments-provider';
import { toMinorUnit } from '@/lib/payments/amounts';
import type { ProviderPaymentIntent, StripeLikeIntent } from '@/lib/payments/payment-types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function trackingFromIntent(intent: ProviderPaymentIntent): PaymentTrackingParameters {
  const raw = intent.raw && typeof intent.raw === 'object' ? intent.raw as StripeLikeIntent : undefined;
  const metadata = raw?.metadata;
  return {
    src: metadata?.tracking_src ?? null,
    sck: metadata?.tracking_sck ?? null,
    utm_source: metadata?.tracking_utm_source ?? null,
    utm_medium: metadata?.tracking_utm_medium ?? null,
    utm_campaign: metadata?.tracking_utm_campaign ?? null,
    utm_content: metadata?.tracking_utm_content ?? null,
    utm_term: metadata?.tracking_utm_term ?? null,
  };
}

function providerPaidAt(intent: ProviderPaymentIntent, fallback: Date | null, createdAt: Date): Date {
  const raw = intent.raw && typeof intent.raw === 'object' ? intent.raw as { created?: number } : undefined;
  const value = raw?.created ? new Date(raw.created * 1_000) : fallback ?? createdAt;
  return Number.isFinite(value.getTime()) ? value : createdAt;
}

export async function POST(req: NextRequest) {
  if (!verifyPaymentEventsSecret(req.headers.get('x-ecom-bridge-secret'))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let hours = 48;
  try {
    const body = await req.json() as { hours?: number };
    if (Number.isFinite(body.hours)) hours = Math.min(168, Math.max(1, Math.trunc(body.hours!)));
  } catch { /* use the bounded default */ }

  const since = new Date(Date.now() - hours * 60 * 60_000);
  const orders = await db.order.findMany({
    where: { createdAt: { gte: since } },
    include: { payments: { orderBy: { createdAt: 'desc' }, take: 1 } },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  const provider = getPaymentProvider();
  const events: unknown[] = [];

  for (const order of orders) {
    const payment = order.payments[0];
    const paymentIntentId = payment?.paymentIntentId ?? order.paymentIntentId;
    if (!paymentIntentId) continue;
    try {
      const intent = await provider.retrievePaymentIntent(paymentIntentId);
      if (intent.status !== 'SUCCEEDED') continue;
      if (intent.amountMinor !== toMinorUnit(order.total, order.currency) || intent.currency !== order.currency.toUpperCase()) continue;
      const paidAt = providerPaidAt(intent, order.paidAt ?? payment?.paidAt ?? null, order.createdAt);
      events.push({
        event: 'payment_paid',
        idempotencyKey: `payment_paid:${order.orderNumber}`,
        order: {
          orderNumber: order.orderNumber,
          email: order.email,
          firstName: order.firstName,
          lastName: order.lastName,
          phone: order.phone,
          country: order.country,
          total: order.total,
          currency: order.currency,
          itemsJson: order.itemsJson,
          createdAt: order.createdAt.toISOString(),
          paidAt: paidAt.toISOString(),
          paymentMethodType: intent.paymentMethodType ?? payment?.paymentMethodType ?? order.paymentMethodType,
        },
        tracking: trackingFromIntent(intent),
      });
    } catch (error) {
      console.error('Payment export verification failed', {
        orderNumber: order.orderNumber,
        error: error instanceof Error ? error.name : 'unknown',
      });
    }
  }

  return NextResponse.json({ events, scanned: orders.length, since: since.toISOString() });
}
