import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import { createRequire } from 'node:module';
const runtimeRequire = createRequire(import.meta.url);

// Exercise the actual service with an isolated database/provider. No live charges,
// email, analytics or database access occur in this suite.
function fixture(options = {}) {
  const contact = { email: 'buyer@example.test', firstName: 'Buyer', lastName: 'Test', address: 'Street 1', address2: null, city: 'Lisboa', postalCode: '1000-001', phone: null };
  const snapshot = { ...contact, country: 'PT', shippingMethod: 'standard', subtotal: '25.00', shipping: '0.00', tax: '0.00', discount: '0.00', total: '25.00', currency: 'EUR', itemsJson: JSON.stringify([{ slug: 'panel', quantity: 2 }]) };
  let session = { id: 'session', reference: 'CS-test', sessionKey: 'key', accessToken: 'private-token', amountMinor: 2500, currency: 'EUR', country: 'PT', snapshotJson: JSON.stringify(snapshot), trackingJson: null, paymentIntentId: 'pi_test', readyAt: new Date(), orderId: null, ...options.session };
  let intent = { id: 'pi_test', status: 'SUCCEEDED', amountMinor: 2500, currency: 'EUR', paymentMethodType: 'card', clientSecret: 'secret', ...options.intent };
  const orders = [], calls = [], notifications = [];
  let stock = options.stock ?? 10;
  const checkoutSession = {
    findUnique: async () => ({ ...session }), findUniqueOrThrow: async () => ({ ...session }),
    update: async ({ data }) => (session = { ...session, ...data }),
  };
  const tx = { checkoutSession, $executeRaw: async () => 0, $queryRaw: async () => [],
    product: { findUnique: async () => ({ stock }), update: async ({ data }) => { stock -= data.stock.decrement; } },
    order: { create: async ({ data }) => { const order = { id: 'order', ...data }; orders.push(order); return order; } },
  };
  let queue = Promise.resolve();
  const db = { checkoutSession, $transaction: fn => {
    const run = queue.then(() => fn(tx)); queue = run.catch(() => {}); return run;
  } };
  const mocks = {
    'server-only': {}, '@/lib/db': { db }, '@/lib/checkout': { tokenMatches: (a, b) => a === b },
    '@/lib/catalog': { getProduct: async () => ({ stockUnlimited: false }) },
    '@/lib/tracking': { assignTrackingFields: () => ({ trackingNumber: 'track', originWarehouse: 'PT' }) },
    '@/lib/email/order-email': { sendPaymentConfirmedEmail: async () => notifications.push('email') },
    '@/lib/utmify': { sendUtmifyOrder: async () => notifications.push('analytics') },
    './payments-config': { getPaymentConfig: () => ({ secretKey: 'test', publishableKey: 'test', environment: 'test' }) },
    './payment-capabilities': { resolvePaymentCapabilities: () => ({ methods: [] }) },
    './xpayments-provider': { getPaymentProvider: () => ({
      retrievePaymentIntent: async () => { if (options.providerError) throw new Error('Provider unavailable'); return intent; },
      createPaymentIntent: async input => { calls.push(input); return intent; },
    }) },
  };
  const source = fs.readFileSync('src/lib/payments/checkout-session.ts', 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const compiled = { exports: {} };
  new Function('require', 'module', 'exports', code)(id => id in mocks ? mocks[id] : runtimeRequire(id), compiled, compiled.exports);
  return { service: compiled.exports, contact, orders, calls, notifications, stock: () => stock, session: () => session };
}

for (const status of ['CREATED', 'REQUIRES_PAYMENT_METHOD', 'REQUIRES_ACTION', 'PROCESSING', 'FAILED', 'CANCELLED']) {
  test(`${status} never creates an order or debits stock`, async () => {
    const f = fixture({ intent: { status } });
    await f.service.refreshCheckoutPayment('CS-test');
    assert.equal(f.orders.length, 0); assert.equal(f.stock(), 10); assert.deepEqual(f.notifications, []);
  });
}

test('concurrent webhook/poll replay creates one paid order and applies stock once', async () => {
  const f = fixture();
  await Promise.all(Array.from({ length: 5 }, () => f.service.refreshCheckoutPayment('CS-test')));
  assert.equal(f.orders.length, 1); assert.equal(f.orders[0].paymentStatus, 'PAID');
  assert.equal(f.stock(), 8); assert.deepEqual(f.notifications, ['email', 'analytics']);
  assert.equal(f.session().orderId, 'order');
});

for (const intent of [{ amountMinor: 1 }, { currency: 'USD' }, { id: 'pi_other' }]) {
  test(`rejects mismatching provider ${Object.keys(intent)[0]}`, async () => {
    const f = fixture({ intent });
    await assert.rejects(f.service.refreshCheckoutPayment('CS-test'), /mismatch/);
    assert.equal(f.orders.length, 0);
  });
}

test('payment preparation needs no customer email and creates no order', async () => {
  const f = fixture({ session: { paymentIntentId: null, readyAt: null }, intent: { status: 'REQUIRES_PAYMENT_METHOD' } });
  await f.service.prepareCheckoutPayment('CS-test', 'private-token');
  assert.equal(f.calls.length, 1); assert.equal(f.calls[0].customerEmail, undefined);
  assert.equal(f.calls[0].amountMinor, 2500); assert.equal(f.orders.length, 0);
  await f.service.prepareCheckoutPayment('CS-test', 'private-token');
  assert.equal(f.calls.length, 1);
});

test('preparation and contact update reject invalid access tokens', async () => {
  const f = fixture();
  await assert.rejects(f.service.prepareCheckoutPayment('CS-test', 'wrong'));
  await assert.rejects(f.service.submitCheckoutContact('CS-test', 'wrong', f.contact));
  assert.equal(f.calls.length, 0); assert.equal(f.orders.length, 0);
});

test('contact submission validates and stores real details without an order', async () => {
  const f = fixture({ session: { readyAt: null } });
  await assert.rejects(f.service.submitCheckoutContact('CS-test', 'private-token', { ...f.contact, email: '' }));
  await f.service.submitCheckoutContact('CS-test', 'private-token', f.contact);
  assert.ok(f.session().readyAt); assert.equal(f.orders.length, 0);
  assert.equal(JSON.parse(f.session().snapshotJson).email, f.contact.email);
});

test('a paid intent without submitted contact is retained for investigation', async () => {
  const f = fixture({ session: { readyAt: null } });
  await assert.rejects(f.service.refreshCheckoutPayment('CS-test'), /contact/);
  assert.equal(f.orders.length, 0);
});

test('provider outage cannot create an order', async () => {
  const f = fixture({ providerError: true });
  await assert.rejects(f.service.refreshCheckoutPayment('CS-test'));
  assert.equal(f.orders.length, 0);
});

test('stock shortage retains the paid order on hold without negative inventory', async () => {
  const f = fixture({ stock: 1 });
  await f.service.refreshCheckoutPayment('CS-test');
  assert.equal(f.orders[0].paymentStatus, 'PAID'); assert.equal(f.orders[0].status, 'ON_HOLD');
  assert.equal(f.orders[0].stockApplied, false); assert.equal(f.stock(), 1);
});

test('checkout endpoint accepts an empty contact and persists only an idempotent session', async () => {
  let saved;
  const tx = { checkoutSession: {
    findUnique: async () => saved ?? null,
    create: async ({ data }) => (saved = { id: 'session', ...data }),
    update: async ({ data }) => (saved = { ...saved, ...data }),
  } };
  const mocks = {
    'next/server': { NextResponse: Response }, '@/lib/db': { db: {} },
    '@/lib/rate-limit': { rateLimit: () => ({ ok: true }) },
    '@/lib/checkout': {
      repriceCart: async () => ({ subtotal: 25, shipping: 0, discount: 0, total: 25, promoCode: null, lineItems: [], currency: 'EUR', country: 'PT', pricingHash: 'server-price' }),
      sanitizeNotes: () => null, newAccessToken: () => 'private-token', CheckoutValidationError: Error,
    },
    '@/lib/constants': { ORDER_NOTES_MAX: 500 },
    '@/lib/payments/payment-capabilities': { resolvePaymentCurrency: () => ({ supported: true }) },
    '@/lib/payments/checkout-session': { withCheckoutLock: async (_, fn) => fn(tx) },
    '@/lib/payments/amounts': { toMinorUnit: value => Math.round(Number(value) * 100) },
  };
  const source = fs.readFileSync('src/app/api/checkout/create/route.ts', 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const compiled = { exports: {} };
  new Function('require', 'module', 'exports', code)(id => id in mocks ? mocks[id] : runtimeRequire(id), compiled, compiled.exports);
  const request = () => new Request('https://example.test/api/checkout/create', { method: 'POST', body: JSON.stringify({
    checkoutToken: 'random-checkout-token', country: 'PT', shippingMethod: 'standard', items: [{ slug: 'panel', quantity: 1 }],
  }) });
  const first = await compiled.exports.POST(request());
  assert.equal(first.status, 200);
  const data = await first.json();
  assert.match(data.orderNumber, /^CS-/);
  assert.equal(saved.amountMinor, 2500);
  assert.equal(JSON.parse(saved.snapshotJson).email, '');
  assert.equal((await (await compiled.exports.POST(request())).json()).orderNumber, data.orderNumber);
});
