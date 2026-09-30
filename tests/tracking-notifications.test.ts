import { beforeEach, expect, mock, test } from 'bun:test';

const eventKeys = new Set<string>();
const notifications: string[] = [];

const baseOrder = {
  id: 'order-1',
  orderNumber: 'EC-TRACK',
  email: 'buyer@example.test',
  firstName: 'Buyer',
  total: '100.00',
  currency: 'EUR',
  itemsJson: JSON.stringify([{ slug: 'nuralta-painel-ripado-decorativo', name: 'Painel', quantity: 1 }]),
  status: 'CONFIRMED',
  paymentStatus: 'PAID',
  shippingMethod: 'standard',
  country: 'PT',
  city: 'Lisboa',
  paidAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
  createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
  trackingNumber: 'ECC-2609-ABC234',
  carrier: 'Fixture Carrier',
  originWarehouse: 'zaragoza',
  estimatedDeliveryAt: new Date(),
};

mock.module('server-only', () => ({}));
mock.module('@/lib/email/order-email', () => ({
  sendOrderStatusEmail: async (input: { status: string }) => { notifications.push(input.status); return true; },
}));
mock.module('@/lib/db', () => ({
  db: {
    trackingEvent: {
      create: async ({ data }: { data: { orderId: string; status: string } }) => {
        const key = `${data.orderId}:${data.status}`;
        if (eventKeys.has(key)) throw { code: 'P2002' };
        eventKeys.add(key);
        return data;
      },
    },
    order: {
      update: async ({ data }: { data: { status?: string } }) => ({ ...baseOrder, ...data }),
      findUnique: async () => baseOrder,
    },
  },
}));

const { ensureCancelledEvent, ensureTracking } = await import('../src/lib/tracking');

beforeEach(() => {
  eventKeys.clear();
  notifications.length = 0;
});

test('materialises an overdue timeline but sends only its latest status once', async () => {
  await ensureTracking({ ...baseOrder });
  expect(eventKeys.size).toBe(6);
  expect(notifications).toEqual(['DELIVERED']);

  await ensureTracking({ ...baseOrder });
  expect(notifications).toEqual(['DELIVERED']);
});

test('sends cancellation only when its unique tracking event is first created', async () => {
  await ensureCancelledEvent(baseOrder.id);
  await ensureCancelledEvent(baseOrder.id);
  expect(notifications).toEqual(['CANCELLED']);
});
