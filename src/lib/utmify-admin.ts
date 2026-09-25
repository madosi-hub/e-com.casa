import 'server-only';

import type { Order, Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import type { ProviderPaymentIntent, StripeLikeIntent } from '@/lib/payments/payment-types';
import { getPaymentProvider } from '@/lib/payments/xpayments-provider';
import {
  normaliseUtmifyTracking,
  sendUtmifyOrder,
  type TrackingParameters,
  type UTMifyDeliveryResult,
} from '@/lib/utmify';

type AuditOrder = Prisma.OrderGetPayload<{
  include: { payments: { select: { paymentIntentId: true } } };
}>;

export type UtmifyAuditRow = {
  order: Order;
  paymentIntentId: string | null;
  tracking: TrackingParameters;
  metadataAvailable: boolean;
  metadataError: string | null;
};

const reprocessing = new Map<string, Promise<UTMifyDeliveryResult>>();

export function trackingFromIntent(intent: Pick<ProviderPaymentIntent, 'raw'>): TrackingParameters {
  const raw = intent.raw && typeof intent.raw === 'object' ? intent.raw as StripeLikeIntent : undefined;
  const metadata = raw?.metadata;
  return normaliseUtmifyTracking(null, {
    src: metadata?.tracking_src ?? null,
    sck: metadata?.tracking_sck ?? null,
    utm_source: metadata?.tracking_utm_source ?? null,
    utm_medium: metadata?.tracking_utm_medium ?? null,
    utm_campaign: metadata?.tracking_utm_campaign ?? null,
    utm_content: metadata?.tracking_utm_content ?? null,
    utm_term: metadata?.tracking_utm_term ?? null,
  });
}

async function auditOrder(order: AuditOrder): Promise<UtmifyAuditRow> {
  const paymentIntentId = order.payments[0]?.paymentIntentId ?? order.paymentIntentId;
  if (!paymentIntentId) {
    return {
      order,
      paymentIntentId: null,
      tracking: normaliseUtmifyTracking(),
      metadataAvailable: false,
      metadataError: 'Pagamento sem identificador externo',
    };
  }

  try {
    const intent = await getPaymentProvider().retrievePaymentIntent(paymentIntentId);
    return {
      order,
      paymentIntentId,
      tracking: trackingFromIntent(intent),
      metadataAvailable: true,
      metadataError: null,
    };
  } catch (error) {
    return {
      order,
      paymentIntentId,
      tracking: normaliseUtmifyTracking(),
      metadataAvailable: false,
      metadataError: error instanceof Error ? error.message : 'Não foi possível consultar o pagamento',
    };
  }
}

export async function getUtmifyAuditPage(page: number, pageSize = 20): Promise<{
  rows: UtmifyAuditRow[];
  total: number;
  pageCount: number;
}> {
  const where: Prisma.OrderWhereInput = {
    paymentStatus: 'PAID',
  };
  const total = await db.order.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(Math.max(1, page), pageCount);
  const orders = await db.order.findMany({
    where,
    include: { payments: { select: { paymentIntentId: true }, orderBy: { createdAt: 'desc' }, take: 1 } },
    orderBy: { paidAt: 'desc' },
    skip: (currentPage - 1) * pageSize,
    take: pageSize,
  });

  const rows: UtmifyAuditRow[] = [];
  for (let offset = 0; offset < orders.length; offset += 5) {
    rows.push(...await Promise.all(orders.slice(offset, offset + 5).map(auditOrder)));
  }

  return { rows, total, pageCount };
}

async function performReprocessing(orderId: string): Promise<UTMifyDeliveryResult> {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { payments: { orderBy: { createdAt: 'desc' }, take: 1 } },
  });
  if (!order) throw new Error('Pedido não encontrado');
  if (order.paymentStatus !== 'PAID') throw new Error('Apenas vendas pagas podem ser reprocessadas');

  const paymentIntentId = order.payments[0]?.paymentIntentId ?? order.paymentIntentId;
  if (!paymentIntentId) throw new Error('Pagamento sem identificador externo');
  const intent = await getPaymentProvider().retrievePaymentIntent(paymentIntentId);
  return sendUtmifyOrder(order, 'paid', trackingFromIntent(intent));
}

export async function reprocessPaidOrderToUtmify(orderId: string): Promise<UTMifyDeliveryResult> {
  const existing = reprocessing.get(orderId);
  if (existing) return existing;

  const task = performReprocessing(orderId);
  reprocessing.set(orderId, task);
  try {
    return await task;
  } finally {
    if (reprocessing.get(orderId) === task) reprocessing.delete(orderId);
  }
}
