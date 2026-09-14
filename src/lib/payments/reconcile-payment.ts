// E-com.casa — server-side XPayments payment reconciliation
// Keeps the order database authoritative even when the merchant
// webhook is not enabled. Pending checkout status polls retrieve
// the PaymentIntent from XPayments server-to-server and apply the
// same monotonic payment side effects idempotently.

import 'server-only';

import { db } from '@/lib/db';
import { getProduct } from '@/lib/catalog';
import { assignTrackingFields } from '@/lib/tracking';
import { sendPaymentConfirmedEmail } from '@/lib/email/order-email';
import { getPaymentProvider } from './xpayments-provider';
import { toMinorUnit } from './amounts';
import type { ProviderPaymentIntent } from './payment-types';

export interface ReconcileOptions {
  /** Provider event timestamp when a signed webhook supplies one. */
  paidAt?: Date;
  /** Provider event id for audit/idempotency metadata. */
  eventId?: string | null;
  /** Method supplied by the provider event, if more specific. */
  paymentMethodType?: string | null;
  /** XPayments transaction id supplied by the provider event. */
  xpaymentsTransactionId?: string | null;
}

export interface ReconcileResult {
  checked: boolean;
  changed: boolean;
  paymentStatus: string;
  providerStatus?: string;
  reason?: string;
}

function safePaidAt(value?: Date): Date {
  if (!value || Number.isNaN(value.getTime())) return new Date();
  return value;
}

/**
 * Apply a provider PaymentIntent to a stored order.
 *
 * Safety rules:
 * - amount and currency must match the server-priced order;
 * - PAID is monotonic (a later failed/cancelled read cannot downgrade it);
 * - stock is decremented at most once using Order.stockApplied;
 * - the confirmation email is sent only by the request that wins the
 *   atomic PENDING/PROCESSING -> PAID transition;
 * - no fiscal invoice is fabricated here. Fiscal issuance belongs to
 *   the separate accounting/fiscal adapter.
 */
export async function applyProviderIntent(
  orderId: string,
  intent: ProviderPaymentIntent,
  options: ReconcileOptions = {},
): Promise<ReconcileResult> {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { payments: { orderBy: { createdAt: 'desc' }, take: 1 } },
  });
  if (!order) return { checked: true, changed: false, paymentStatus: 'UNKNOWN', reason: 'order_not_found' };

  const payment = order.payments[0] ?? null;
  if (!payment) return { checked: true, changed: false, paymentStatus: order.paymentStatus, reason: 'payment_not_found' };
  if (payment.paymentIntentId !== intent.id) {
    return { checked: true, changed: false, paymentStatus: order.paymentStatus, providerStatus: intent.status, reason: 'intent_mismatch' };
  }

  const expectedAmountMinor = toMinorUnit(order.total, order.currency);
  const providerCurrency = intent.currency.toUpperCase();
  if (intent.amountMinor !== expectedAmountMinor || providerCurrency !== order.currency.toUpperCase()) {
    console.error('payment reconciliation amount/currency mismatch', {
      orderNumber: order.orderNumber,
      expectedAmountMinor,
      receivedAmountMinor: intent.amountMinor,
      expectedCurrency: order.currency,
      receivedCurrency: providerCurrency,
    });
    return {
      checked: true,
      changed: false,
      paymentStatus: order.paymentStatus,
      providerStatus: intent.status,
      reason: 'amount_currency_mismatch',
    };
  }

  const method = options.paymentMethodType ?? intent.paymentMethodType ?? payment.paymentMethodType ?? null;
  const transactionId = options.xpaymentsTransactionId ?? intent.xpaymentsTransactionId ?? payment.providerAccount ?? null;
  const eventId = options.eventId ?? null;

  if (intent.status === 'SUCCEEDED') {
    const paidAt = order.paidAt ?? safePaidAt(options.paidAt);
    const tracking = assignTrackingFields(order.orderNumber, order.shippingMethod, order.country, paidAt);
    let transitionedToPaid = false;

    const orderedItems = JSON.parse(order.itemsJson) as Array<{ slug: string }>;
    const catalogueProducts = await Promise.all(orderedItems.map(item => getProduct(item.slug)));
    const unlimitedSlugs = new Set(catalogueProducts.filter(product => product?.stockUnlimited).map(product => product!.slug));

    await db.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: 'SUCCEEDED',
          paidAt,
          paymentMethodType: method,
          providerAccount: transactionId,
          ...(eventId ? { lastEventId: eventId } : {}),
          failureCode: null,
          failureMessage: null,
          failedAt: null,
        },
      });

      const paidClaim = await tx.order.updateMany({
        where: { id: order.id, paymentStatus: { not: 'PAID' } },
        data: {
          paymentStatus: 'PAID',
          paidAt,
          status: 'CONFIRMED',
          paymentMethodType: method,
          paymentFailureReason: null,
          trackingNumber: tracking.trackingNumber,
          carrier: tracking.carrier,
          originWarehouse: tracking.originWarehouse,
          estimatedDeliveryAt: tracking.estimatedDeliveryAt,
        },
      });
      transitionedToPaid = paidClaim.count === 1;

      // Claim stock side effects atomically. A second poll/webhook cannot
      // decrement stock again after stockApplied has been set.
      const stockClaim = await tx.order.updateMany({
        where: { id: order.id, stockApplied: false },
        data: { stockApplied: true },
      });
      if (stockClaim.count === 1) {
        let items: Array<{ slug: string; quantity: number }> = [];
        try { items = JSON.parse(order.itemsJson) as Array<{ slug: string; quantity: number }>; }
        catch { items = []; }
        for (const item of items) {
          if (!item.slug || !Number.isInteger(item.quantity) || item.quantity <= 0) continue;
          if (unlimitedSlugs.has(item.slug)) continue;
          const updated = await tx.product.updateMany({
            where: { slug: item.slug, stock: { gte: item.quantity } },
            data: { stock: { decrement: item.quantity } },
          });
          if (updated.count !== 1) {
            throw new Error(`Stock reconciliation failed for ${item.slug}`);
          }
        }
      }
    });

    if (transitionedToPaid) {
      await sendPaymentConfirmedEmail({
        orderNumber: order.orderNumber,
        customerEmail: order.email,
        firstName: order.firstName,
        total: order.total,
        currency: order.currency,
        trackingNumber: tracking.trackingNumber,
        originWarehouse: tracking.originWarehouse,
      }).catch((error) => {
        console.error('payment confirmation email failed after reconciliation', error instanceof Error ? error.message : 'unknown');
      });
    }

    return { checked: true, changed: transitionedToPaid, paymentStatus: 'PAID', providerStatus: intent.status };
  }

  // Never downgrade a paid/refunded order from a stale or out-of-order read.
  if (['PAID', 'REFUNDED', 'PARTIALLY_REFUNDED'].includes(order.paymentStatus)) {
    return { checked: true, changed: false, paymentStatus: order.paymentStatus, providerStatus: intent.status };
  }

  if (intent.status === 'PROCESSING') {
    await db.$transaction([
      db.payment.update({
        where: { id: payment.id },
        data: {
          status: 'PROCESSING',
          paymentMethodType: method,
          providerAccount: transactionId,
          ...(eventId ? { lastEventId: eventId } : {}),
        },
      }),
      db.order.update({
        where: { id: order.id },
        data: { paymentStatus: 'PAYMENT_PROCESSING', paymentMethodType: method },
      }),
    ]);
    return { checked: true, changed: order.paymentStatus !== 'PAYMENT_PROCESSING', paymentStatus: 'PAYMENT_PROCESSING', providerStatus: intent.status };
  }

  if (intent.status === 'FAILED') {
    await db.$transaction([
      db.payment.update({
        where: { id: payment.id },
        data: {
          status: 'FAILED',
          failedAt: payment.failedAt ?? new Date(),
          paymentMethodType: method,
          providerAccount: transactionId,
          failureCode: payment.failureCode ?? 'payment_failed',
          ...(eventId ? { lastEventId: eventId } : {}),
        },
      }),
      db.order.update({
        where: { id: order.id },
        data: { paymentStatus: 'PAYMENT_FAILED', paymentFailureReason: 'payment_failed', paymentMethodType: method },
      }),
    ]);
    return { checked: true, changed: order.paymentStatus !== 'PAYMENT_FAILED', paymentStatus: 'PAYMENT_FAILED', providerStatus: intent.status };
  }

  if (intent.status === 'CANCELLED') {
    await db.$transaction([
      db.payment.update({
        where: { id: payment.id },
        data: {
          status: 'CANCELLED',
          paymentMethodType: method,
          providerAccount: transactionId,
          ...(eventId ? { lastEventId: eventId } : {}),
        },
      }),
      db.order.update({
        where: { id: order.id },
        data: { paymentStatus: 'CANCELLED', status: 'CANCELLED', paymentMethodType: method },
      }),
    ]);
    return { checked: true, changed: order.paymentStatus !== 'CANCELLED', paymentStatus: 'CANCELLED', providerStatus: intent.status };
  }

  // CREATED / REQUIRES_PAYMENT_METHOD / REQUIRES_ACTION remain payable.
  await db.payment.update({
    where: { id: payment.id },
    data: {
      status: intent.status,
      paymentMethodType: method,
      providerAccount: transactionId,
      ...(eventId ? { lastEventId: eventId } : {}),
    },
  });
  if (order.paymentStatus !== 'PENDING_PAYMENT') {
    await db.order.update({ where: { id: order.id }, data: { paymentStatus: 'PENDING_PAYMENT' } });
  }
  return { checked: true, changed: false, paymentStatus: 'PENDING_PAYMENT', providerStatus: intent.status };
}

/** Retrieve the current XPayments PaymentIntent and reconcile it. */
export async function refreshOrderPayment(orderId: string): Promise<ReconcileResult> {
  const payment = await db.payment.findUnique({ where: { orderId } });
  if (!payment?.paymentIntentId) {
    const order = await db.order.findUnique({ where: { id: orderId }, select: { paymentStatus: true } });
    return { checked: false, changed: false, paymentStatus: order?.paymentStatus ?? 'UNKNOWN', reason: 'payment_intent_missing' };
  }

  try {
    const intent = await getPaymentProvider().retrievePaymentIntent(payment.paymentIntentId);
    return await applyProviderIntent(orderId, intent);
  } catch (error) {
    console.warn('XPayments status reconciliation unavailable', error instanceof Error ? error.message : 'unknown');
    const order = await db.order.findUnique({ where: { id: orderId }, select: { paymentStatus: true } });
    return {
      checked: false,
      changed: false,
      paymentStatus: order?.paymentStatus ?? 'UNKNOWN',
      reason: 'provider_unavailable',
    };
  }
}
