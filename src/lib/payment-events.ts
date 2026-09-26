import 'server-only';

import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Order } from '@prisma/client';

const PAYMENT_EVENTS_URL = 'https://umamim.madosi.online/ecom-dashboard/api/payment-paid';
const PAYMENT_EVENTS_SECRET = '23e0ccaa4ed652157d9a3fb88948db130959d1768488cce98ecca6214f0bd50a';

export interface PaymentTrackingParameters {
  src?: string | null;
  sck?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_content?: string | null;
  utm_term?: string | null;
}

export interface PaymentEventDeliveryResult {
  ok: boolean;
  attempts: number;
  error: string | null;
  httpStatus: number | null;
}

type PaidOrder = Pick<
  Order,
  | 'orderNumber'
  | 'email'
  | 'firstName'
  | 'lastName'
  | 'phone'
  | 'country'
  | 'total'
  | 'currency'
  | 'itemsJson'
  | 'createdAt'
  | 'paidAt'
  | 'paymentMethodType'
>;

export function paymentEventsSecret(): string {
  return process.env.PAYMENT_EVENTS_SECRET?.trim() || PAYMENT_EVENTS_SECRET;
}

export function verifyPaymentEventsSecret(value: string | null): boolean {
  const received = Buffer.from(value ?? '');
  const expected = Buffer.from(paymentEventsSecret());
  return received.length === expected.length && timingSafeEqual(received, expected);
}

function signature(timestamp: string, body: string): string {
  const secret = paymentEventsSecret();
  return createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
}

export async function sendPaymentPaidEvent(
  order: PaidOrder,
  tracking: PaymentTrackingParameters | null,
  options: { attempts?: number; timeoutMs?: number } = {},
): Promise<PaymentEventDeliveryResult> {
  const payload = {
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
      paidAt: order.paidAt?.toISOString() ?? null,
      paymentMethodType: order.paymentMethodType,
    },
    tracking: tracking ?? {},
  };
  const body = JSON.stringify(payload);
  const attempts = options.attempts ?? 3;
  const timeoutMs = options.timeoutMs ?? 8_000;
  let lastError = 'Payment event delivery failed';
  let lastHttpStatus: number | null = null;

  for (let attempt = 0; attempt < attempts; attempt++) {
    const timestamp = String(Math.floor(Date.now() / 1000));
    try {
      const response = await fetch(process.env.PAYMENT_EVENTS_URL?.trim() || PAYMENT_EVENTS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'EcomCasa-Payments/1.0',
          'x-ecom-timestamp': timestamp,
          'x-ecom-signature': signature(timestamp, body),
        },
        body,
        cache: 'no-store',
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (response.ok) return { ok: true, attempts: attempt + 1, error: null, httpStatus: response.status };
      lastHttpStatus = response.status;
      lastError = `Payment event service returned HTTP ${response.status}`;
      if (response.status !== 429 && response.status < 500) break;
    } catch (error) {
      lastError = error instanceof Error ? error.name : 'Unknown delivery error';
    }
    if (attempt < attempts - 1) await new Promise(resolve => setTimeout(resolve, 300 * (attempt + 1)));
  }

  console.error('Payment paid event delivery failed', {
    orderNumber: order.orderNumber,
    attempts,
    httpStatus: lastHttpStatus,
    error: lastError,
  });
  return { ok: false, attempts, error: lastError, httpStatus: lastHttpStatus };
}
