// Internal fulfilment timeline used until a production carrier integration replaces it.
// Tracking is created only for verified paid orders and status progression is monotonic.

import { createHash } from 'crypto';
import { db } from '@/lib/db';
import { warehouseForCountry, getWarehouseById, COMPANY } from '@/lib/company';
import { COUNTRIES } from '@/lib/countries';
import { sendOrderStatusEmail, type OrderNotificationStatus } from '@/lib/email/order-email';

export const TRACKING_STATES = [
  'CONFIRMED',
  'PROCESSING',
  'SHIPPED',
  'IN_TRANSIT',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
] as const;

export type TrackingState = (typeof TRACKING_STATES)[number];

const STATE_RANK: Record<string, number> = {
  PENDING: 0,
  CONFIRMED: 1,
  PROCESSING: 2,
  SHIPPED: 3,
  IN_TRANSIT: 4,
  OUT_FOR_DELIVERY: 5,
  DELIVERED: 6,
  CANCELLED: 0,
};

const HOUR = 3_600_000;
const DAY_IN_HOURS = 24;

const T_OFFSETS = {
  confirmed: 0,
  processing: 0,
  shipped: 4 * DAY_IN_HOURS,
  inTransit: 7 * DAY_IN_HOURS,
  outForDelivery: 9 * DAY_IN_HOURS,
  delivered: 10 * DAY_IN_HOURS,
} as const;

const TRACKING_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Generate a deterministic buyer-facing tracking number for an order. */
export function generateTrackingNumber(orderNumber: string, at: Date = new Date()): string {
  const hash = createHash('sha256').update(`ecom-3pl-tracking:${orderNumber}`).digest('hex');
  let code = '';
  for (let i = 0; i < 6; i += 1) {
    code += TRACKING_ALPHABET[parseInt(hash.slice(i * 2, i * 2 + 2), 16) % TRACKING_ALPHABET.length];
  }
  const yy = String(at.getFullYear()).slice(-2);
  const mm = String(at.getMonth() + 1).padStart(2, '0');
  return `ECC-${yy}${mm}-${code}`;
}

/** Normalize buyer-entered tracking codes before lookup. */
export function normaliseTrackingCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, '');
}

export function isTrackingCode(code: string): boolean {
  return /^ECC-\d{4}-[A-HJ-NP-Z2-9]{6}$/.test(code);
}

export const FULFILMENT_CARRIER = '3PL EU Logistics Partner';

export interface TrackingFields {
  trackingNumber: string;
  carrier: string;
  originWarehouse: string;
  estimatedDeliveryAt: Date;
}

/** Assign the initial tracking fields when payment is verified. */
export function assignTrackingFields(
  orderNumber: string,
  shippingMethod: string,
  countryIso2: string,
  paidAt: Date = new Date(),
): TrackingFields {
  void shippingMethod;
  return {
    trackingNumber: generateTrackingNumber(orderNumber, paidAt),
    carrier: FULFILMENT_CARRIER,
    originWarehouse: warehouseForCountry(countryIso2).id,
    estimatedDeliveryAt: new Date(paidAt.getTime() + T_OFFSETS.delivered * HOUR),
  };
}

export function countryName(iso2: string): string {
  const country = COUNTRIES.find((entry) => entry.code === iso2.toUpperCase());
  return country?.name ?? iso2.toUpperCase();
}

export interface ComputedEvent {
  status: TrackingState;
  description: string;
  location: string | null;
  occurredAt: Date;
}

export function buildTimeline(input: {
  paidAt: Date;
  shippingMethod: string;
  countryIso2: string;
  destinationCity: string;
  carrier: string;
}): ComputedEvent[] {
  void input.shippingMethod;

  const warehouse = warehouseForCountry(input.countryIso2);
  const origin = `${warehouse.name}, ${warehouse.city}`;
  const destination = `${input.destinationCity || countryName(input.countryIso2)}, ${countryName(input.countryIso2)}`;
  const at = (hours: number) => new Date(input.paidAt.getTime() + hours * HOUR);

  return [
    {
      status: 'CONFIRMED',
      description: 'Order confirmed — payment verified successfully.',
      location: null,
      occurredAt: at(T_OFFSETS.confirmed),
    },
    {
      status: 'PROCESSING',
      description: 'Your order is being picked and packed at our fulfilment warehouse.',
      location: origin,
      occurredAt: at(T_OFFSETS.processing),
    },
    {
      status: 'SHIPPED',
      description: `Parcel handed over to ${input.carrier} and on its way to you.`,
      location: origin,
      occurredAt: at(T_OFFSETS.shipped),
    },
    {
      status: 'IN_TRANSIT',
      description: 'In transit through the carrier line-haul network towards your country.',
      location: 'Line-haul network, EU',
      occurredAt: at(T_OFFSETS.inTransit),
    },
    {
      status: 'OUT_FOR_DELIVERY',
      description: 'Out for delivery with the local courier.',
      location: destination,
      occurredAt: at(T_OFFSETS.outForDelivery),
    },
    {
      status: 'DELIVERED',
      description: 'Delivered — we hope you enjoy your new pieces.',
      location: destination,
      occurredAt: at(T_OFFSETS.delivered),
    },
  ];
}

export function computeCurrentState(events: ComputedEvent[], now: Date = new Date()): TrackingState {
  let current: TrackingState = 'CONFIRMED';
  for (const event of events) {
    if (event.occurredAt.getTime() <= now.getTime()) current = event.status;
  }
  return current;
}

export interface TrackableOrder {
  id: string;
  orderNumber: string;
  email: string;
  firstName: string;
  total: string;
  currency: string;
  itemsJson: string;
  status: string;
  paymentStatus: string;
  shippingMethod: string;
  country: string;
  city: string;
  paidAt: Date | null;
  createdAt: Date;
  trackingNumber: string | null;
  carrier: string | null;
  originWarehouse: string | null;
  estimatedDeliveryAt: Date | null;
}

const NOTIFIABLE_TRACKING_STATES = new Set<OrderNotificationStatus>([
  'SHIPPED',
  'IN_TRANSIT',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
]);

function isNotifiableStatus(status: string): status is OrderNotificationStatus {
  return NOTIFIABLE_TRACKING_STATES.has(status as OrderNotificationStatus);
}

async function createTrackingEvent(input: {
  orderId: string;
  status: string;
  description: string;
  location: string | null;
  occurredAt: Date;
}): Promise<boolean> {
  try {
    await db.trackingEvent.create({ data: input });
    return true;
  } catch (error) {
    if ((error as { code?: string }).code === 'P2002') return false;
    throw error;
  }
}

async function notifyTrackingStatus(order: TrackableOrder, status: OrderNotificationStatus): Promise<void> {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(order.email.trim())) return;
  await sendOrderStatusEmail({
    status,
    orderNumber: order.orderNumber,
    customerEmail: order.email,
    firstName: order.firstName,
    total: order.total,
    currency: order.currency,
    itemsJson: order.itemsJson,
    trackingNumber: order.trackingNumber,
    originWarehouse: order.originWarehouse,
  }).catch((error) => {
    console.error('order status email failed', {
      orderNumber: order.orderNumber,
      status,
      error: error instanceof Error ? error.message : 'unknown',
    });
  });
}

/** Ensure tracking fields, due events and fulfilment status are synchronized for a paid order. */
export async function ensureTracking<T extends TrackableOrder>(order: T): Promise<{
  order: T;
  timeline: ComputedEvent[];
  currentState: TrackingState;
  cancelled: boolean;
}> {
  if (order.paymentStatus !== 'PAID') {
    return { order, timeline: [], currentState: 'CONFIRMED', cancelled: false };
  }

  const now = new Date();
  const paidAt = order.paidAt ?? order.createdAt;
  let working = order;

  if (!order.trackingNumber || !order.carrier || !order.originWarehouse || !order.estimatedDeliveryAt) {
    const fields = assignTrackingFields(order.orderNumber, order.shippingMethod, order.country, paidAt);
    await db.order.update({
      where: { id: order.id },
      data: {
        trackingNumber: fields.trackingNumber,
        carrier: fields.carrier,
        originWarehouse: fields.originWarehouse,
        estimatedDeliveryAt: fields.estimatedDeliveryAt,
      },
    });
    working = { ...order, ...fields } as T;
  }

  const timeline = buildTimeline({
    paidAt,
    shippingMethod: working.shippingMethod,
    countryIso2: working.country,
    destinationCity: working.city,
    carrier: working.carrier ?? FULFILMENT_CARRIER,
  });

  const due = timeline.filter((event) => event.occurredAt.getTime() <= now.getTime());
  const newlyCreated: ComputedEvent[] = [];
  for (const event of due) {
    const created = await createTrackingEvent({
      orderId: order.id,
      status: event.status,
      description: event.description,
      location: event.location,
      occurredAt: event.occurredAt,
    });
    if (created) newlyCreated.push(event);
  }

  const currentState = computeCurrentState(timeline, now);
  let updated = working;
  if ((STATE_RANK[currentState] ?? 0) > (STATE_RANK[working.status] ?? 0)) {
    const dbOrder = await db.order.update({
      where: { id: order.id },
      data: { status: currentState },
    });
    updated = { ...working, status: dbOrder.status } as T;
  }

  // A legacy/overdue order can materialise several events in one run. Persist
  // the complete timeline, but notify only the newest buyer-relevant state.
  const latestNotification = newlyCreated.filter((event) => isNotifiableStatus(event.status)).at(-1);
  if (latestNotification && isNotifiableStatus(latestNotification.status)) {
    await notifyTrackingStatus(updated, latestNotification.status);
  }

  return { order: updated, timeline, currentState, cancelled: false };
}

/** Persist a cancelled fulfilment event once. */
export async function ensureCancelledEvent(orderId: string, at: Date = new Date()): Promise<void> {
  const created = await createTrackingEvent({
    orderId,
    status: 'CANCELLED',
    description: 'Order cancelled — no further fulfilment steps will occur.',
    location: null,
    occurredAt: at,
  });
  if (!created) return;
  const order = await db.order.findUnique({ where: { id: orderId } });
  if (order) await notifyTrackingStatus(order, 'CANCELLED');
}

/** Persist a manually selected fulfilment state and notify it at most once. */
export async function recordManualTrackingEvent(orderId: string, status: TrackingState, at: Date = new Date()): Promise<void> {
  const description = status === 'DELIVERED'
    ? 'Delivered — confirmed by commerce operations.'
    : `Fulfilment status updated to ${status.toLowerCase().replaceAll('_', ' ')} by commerce operations.`;
  const created = await createTrackingEvent({ orderId, status, description, location: null, occurredAt: at });
  if (!created || !isNotifiableStatus(status)) return;
  const order = await db.order.findUnique({ where: { id: orderId } });
  if (order) await notifyTrackingStatus(order, status);
}

export function warehouseView(id: string | null | undefined) {
  const warehouse = getWarehouseById(id) ?? warehouseForCountry('NL');
  return {
    id: warehouse.id,
    name: warehouse.name,
    address: `${warehouse.streets}, ${warehouse.postalCode} ${warehouse.city}, ${warehouse.country}`,
    city: warehouse.city,
    country: warehouse.country,
  };
}

export function warehouseDisplayName(id: string | null | undefined): string {
  const warehouse = getWarehouseById(id) ?? warehouseForCountry('NL');
  return warehouse.name;
}

export const COMPANY_BRAND = COMPANY.brand;
