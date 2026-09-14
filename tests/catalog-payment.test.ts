import { expect, test, mock } from 'bun:test';
mock.module('server-only', () => ({}));
let paid = false;
let applied = false;
const debits: unknown[] = [];
let emails = 0;
const order = { id: 'order', total: '20.00', currency: 'EUR', orderNumber: 'TEST', shippingMethod: 'standard', country: 'PT', email: 'test@example.invalid', firstName: 'Test', paymentStatus: 'PENDING', paidAt: null, itemsJson: JSON.stringify([{ slug: 'made', quantity: 1000 }, { slug: 'finite', quantity: 2 }]), payments: [{ id: 'payment', paymentIntentId: 'intent' }] };
const tx = {
  payment: { update: async () => ({}) },
  order: { updateMany: async ({ where }: any) => {
    if ('stockApplied' in where) { const count = applied ? 0 : 1; applied = true; return { count }; }
    const count = paid ? 0 : 1; paid = true; return { count };
  } },
  product: { updateMany: async (args: unknown) => { debits.push(args); return { count: 1 }; } },
};
mock.module('@/lib/db', () => ({ db: { order: { findUnique: async () => order }, $transaction: async (fn: any) => fn(tx) } }));
mock.module('@/lib/catalog', () => ({ getProduct: async (slug: string) => ({ slug, stockUnlimited: slug === 'made' }) }));
mock.module('@/lib/tracking', () => ({ assignTrackingFields: () => ({}) }));
mock.module('@/lib/email/order-email', () => ({ sendPaymentConfirmedEmail: async () => { emails++; } }));
mock.module('@/lib/payments/xpayments-provider', () => ({ getPaymentProvider: () => ({}) }));
const { applyProviderIntent } = await import('../src/lib/payments/reconcile-payment');
test('payment replay skips unlimited stock and debits finite stock only once', async () => {
  const intent = { id: 'intent', status: 'SUCCEEDED', amountMinor: 2000, currency: 'EUR' } as any;
  expect((await applyProviderIntent('order', intent)).changed).toBe(true);
  expect((await applyProviderIntent('order', intent)).changed).toBe(false);
  expect(debits).toHaveLength(1);
  expect(debits[0]).toEqual({ where: { slug: 'finite', stock: { gte: 2 } }, data: { stock: { decrement: 2 } } });
  expect(emails).toBe(1);
});
