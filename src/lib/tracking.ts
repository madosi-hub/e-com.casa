// Internal fulfilment timeline used until a production carrier integration replaces it.
// Tracking is created only for verified paid orders and status progression is monotonic.

import { createHash } from 'crypto';
import { db } from '@/lib/db';
import { warehouseForCountry, getWarehouseById, COMPANY } from '@/lib/company';
import { COUNTRIES } from '@/lib/countries';

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

const T_OFFSETS = {
  confirmed: 0,
  processing: 4,
  shippedStandard: 24,
  shippedExpress: 12,
  inTransit: 6,
  outForDeliveryStandard: 48,
  outForDeliveryExpress: 24,
  deliveredStandard: 72,
  deliveredExpress: 36,
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
  const express = shippingMethod === 'express';
  const shippedOffset = express ? T_OFFSETS.shippedExpress : T_OFFSETS.shippedStandard;
  const deliveredOffset = shippedOffset + (express ? T_OFFSETS.deliveredExpress : T_OFFSETS.deliveredStandard);
  return {
    trackingNumber: generateTrackingNumber(orderNumber, paidAt),
    carrier: FULFILMENT_CARRIER,
    originWarehouse: warehouseForCountry(countryIso2).id,
    estimatedDeliveryAt: new Date(paidAt.getTime() + deliveredOffset * HOUR),
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
  const express = input.shippingMethod === 'express';
  const shippedOffset = express ? T_OFFSETS.shippedExpress : T_OFFSETS.shippedStandard;
  const outOffset = express ? T_OFFSETS.outForDeliveryExpress : T_OFFSETS.outForDeliveryStandard;
  const deliveredOffset = express ? T_OFFSETS.deliveredExpress : T_OFFSETS.deliveredStandard;

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
      occurredAt: at(shippedOffset),
    },
    {
      status: 'IN_TRANSIT',
      description: 'In transit through the carrier line-haul network towards your country.',
      location: 'Line-haul network, EU',
      occurredAt: at(shippedOffset + T_OFFSETS.inTransit),
    },
    {
      status: 'OUT_FOR_DELIVERY',
      description: 'Out for delivery with the local courier.',
      location: destination,
      occurredAt: at(shippedOffset + outOffset),
    },
    {
      status: 'DELIVERED',
      description: 'Delivered — we hope you enjoy your new pieces.',
      location: destination,
      occurredAt: at(shippedOffset + deliveredOffset),
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
  for (const event of due) {
    await db.trackingEvent.upsert({
      where: { orderId_status: { orderId: order.id, status: event.status } },
      create: {
        orderId: order.id,
        status: event.status,
        description: event.description,
        location: event.location,
        occurredAt: event.occurredAt,
      },
      update: {},
    });
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

  return { order: updated, timeline, currentState, cancelled: false };
}

/** Persist a cancelled fulfilment event once. */
export async function ensureCancelledEvent(orderId: string, at: Date = new Date()): Promise<void> {
  await db.trackingEvent.upsert({
    where: { orderId_status: { orderId, status: 'CANCELLED' } },
    create: {
      orderId,
      status: 'CANCELLED',
      description: 'Order cancelled — no further fulfilment steps will occur.',
      location: null,
      occurredAt: at,
    },
    update: {},
  });
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
