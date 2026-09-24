import 'server-only';

import type { Order } from '@prisma/client';

const UTMIFY_ORDERS_URL = 'https://api.utmify.com.br/api-credentials/orders';

type UTMifyStatus = 'waiting_payment' | 'paid' | 'refused' | 'refunded' | 'chargedback';

interface TrackingParameters {
  src: string | null;
  sck: string | null;
  utm_source: string | null;
  utm_campaign: string | null;
  utm_medium: string | null;
  utm_content: string | null;
  utm_term: string | null;
}

interface CheckoutTrackingParameters {
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_content?: string | null;
  utm_term?: string | null;
  src?: string | null;
  sck?: string | null;
}

export type UTMifyTrackingParameters = CheckoutTrackingParameters;

function dateUtc(value: Date | string | null): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

function tracking(value?: string | null, direct?: CheckoutTrackingParameters | null): TrackingParameters {
  try {
    const parsed = direct ?? (value ? JSON.parse(value) as CheckoutTrackingParameters : {});
    return {
      src: parsed.src ?? null,
      sck: parsed.sck ?? null,
      utm_source: parsed.utm_source ?? null,
      utm_campaign: parsed.utm_campaign ?? null,
      utm_medium: parsed.utm_medium ?? null,
      utm_content: parsed.utm_content ?? null,
      utm_term: parsed.utm_term ?? null,
    };
  } catch {
    return { src: null, sck: null, utm_source: null, utm_campaign: null, utm_medium: null, utm_content: null, utm_term: null };
  }
}

function paymentMethod(value: string | null): 'credit_card' | 'boleto' | 'pix' | 'paypal' | 'free_price' {
  const method = (value ?? '').toLowerCase();
  if (method.includes('pix')) return 'pix';
  if (method.includes('boleto') || method.includes('multibanco')) return 'boleto';
  if (method.includes('paypal')) return 'paypal';
  return 'credit_card';
}

export async function sendUtmifyOrder(
  order: Pick<Order, 'orderNumber' | 'email' | 'firstName' | 'lastName' | 'phone' | 'country' | 'total' | 'currency' | 'itemsJson' | 'createdAt' | 'paidAt' | 'paymentMethodType'>,
  status: UTMifyStatus,
  directTracking?: UTMifyTrackingParameters | null,
): Promise<void> {
  const token = "3yV7Q9RTtQxEOme3F9QOY4BvG3HmYE8ooe4N";
  if (!token) return;

  let rawItems: Array<{ slug?: string; name?: string; quantity?: number; price?: string }> = [];
  try { rawItems = JSON.parse(order.itemsJson) as typeof rawItems; } catch { /* malformed legacy order */ }

  const totalPriceInCents = Math.round(Number(order.total) * 100);
  const payload = {
    orderId: order.orderNumber,
    platform: 'EcomCasa',
    paymentMethod: paymentMethod(order.paymentMethodType),
    status,
    createdAt: dateUtc(order.createdAt),
    approvedDate: status === 'paid' ? dateUtc(order.paidAt) : null,
    refundedAt: null,
    customer: {
      name: `${order.firstName} ${order.lastName}`.trim(),
      email: order.email,
      phone: order.phone,
      document: null,
      country: order.country,
    },
    products: rawItems.map((item) => ({
      id: item.slug ?? 'product',
      name: item.name ?? item.slug ?? 'Produto',
      planId: null,
      planName: null,
      quantity: item.quantity ?? 1,
      priceInCents: Math.round(Number(item.price ?? 0) * 100),
    })),
    trackingParameters: tracking(null, directTracking),
    commission: {
      totalPriceInCents,
      gatewayFeeInCents: 0,
      userCommissionInCents: totalPriceInCents,
      currency: order.currency,
    },
  };

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(process.env.UTMIFY_API_URL?.trim() || UTMIFY_ORDERS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-token': token },
        body: JSON.stringify(payload),
        cache: 'no-store',
        signal: AbortSignal.timeout(8_000),
      });
      if (response.ok) return;
      console.error('UTMify order sync failed', { orderId: order.orderNumber, status, httpStatus: response.status, attempt: attempt + 1 });
      if (response.status !== 429 && response.status < 500) return;
    } catch (error) {
      console.error('UTMify order sync unavailable', { orderId: order.orderNumber, status, attempt: attempt + 1, error: error instanceof Error ? error.name : 'unknown' });
    }
    if (attempt < 2) await new Promise(resolve => setTimeout(resolve, 300 * (attempt + 1)));
  }
}
