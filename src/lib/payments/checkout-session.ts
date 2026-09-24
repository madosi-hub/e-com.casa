import 'server-only';
import { randomUUID } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import { db } from '@/lib/db';
import { tokenMatches } from '@/lib/checkout';
import { getProduct } from '@/lib/catalog';
import { assignTrackingFields } from '@/lib/tracking';
import { sendPaymentConfirmedEmail } from '@/lib/email/order-email';
import { sendUtmifyOrder } from '@/lib/utmify';
import { getPaymentProvider } from './xpayments-provider';
import { getPaymentConfig } from './payments-config';
import { resolvePaymentCapabilities } from './payment-capabilities';

// Serialize preparation, confirmation and promotion across webhook/poll workers.
// The database lock also makes provider-create retries use the same idempotency key.
export function withCheckoutLock<T>(key: string, action: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  return db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))`;
    return action(tx);
  }, { timeout: 30000, maxWait: 10000 });
}

export const checkoutContactSchema = z.object({
  email: z.string().trim().email(), firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80), address: z.string().trim().min(1).max(200),
  address2: z.string().max(200).nullable().optional(), city: z.string().trim().min(1).max(100),
  postalCode: z.string().trim().min(1).max(20), phone: z.string().max(40).nullable().optional(),
});

type Snapshot = Pick<Prisma.OrderCreateInput, 'email' | 'firstName' | 'lastName' | 'address' | 'address2' | 'city' | 'postalCode' | 'country' | 'phone' | 'shippingMethod' | 'subtotal' | 'shipping' | 'tax' | 'discount' | 'total' | 'promoCode' | 'itemsJson' | 'giftWrap' | 'notes' | 'currency' | 'pricingHash'>;

export async function prepareCheckoutPayment(reference: string, token: string) {
  const session = await db.checkoutSession.findUnique({ where: { reference } });
  if (!session || !tokenMatches(session.accessToken, token)) throw new Error('Checkout not found');
  return withCheckoutLock(session.sessionKey, async (tx) => {
    const current = await tx.checkoutSession.findUniqueOrThrow({ where: { id: session.id } });
    if (current.orderId) throw new Error('Checkout already paid');
    const provider = getPaymentProvider();
    const config = getPaymentConfig();
    if (!config.secretKey || !config.publishableKey) throw new Error('Payments unavailable');
    let intent = current.paymentIntentId ? await provider.retrievePaymentIntent(current.paymentIntentId) : null;
    if (intent && ['SUCCEEDED', 'CANCELLED'].includes(intent.status)) throw new Error('Payment closed; check payment status');
    if (!intent) {
      intent = await provider.createPaymentIntent({
        amountMinor: current.amountMinor, currency: current.currency, customerCountry: current.country,
        orderNumber: current.reference, idempotencyKey: `checkout:${current.id}`,
        description: `E-com.casa checkout ${current.reference}`,
        // Contact data belongs to the checkout; no fictitious receipt address.
      });
      await tx.checkoutSession.update({ where: { id: current.id }, data: {
        paymentIntentId: intent.id, providerAccount: intent.xpaymentsTransactionId,
      } });
    }
    if (intent.amountMinor !== current.amountMinor || intent.currency !== current.currency) throw new Error('Payment amount mismatch');
    return {
      publishableKey: config.publishableKey, clientSecret: intent.clientSecret, paymentIntentId: intent.id,
      amountMinor: current.amountMinor, currency: current.currency, environment: config.environment,
      methods: resolvePaymentCapabilities(current.country, current.currency).methods.filter(m => m.enabled),
    };
  });
}

/** Persist complete contact details before the browser can submit a payment. */
export async function submitCheckoutContact(reference: string, token: string, input: unknown) {
  const contact = checkoutContactSchema.parse(input);
  const session = await db.checkoutSession.findUnique({ where: { reference } });
  if (!session || !tokenMatches(session.accessToken, token)) throw new Error('Checkout not found');
  await withCheckoutLock(session.sessionKey, async (tx) => {
    const current = await tx.checkoutSession.findUniqueOrThrow({ where: { id: session.id } });
    if (!current.paymentIntentId || current.orderId) throw new Error('Checkout is not payable');
    const snapshot = JSON.parse(current.snapshotJson) as Snapshot;
    if (current.readyAt) {
      // A submitted asynchronous payment must retain its original delivery details.
      if (JSON.stringify(checkoutContactSchema.parse(snapshot)) === JSON.stringify(contact)) return;
      const intent = await getPaymentProvider().retrievePaymentIntent(current.paymentIntentId);
      if (intent.status !== 'REQUIRES_PAYMENT_METHOD') throw new Error('Checkout already submitted');
    }
    await tx.checkoutSession.update({ where: { id: current.id }, data: {
      snapshotJson: JSON.stringify({ ...snapshot, ...contact }), readyAt: new Date(),
    } });
  });
}

/** Retrieve authoritative provider state; only SUCCEEDED may create an Order. */
export async function refreshCheckoutPayment(reference: string) {
  const session = await db.checkoutSession.findUniqueOrThrow({ where: { reference } });
  const result = await withCheckoutLock(session.sessionKey, async (tx) => {
    const current = await tx.checkoutSession.findUniqueOrThrow({ where: { id: session.id } });
    if (current.orderId) return { session: current, created: null };
    if (!current.paymentIntentId) return { session: current, created: null };
    const intent = await getPaymentProvider().retrievePaymentIntent(current.paymentIntentId);
    if (intent.id !== current.paymentIntentId || intent.amountMinor !== current.amountMinor || intent.currency.toUpperCase() !== current.currency.toUpperCase()) {
      throw new Error('Checkout payment identity/amount/currency mismatch');
    }
    if (intent.status !== 'SUCCEEDED') {
      const paymentStatus = intent.status === 'PROCESSING' ? 'PAYMENT_PROCESSING'
        : intent.status === 'CANCELLED' ? 'CANCELLED' : intent.status === 'FAILED' ? 'PAYMENT_FAILED' : 'PENDING_PAYMENT';
      const updated = await tx.checkoutSession.update({ where: { id: current.id }, data: { paymentStatus } });
      return { session: updated, created: null };
    }
    if (!current.readyAt) throw new Error('Paid checkout missing confirmed contact details');
    const snapshot = JSON.parse(current.snapshotJson) as Snapshot;
    checkoutContactSchema.parse(snapshot);
    const paidAt = new Date();
    const orderNumber = `EC-${randomUUID()}`;
    const tracking = assignTrackingFields(orderNumber, snapshot.shippingMethod ?? 'standard', snapshot.country, paidAt);
    const lines = JSON.parse(snapshot.itemsJson) as Array<{ slug: string; quantity: number }>;
    const quantities = new Map<string, number>();
    for (const item of lines) quantities.set(item.slug, (quantities.get(item.slug) ?? 0) + item.quantity);
    const items = Array.from(quantities, ([slug, quantity]) => ({ slug, quantity }));
    // If stock changed during an asynchronous payment, retain the paid order for
    // manual fulfilment rather than losing a successful charge or going negative.
    let stockAvailable = true;
    const finite: typeof items = [];
    for (const item of items) {
      if ((await getProduct(item.slug))?.stockUnlimited) continue;
      finite.push(item);
    }
    // Lock inventory in a consistent order before checking and decrementing.
    for (const item of [...finite].sort((a, b) => a.slug.localeCompare(b.slug))) {
      await tx.$queryRaw`SELECT id FROM "Product" WHERE slug = ${item.slug} FOR UPDATE`;
      const product = await tx.product.findUnique({ where: { slug: item.slug } });
      if (!product || product.stock < item.quantity) stockAvailable = false;
    }
    if (stockAvailable) {
      for (const item of finite) await tx.product.update({ where: { slug: item.slug }, data: { stock: { decrement: item.quantity } } });
    }
    const order = await tx.order.create({ data: {
      ...snapshot, orderNumber, accessToken: current.accessToken, status: stockAvailable ? 'CONFIRMED' : 'ON_HOLD',
      paymentStatus: 'PAID', paymentProvider: 'xpayments_stripe', paymentIntentId: intent.id,
      paymentMethodType: intent.paymentMethodType, paidAt, stockApplied: stockAvailable,
      ...(stockAvailable ? tracking : {}),
      payments: { create: {
        provider: 'xpayments_stripe', providerAccount: intent.xpaymentsTransactionId ?? current.providerAccount,
        paymentIntentId: intent.id, amount: snapshot.total, amountMinor: current.amountMinor,
        currency: current.currency, status: 'SUCCEEDED', paidAt, paymentMethodType: intent.paymentMethodType,
      } },
    } });
    const updated = await tx.checkoutSession.update({ where: { id: current.id }, data: { orderId: order.id, paymentStatus: 'PAID' } });
    return { session: updated, created: order };
  });
  if (result.created) {
    const order = result.created;
    await sendPaymentConfirmedEmail({ orderNumber: order.orderNumber, customerEmail: order.email,
      firstName: order.firstName, total: order.total, currency: order.currency,
      trackingNumber: order.trackingNumber ?? '', originWarehouse: order.originWarehouse ?? '',
    }).catch(() => console.error('Paid checkout confirmation email failed'));
    await sendUtmifyOrder(order, 'paid', result.session.trackingJson ? JSON.parse(result.session.trackingJson) : null)
      .catch(() => console.error('Paid checkout tracking failed'));
  }
  return result.session;
}
