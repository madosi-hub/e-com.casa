import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import { createRequire } from 'node:module';

const runtimeRequire = createRequire(import.meta.url);
function load(path, mocks = {}, fetchMock) {
  const code = ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const compiled = { exports: {} };
  new Function('require', 'module', 'exports', 'fetch', code)(
    id => id in mocks ? mocks[id] : runtimeRequire(id), compiled, compiled.exports, fetchMock,
  );
  return compiled.exports;
}
const errors = load('src/lib/payments/payment-errors.ts');
const config = {
  environment: 'test', apiBaseUrl: 'https://api.xpayments.digital/api/stripe/v1/',
  secretKey: 'xp_test_fixture', publishableKey: 'pk_test_fixture',
  webhookSecret: null, storeId: 'store_fixture', stripeApiVersion: null,
};
const input = {
  amountMinor: 2500, currency: 'EUR', customerCountry: 'PT',
  orderNumber: 'ORDER-123', idempotencyKey: 'order-123-payment-1',
};
function provider(fetchMock) {
  const { XPaymentsStripeProvider } = load('src/lib/payments/xpayments-provider.ts', {
    'server-only': {}, './payments-config': {}, './payment-errors': errors,
  }, fetchMock);
  return new XPaymentsStripeProvider(config);
}

test('sends the XPayments form contract with nested tracking and stable retry headers', async () => {
  const requests = [];
  const p = provider(async (url, options) => {
    requests.push({ url, ...options });
    return Response.json({ id: 'pi_fixture', client_secret: 'fixture_secret', amount: 2500,
      currency: 'eur', status: 'requires_payment_method', metadata: { nexflowx_transaction_id: 'tx_fixture' } });
  });
  const payload = { ...input, metadata: { tracking_utm_source: 'facebook', tracking_utm_campaign: 'Casa & verão',
    amount: '1', merchant_reference: 'must-not-override-order' } };
  const result = await p.createPaymentIntent(payload);
  await p.createPaymentIntent(payload);
  assert.equal(result.xpaymentsTransactionId, 'tx_fixture');
  assert.equal(result.status, 'REQUIRES_PAYMENT_METHOD');
  assert.equal(requests[0].url, 'https://api.xpayments.digital/api/stripe/v1/payment_intents');
  assert.equal(requests[0].method, 'POST');
  assert.equal(requests[0].headers.Authorization, 'Bearer xp_test_fixture');
  assert.equal(requests[0].headers['Content-Type'], 'application/x-www-form-urlencoded');
  assert.equal(requests[0].headers['Idempotency-Key'], input.idempotencyKey);
  assert.equal(requests[1].headers['Idempotency-Key'], input.idempotencyKey);
  assert.equal(requests[1].body, requests[0].body);
  const form = new URLSearchParams(requests[0].body);
  assert.equal(form.get('amount'), '2500');
  assert.equal(form.get('currency'), 'eur');
  assert.equal(form.get('automatic_payment_methods[enabled]'), 'true');
  assert.equal(form.get('metadata[tracking_utm_source]'), 'facebook');
  assert.equal(form.get('metadata[tracking_utm_campaign]'), 'Casa & verão');
  assert.equal(form.get('metadata[merchant_reference]'), input.orderNumber);
  assert.equal(form.get('metadata[store_id]'), 'store_fixture');
  assert.equal(form.has('tracking_utm_source'), false);
  assert.equal([...form.keys()].some(key => key.startsWith('payment_method_types')), false);
});

test('uses automatic methods outside Portugal and omits placeholder receipt email', async () => {
  const p = provider(async (_, options) => {
    const form = new URLSearchParams(options.body);
    assert.equal(form.get('automatic_payment_methods[enabled]'), 'true');
    assert.equal(form.has('receipt_email'), false);
    return Response.json({ id: 'pi_fixture' });
  });
  await p.createPaymentIntent({ ...input, customerCountry: 'ES', customerEmail: 'checkout@e-com.casa' });
});

test('repairs reused intent metadata without changing payment amount or creating another intent', async () => {
  const requests = [];
  const p = provider(async (url, options) => {
    requests.push({ url, ...options });
    const form = new URLSearchParams(options.body);
    assert.equal(form.get('metadata[tracking_utm_campaign]'), 'Camp|123');
    assert.equal(form.has('amount'), false);
    return Response.json({ id: 'pi_fixture', amount: 2500, currency: 'eur', metadata: { tracking_utm_campaign: 'Camp|123' } });
  });
  await p.updateTrackingMetadata('pi_fixture', { tracking_utm_campaign: 'Camp|123', tracking_sck: 'click' });
  await p.updateTrackingMetadata('pi_fixture', { tracking_sck: 'click', tracking_utm_campaign: 'Camp|123' });
  assert.equal(requests[0].url, 'https://api.xpayments.digital/api/stripe/v1/payment_intents/pi_fixture');
  assert.equal(requests[0].headers['Idempotency-Key'], requests[1].headers['Idempotency-Key']);
});

test('retains the rejected field for diagnostics without putting provider text in the customer message', async () => {
  const p = provider(async () => Response.json({ error: {
    type: 'invalid_request_error', code: 'parameter_unknown', param: 'tracking_utm_source',
    message: 'Received unknown parameter: tracking_utm_source',
  } }, { status: 400 }));
  await assert.rejects(p.createPaymentIntent(input), error => {
    assert.equal(error.code, 'PAYMENT_CONFIGURATION_ERROR');
    assert.equal(error.providerCode, 'parameter_unknown');
    assert.equal(error.providerParam, 'tracking_utm_source');
    assert.equal(error.message, 'PAYMENT_CONFIGURATION_ERROR');
    return true;
  });
});
