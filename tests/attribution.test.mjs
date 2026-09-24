import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import { createRequire } from 'node:module';
import { createHmac } from 'node:crypto';
const runtimeRequire = createRequire(import.meta.url);
function load(path, mocks = {}, globals = {}) {
  const code = ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const compiled = { exports: {} };
  new Function('require', 'module', 'exports', ...Object.keys(globals), code)(
    id => id in mocks ? mocks[id] : runtimeRequire(id), compiled, compiled.exports, ...Object.values(globals),
  );
  return compiled.exports;
}
function browser(blocked = false) {
  const storage = () => {
    const data = new Map();
    return { getItem: k => data.get(k), setItem: (k, v) => { if (blocked) throw Error('blocked'); data.set(k, v); }, removeItem: k => data.delete(k) };
  };
  const window = { location: new URL('https://example.test/offers/nuralta-painel-ripado?utm_source=FB&utm_campaign=Camp%7C123&utm_medium=Set%7C456&utm_content=Ad%7C789&src=original&sck=click-1'), localStorage: storage(), sessionStorage: storage() };
  const globals = { window, document: { referrer: '' } };
  return { window, globals, module: load('src/lib/offers/attribution.ts', {}, globals) };
}
for (const blocked of [false, true]) {
  test(`offer → checkout → reload preserves exact campaign identifiers (storage blocked: ${blocked})`, () => {
    const b = browser(blocked);
    const expected = b.module.offerTrackingParameters('nuralta-painel-ripado');
    b.window.location = new URL('https://example.test/offers/nuralta-painel-ripado/informacao/envios');
    assert.deepEqual(b.module.offerTrackingParameters('nuralta-painel-ripado'), expected);
    const path = b.module.withOfferAttribution('/offers/nuralta-painel-ripado/checkout', 'nuralta-painel-ripado');
    b.window.location = new URL(path, 'https://example.test');
    const reloaded = load('src/lib/offers/attribution.ts', {}, b.globals);
    assert.deepEqual(reloaded.offerTrackingParameters('nuralta-painel-ripado'), expected);
    assert.equal(expected.src, 'original');
    assert.equal(expected.sck, 'click-1');
    assert.equal(expected.utm_campaign, 'Camp|123');
  });
}
test('a new campaign does not inherit previous ad identifiers', () => {
  const b = browser();
  b.module.captureOfferAttribution('offer');
  b.window.location = new URL('https://example.test/offers/offer?utm_source=FB&utm_campaign=New%7C999');
  const result = b.module.offerTrackingParameters('offer');
  assert.equal(result.utm_campaign, 'New|999');
  assert.equal(result.utm_content, null);
  assert.equal(result.sck, null);
});
for (const providerFails of [false, true]) {
test(`signed webhook preserves metadata or allows retry before applying payment (provider fails: ${providerFails})`, async () => {
  let applied;
  let retrieved = false;
  let removed = false;
  const route = load('src/app/api/webhooks/xpayments/route.ts', {
    'next/server': { NextResponse: Response },
    '@/lib/db': { db: { webhookEvent: { create: async () => ({}), delete: async () => { removed = true; } }, payment: { findFirst: async () => ({ orderId: 'order', paymentIntentId: 'pi_fixture', order: { currency: 'EUR', total: '25.00' } }) } } },
    '@/lib/payments/payments-config': { getPaymentConfig: () => ({ webhookSecret: 'test-secret' }) },
    '@/lib/payments/xpayments-provider': { getPaymentProvider: () => ({ retrievePaymentIntent: async () => { retrieved = true; if (providerFails) throw Error('gateway unavailable'); return { id: 'pi_fixture', raw: { metadata: { tracking_utm_campaign: 'Camp|123', tracking_sck: 'click-1' } } }; } }) },
    '@/lib/payments/reconcile-payment': { applyProviderIntent: async (_, intent) => { assert.equal(retrieved, true); applied = intent; return { paymentStatus: 'PAID' }; } },
    '@/lib/payments/amounts': { toMinorUnit: () => 2500 },
  }, { console: { error() {} } });
  const body = JSON.stringify({ event: 'payment_intent.succeeded', status: 'succeeded', transaction_id: 'tx_fixture', amount: 2500, currency: 'eur' });
  const signature = createHmac('sha256', 'test-secret').update(body).digest('hex');
  const response = await route.POST(new Request('https://example.test/api/webhooks/xpayments', { method: 'POST', body, headers: { 'x-nexflowx-signature': signature } }));
  assert.equal(response.status, providerFails ? 500 : 200);
  if (providerFails) {
    assert.equal(applied, undefined);
    assert.equal(removed, true);
    return;
  }
  assert.equal(applied.raw.metadata.tracking_utm_campaign, 'Camp|123');
  assert.equal(applied.raw.metadata.tracking_sck, 'click-1');
});
}
test('UTMify retries transient failures with the same order and attribution', async () => {
  const payloads = [];
  const api = load('src/lib/utmify.ts', { 'server-only': {} }, {
    fetch: async (_, options) => { payloads.push(JSON.parse(options.body)); return new Response('', { status: payloads.length < 3 ? 503 : 200 }); },
    setTimeout: resolve => resolve(), console: { error() {} },
  });
  await api.sendUtmifyOrder({ orderNumber: 'test', email: 'test@example.test', firstName: 'Test', lastName: 'Buyer', total: '25', itemsJson: '[]', currency: 'EUR' }, 'paid', { utm_campaign: 'Camp|123', sck: 'click-1' });
  assert.equal(payloads.length, 3);
  assert.deepEqual(payloads[0], payloads[2]);
  assert.equal(payloads[2].trackingParameters.utm_campaign, 'Camp|123');
});
