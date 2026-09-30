import { expect, mock, test } from 'bun:test';

mock.module('server-only', () => ({}));

const { assignTrackingFields, buildTimeline } = await import('../src/lib/tracking');

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const paidAt = new Date('2026-09-29T12:00:00.000Z');

test('uses the ten-day post-purchase fulfilment schedule', () => {
  const timeline = buildTimeline({
    paidAt,
    shippingMethod: 'standard',
    countryIso2: 'PT',
    destinationCity: 'Lisboa',
    carrier: 'Fixture Carrier',
  });

  const offsetFor = (status: string) => {
    const event = timeline.find((candidate) => candidate.status === status);
    expect(event).toBeDefined();
    return event!.occurredAt.getTime() - paidAt.getTime();
  };

  expect(offsetFor('CONFIRMED')).toBe(0);
  expect(offsetFor('PROCESSING')).toBe(0);
  expect(offsetFor('SHIPPED')).toBe(4 * DAY);
  expect(offsetFor('IN_TRANSIT')).toBe(7 * DAY);
  expect(offsetFor('OUT_FOR_DELIVERY')).toBe(9 * DAY);
  expect(offsetFor('DELIVERED')).toBe(10 * DAY);
});

test('uses the same approved schedule for express and standard orders', () => {
  const standard = assignTrackingFields('EC-STANDARD', 'standard', 'PT', paidAt);
  const express = assignTrackingFields('EC-EXPRESS', 'express', 'PT', paidAt);

  expect(standard.estimatedDeliveryAt.getTime() - paidAt.getTime()).toBe(10 * DAY);
  expect(express.estimatedDeliveryAt.getTime() - paidAt.getTime()).toBe(10 * DAY);
});
