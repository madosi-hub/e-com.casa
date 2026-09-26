import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import { createRequire } from 'node:module';
const runtimeRequire = createRequire(import.meta.url);

// Load production TypeScript with explicit I/O doubles. Never contact a live
// database, gateway, mail or analytics service from these tests.
function load(path, mocks = {}) {
  const code = ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const compiled = { exports: {} };
  new Function('require', 'module', 'exports', code)(id => id in mocks ? mocks[id] : runtimeRequire(id), compiled, compiled.exports);
  return compiled.exports;
}

const checkout = load('src/lib/checkout.ts', Object.fromEntries([
  './catalog/bundle', '@/lib/catalog', '@/lib/catalog/inventory', '@/lib/catalog/saleability',
  '@/lib/shipping', '@/lib/constants', '@/lib/countries',
].map(id => [id, {}])));
const visibility = load('src/lib/order-visibility.ts');
const contact = { email: 'buyer@example.test', firstName: 'Buyer', lastName: 'Test', address: 'Street 1', city: 'Lisboa', postalCode: '1000-001' };

function routeFixture(initial) {
  let record = initial;
  let updates = 0;
  const db = {
    order: {
      findUnique: async () => record ?? null,
      findUniqueOrThrow: async () => record,
      create: async ({ data }) => (record = { id: 'draft', paidAt: null, ...data }),
      updateMany: async ({ where, data }) => {
        assert.equal(where.paidAt, null);
        updates++;
        record = { ...record, ...data };
        return { count: 1 };
      },
    },
    payment: { findUnique: async () => null },
  };
  const route = load('src/app/api/checkout/create/route.ts', {
    'next/server': { NextResponse: Response, after: fn => fn() }, '@/lib/db': { db },
    '@/lib/rate-limit': { rateLimit: () => ({ ok: true }) },
    '@/lib/checkout': { ...checkout, repriceCart: async () => ({ subtotal: 25, shipping: 0, discount: 0, total: 25, lineItems: [], country: 'PT', currency: 'EUR', pricingHash: 'server-price' }) },
    '@/lib/payments/payment-capabilities': { resolvePaymentCurrency: () => ({ supported: true }) },
    '@/lib/constants': { ORDER_NOTES_MAX: 500 },
  });
  const post = body => route.POST(new Request('https://example.test/api/checkout/create', { method: 'POST', body: JSON.stringify({
    checkoutToken: 'random-checkout-token', country: 'PT', shippingMethod: 'standard', items: [{ slug: 'panel', quantity: 1 }], ...body,
  }) }));
  return { post, record: () => record, updates: () => updates };
}

test('prepares a server-priced internal draft with empty contact, without a migration', async () => {
  const f = routeFixture();
  const response = await f.post({ draft: true, total: '0.01' });
  assert.equal(response.status, 201);
  assert.equal(f.record().email, ''); assert.equal(f.record().firstName, '');
  assert.equal(f.record().total, '25.00'); assert.equal(f.record().status, 'CHECKOUT_DRAFT');
  assert.equal(visibility.isPlacedOrder(f.record()), false);
});

test('cannot submit payment details with empty or fictitious contact', async () => {
  const f = routeFixture();
  assert.equal((await f.post({ draft: false })).status, 400);
  assert.equal((await f.post({ ...contact, email: 'checkout@e-com.casa' })).status, 400);
  assert.equal((await f.post({ ...contact, address: '' })).status, 400);
  assert.equal(f.record(), undefined);
});

test('real contact updates the same draft without making it a placed order', async () => {
  const f = routeFixture();
  const initial = await (await f.post({ draft: true })).json();
  const submitted = await f.post(contact);
  assert.equal(submitted.status, 200);
  assert.equal((await submitted.json()).orderNumber, initial.orderNumber);
  assert.equal(f.record().email, contact.email);
  assert.equal(f.record().paymentStatus, 'PENDING_PAYMENT');
  assert.equal(visibility.isPlacedOrder(f.record()), false);
});

for (const state of ['PAID', 'PAYMENT_PROCESSING', 'REFUNDED']) {
  test(`does not reset an existing ${state} checkout on resubmission`, async () => {
    const f = routeFixture({ id: 'existing', paymentStatus: state, paidAt: state === 'PAID' ? new Date() : null });
    assert.equal((await f.post(contact)).status, 409);
    assert.equal(f.updates(), 0);
  });
}

test('pending, processing and failed attempts are hidden; paid/refunded orders remain visible', () => {
  for (const paymentStatus of ['PENDING_PAYMENT', 'PAYMENT_PROCESSING', 'PAYMENT_FAILED', 'CANCELLED']) {
    assert.equal(visibility.isPlacedOrder({ paymentStatus, paidAt: null }), false);
  }
  for (const paymentStatus of ['PAID', 'REFUNDED', 'PARTIALLY_REFUNDED']) {
    assert.equal(visibility.isPlacedOrder({ paymentStatus, paidAt: null }), true);
  }
  assert.equal(visibility.isPlacedOrder({ paymentStatus: 'CANCELLED', paidAt: new Date() }), true);
});

test('provider omits missing/legacy fictitious receipt email and keeps real email', async () => {
  const errors = load('src/lib/payments/payment-errors.ts');
  const { XPaymentsStripeProvider } = load('src/lib/payments/xpayments-provider.ts', {
    'server-only': {}, './payments-config': {}, './payment-errors': errors,
  });
  const provider = new XPaymentsStripeProvider({ secretKey: 'test', apiBaseUrl: 'https://example.test', environment: 'test' });
  const originalFetch = globalThis.fetch;
  let fields;
  globalThis.fetch = async (_, options) => {
    fields = new URLSearchParams(options.body);
    return Response.json({ id: 'pi_test', status: 'requires_payment_method', amount: 2500, currency: 'eur' });
  };
  try {
    for (const customerEmail of [undefined, '', 'checkout@e-com.casa', contact.email]) {
      await provider.createPaymentIntent({ amountMinor: 2500, currency: 'EUR', orderNumber: 'EC-test', customerCountry: 'PT', idempotencyKey: 'stable', customerEmail });
      assert.equal(fields.get('receipt_email'), customerEmail === contact.email ? contact.email : null);
      assert.equal(fields.get('amount'), '2500');
    }
  } finally { globalThis.fetch = originalFetch; }
});

test('order history endpoint denies unpaid drafts even with a valid access token', async () => {
  const route = load('src/app/api/orders/route.ts', {
    'next/server': { NextResponse: Response }, '@/lib/db': { db: { order: { findUnique: async () => ({ paymentStatus: 'PENDING_PAYMENT', accessToken: 'secret' }) } } },
    '@/lib/order-visibility': visibility, '@/lib/rate-limit': { rateLimit: () => ({ ok: true }) },
    '@/lib/checkout': checkout, '@/lib/tracking': { ensureTracking: () => { throw new Error('Draft must not enter fulfilment'); } },
  });
  assert.equal((await route.GET(new Request('https://example.test/api/orders?order=EC-test&token=secret'))).status, 404);
});

test('verified success promotes the same complete draft once; incomplete contact stays hidden', async () => {
  let order = { id: 'draft', orderNumber: 'EC-test', status: 'CHECKOUT_DRAFT', paymentStatus: 'PENDING_PAYMENT',
    paidAt: null, stockApplied: false, total: '25.00', currency: 'EUR', country: 'PT', shippingMethod: 'standard',
    ...contact, email: '', itemsJson: '[]', payments: [{ id: 'payment', paymentIntentId: 'pi_test' }],
  };
  let confirmations = 0;
  const tx = {
    payment: { update: async () => ({}) },
    order: { updateMany: async ({ where, data }) => {
      if (where.stockApplied === false && order.stockApplied) return { count: 0 };
      if (where.paymentStatus?.not === order.paymentStatus) return { count: 0 };
      order = { ...order, ...data };
      return { count: 1 };
    } },
  };
  const service = load('src/lib/payments/reconcile-payment.ts', {
    'server-only': {}, '@/lib/checkout': checkout,
    '@/lib/db': { db: { order: { findUnique: async () => ({ ...order }) }, $transaction: async fn => fn(tx) } },
    '@/lib/catalog': { getProduct: async () => ({ stockUnlimited: true }) },
    '@/lib/tracking': { assignTrackingFields: () => ({}) },
    '@/lib/email/order-email': { sendPaymentConfirmedEmail: async () => { confirmations++; } },
    '@/lib/payment-events': { sendPaymentPaidEvent: async () => ({ ok: true }) }, './xpayments-provider': {},
    './amounts': { toMinorUnit: value => Math.round(Number(value) * 100) },
  });
  const intent = { id: 'pi_test', status: 'SUCCEEDED', amountMinor: 2500, currency: 'EUR' };
  assert.equal((await service.applyProviderIntent('draft', intent)).reason, 'checkout_contact_missing');
  assert.equal(visibility.isPlacedOrder(order), false);
  order.email = contact.email;
  assert.equal((await service.applyProviderIntent('draft', intent)).changed, true);
  assert.equal(order.id, 'draft'); assert.equal(order.status, 'CONFIRMED');
  assert.equal(visibility.isPlacedOrder(order), true);
  assert.equal((await service.applyProviderIntent('draft', intent)).changed, false);
  assert.equal(confirmations, 1);
});
