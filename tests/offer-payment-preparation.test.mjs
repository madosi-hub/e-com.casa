import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

const code = ts.transpileModule(fs.readFileSync('src/lib/payments/offer-payment-preparation.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
let tokenSequence = 0;

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function payload(overrides = {}) {
  return {
    email: '', firstName: '', lastName: '', address: '', address2: null,
    city: '', postalCode: '', country: 'PT', phone: null, shippingMethod: 'standard',
    promoCode: null, giftWrap: false, notes: null, marketingConsent: false,
    items: [{ slug: 'panel', quantity: 1, variantId: 'oak' }],
    trackingParameters: { utm_source: 'facebook', utm_campaign: 'campaign-a' },
    ...overrides,
  };
}

function response(data, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => data };
}

function orderResponse(body) {
  return response({ orderNumber: `order-${body.checkoutToken}`, accessToken: 'private-order-token', pricingHash: 'price-hash' });
}

function intentResponse() {
  return response({ clientSecret: 'private-client-secret', publishableKey: 'pk_public', methods: [{ method: 'card' }] });
}

function loadPreparation({ storage = new Map(), handle } = {}) {
  const compiled = { exports: {} };
  const calls = [];
  const timeouts = [];
  const retryDelays = [];
  let now = 1_000_000;
  class FakeDate extends Date { static now() { return now; } }
  const sessionStorage = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: (key) => storage.delete(key),
  };
  const fetch = async (path, options) => {
    const call = { path, ...options, payload: JSON.parse(options.body) };
    calls.push(call);
    const result = handle?.(call, calls.length);
    if (result !== undefined) return result;
    if (path === '/api/checkout/create') return orderResponse(call.payload);
    assert.equal(path, '/api/payments/create-intent', 'preparation must never confirm, charge, or track a checkout');
    return intentResponse();
  };
  new Function('module', 'exports', 'fetch', 'sessionStorage', 'crypto', 'Date', 'AbortSignal', 'setTimeout', code)(
    compiled, compiled.exports, fetch, sessionStorage,
    { randomUUID: () => `checkout-token-${++tokenSequence}` }, FakeDate,
    {
      any: (signals) => AbortSignal.any(signals),
      timeout: (delay) => {
        const controller = new AbortController();
        timeouts.push({ delay, controller });
        return controller.signal;
      },
    },
    (callback, delay) => { retryDelays.push(delay); queueMicrotask(callback); },
  );
  return {
    ...compiled.exports, calls, storage, timeouts, retryDelays,
    advance: (milliseconds) => { now += milliseconds; },
    timeout: (delay) => {
      const pending = timeouts.find((item) => item.delay === delay && !item.controller.signal.aborted);
      assert.ok(pending);
      pending.controller.abort(new DOMException('Timed out', 'TimeoutError'));
    },
  };
}

async function until(predicate) {
  for (let tick = 0; tick < 100 && !predicate(); tick++) await Promise.resolve();
  assert.ok(predicate(), 'expected async stage was reached');
}

test('joins an in-flight cart preparation, replays telemetry, and reuses its ready result', async () => {
  const intent = deferred();
  const manager = loadPreparation({ handle: (call) => call.path.endsWith('create-intent') ? intent.promise : undefined });
  const events = [];
  const first = manager.acquirePreparedOfferPayment(payload(), { onEvent: (event) => events.push(event) });
  await until(() => manager.calls.length === 2);
  const joinedEvents = [];
  const joined = manager.acquirePreparedOfferPayment(payload(), { onEvent: (event) => joinedEvents.push(event) });
  assert.equal(joined, first);
  assert.deepEqual(joinedEvents.map(({ stage, status }) => [stage, status]), [
    ['order', 'started'], ['order', 'ready'], ['intent', 'started'],
  ]);
  intent.resolve(intentResponse());
  const prepared = await first;
  assert.equal(prepared.clientSecret, 'private-client-secret');
  assert.deepEqual(joinedEvents, events);
  assert.equal(manager.acquirePreparedOfferPayment(payload()), first);
  const lateEvents = [];
  await manager.acquirePreparedOfferPayment(payload(), { onEvent: (event) => lateEvents.push(event) });
  assert.deepEqual(lateEvents, events);
  assert.equal(manager.calls.length, 2);
  assert.equal(manager.calls[0].payload.draft, true);
  assert.equal(manager.calls[0].headers['Idempotency-Key'], prepared.checkoutToken);
  assert.deepEqual(manager.timeouts.map(({ delay }) => delay), [15_000, 20_000]);
});

test('TTL and force refresh prepare again with the same token without resetting an active promise', async () => {
  const manager = loadPreparation();
  const original = manager.acquirePreparedOfferPayment(payload());
  const first = await original;
  manager.advance(119_999);
  assert.equal(manager.acquirePreparedOfferPayment(payload()), original);
  manager.advance(1);
  const expired = manager.acquirePreparedOfferPayment(payload());
  assert.notEqual(expired, original);
  assert.equal((await expired).checkoutToken, first.checkoutToken);
  const forced = await manager.acquirePreparedOfferPayment(payload(), { forceRefresh: true });
  assert.equal(forced.checkoutToken, first.checkoutToken);
  assert.equal(manager.calls.length, 6);
});

test('quantity and accessory changes isolate A to B to A and ignore late server responses', async () => {
  const requests = [];
  const manager = loadPreparation({ handle: (call) => {
    if (call.path !== '/api/checkout/create') return;
    const request = deferred();
    requests.push({ ...request, body: call.payload });
    return request.promise;
  } });
  const a = payload();
  const b = payload({ items: [{ slug: 'panel', quantity: 2, variantId: 'oak' }, { slug: 'accessory', quantity: 1, variantId: null }] });
  const firstA = manager.acquirePreparedOfferPayment(a);
  const firstRejected = assert.rejects(firstA, { name: 'AbortError' });
  await until(() => requests.length === 1);
  const firstB = manager.acquirePreparedOfferPayment(b);
  const secondRejected = assert.rejects(firstB, { name: 'AbortError' });
  await until(() => requests.length === 2);
  const latestA = manager.acquirePreparedOfferPayment(a);
  await until(() => requests.length === 3);
  assert.equal(new Set(requests.map(({ body }) => body.checkoutToken)).size, 3);
  requests[2].resolve(orderResponse(requests[2].body));
  const ready = await latestA;
  requests[0].resolve(orderResponse(requests[0].body));
  requests[1].reject(new Error('old server failed'));
  await Promise.all([firstRejected, secondRejected]);
  await Promise.resolve();
  assert.equal(manager.acquirePreparedOfferPayment(a), latestA);
  assert.equal(ready.checkoutToken, requests[2].body.checkoutToken);
  assert.equal(manager.calls.filter(({ path }) => path.endsWith('create-intent')).length, 1);
});

test('reset rejects pending work, clears storage, and never accepts a late payment response', async () => {
  const pending = deferred();
  let firstIntent = true;
  const manager = loadPreparation({ handle: (call) => {
    if (call.path.endsWith('create-intent') && firstIntent) { firstIntent = false; return pending.promise; }
  } });
  const first = manager.acquirePreparedOfferPayment(payload());
  const rejected = assert.rejects(first, { name: 'AbortError' });
  await until(() => manager.calls.length === 2);
  const oldToken = manager.calls[0].payload.checkoutToken;
  manager.resetPreparedOfferPayment();
  assert.equal(manager.storage.size, 0);
  const next = manager.acquirePreparedOfferPayment(payload());
  assert.notEqual((await next).checkoutToken, oldToken);
  pending.resolve(intentResponse());
  await rejected;
  assert.equal(manager.acquirePreparedOfferPayment(payload()), next);
});

test('invalidation, safe retries and reload preserve the latest token without persisting private data', async () => {
  let failed = false;
  const manager = loadPreparation({ handle: (call) => {
    if (!failed && call.path === '/api/checkout/create') {
      failed = true;
      return response({ stage: 'persist_order' }, 503);
    }
  } });
  const privatePayload = payload({ email: 'private@example.test', firstName: 'Private buyer' });
  const first = await manager.acquirePreparedOfferPayment(privatePayload);
  assert.deepEqual(manager.retryDelays, [300]);
  assert.equal(manager.calls[0].body, manager.calls[1].body);
  manager.invalidatePreparedOfferPayment(payload({ country: 'ES' }));
  const callsBefore = manager.calls.length;
  await manager.acquirePreparedOfferPayment(privatePayload);
  assert.equal(manager.calls.length, callsBefore);
  manager.invalidatePreparedOfferPayment(privatePayload);
  assert.equal((await manager.acquirePreparedOfferPayment(privatePayload)).checkoutToken, first.checkoutToken);
  const persisted = [...manager.storage.values()].join();
  for (const forbidden of ['private@example', 'Private buyer', 'facebook', 'utm_', 'private-order-token', 'private-client-secret']) {
    assert.equal(persisted.includes(forbidden), false, forbidden);
  }
  const reloaded = loadPreparation({ storage: manager.storage });
  assert.equal((await reloaded.acquirePreparedOfferPayment(privatePayload)).checkoutToken, first.checkoutToken);
  const changed = payload({ items: [{ slug: 'panel', quantity: 2, variantId: 'oak' }] });
  assert.notEqual((await reloaded.acquirePreparedOfferPayment(changed)).checkoutToken, first.checkoutToken);
  assert.notEqual((await reloaded.acquirePreparedOfferPayment(privatePayload)).checkoutToken, first.checkoutToken);
});

test('errors evict the promise but preserve token identity, and telemetry exceptions cannot stop recovery', async () => {
  const failedOrder = loadPreparation({ handle: () => response({ error: 'Checkout indisponível.', requestId: 'request-reference' }, 409) });
  await assert.rejects(failedOrder.acquirePreparedOfferPayment(payload()), {
    phase: 'error', message: 'Checkout indisponível. Referência: request-reference',
  });
  let fail = true;
  const manager = loadPreparation({ handle: (call) => call.path.endsWith('create-intent') && fail
    ? response({ stage: 'create_provider_intent' }, 503) : undefined });
  const events = [];
  await assert.rejects(manager.acquirePreparedOfferPayment(payload(), { onEvent: (event) => events.push(event) }), {
    name: 'OfferPaymentPreparationError', phase: 'unavailable', errorCode: 'PAYMENT_CONFIGURATION_ERROR',
  });
  assert.equal(manager.retryDelays.length, 0, 'provider-stage errors must not be blindly retried');
  assert.deepEqual(events.at(-1), { stage: 'intent', status: 'error', durationMs: 0, reason: 'http_503' });
  const firstToken = manager.calls[0].payload.checkoutToken;
  fail = false;
  const recovered = await manager.acquirePreparedOfferPayment(payload(), { onEvent: () => { throw new Error('broken telemetry'); } });
  assert.equal(recovered.checkoutToken, firstToken);
  manager.invalidatePreparedOfferPayment(payload());
  const changedTracking = payload({ trackingParameters: { utm_source: 'other' } });
  assert.notEqual((await manager.acquirePreparedOfferPayment(changedTracking)).checkoutToken, firstToken);
});

test('stage timeouts release hanging work and late responses cannot replace a successful retry', async () => {
  const hanging = deferred();
  let first = true;
  const manager = loadPreparation({ handle: (call) => {
    if (call.path === '/api/checkout/create' && first) { first = false; return hanging.promise; }
  } });
  const events = [];
  const preparation = manager.acquirePreparedOfferPayment(payload(), { onEvent: (event) => events.push(event) });
  const rejected = assert.rejects(preparation, { phase: 'error', errorCode: 'TEMPORARY_PAYMENT_ERROR' });
  await until(() => manager.calls.length === 1);
  const token = manager.calls[0].payload.checkoutToken;
  manager.timeout(15_000);
  await rejected;
  assert.equal(events.at(-1).reason, 'timeout');
  const retry = manager.acquirePreparedOfferPayment(payload());
  assert.equal((await retry).checkoutToken, token);
  hanging.resolve(orderResponse({ checkoutToken: token }));
  await Promise.resolve();
  assert.equal(manager.acquirePreparedOfferPayment(payload()), retry);
  assert.equal(manager.calls.filter(({ path }) => path.endsWith('create-intent')).length, 1);
});

test('snapshots mutable inputs and preserves in-flight work across the ready TTL', async () => {
  const pending = deferred();
  const manager = loadPreparation({ handle: (call) => call.path === '/api/checkout/create' ? pending.promise : undefined });
  const original = payload();
  const first = manager.acquirePreparedOfferPayment(original);
  original.items[0].quantity = 99;
  await until(() => manager.calls.length === 1);
  assert.equal(manager.calls[0].payload.items[0].quantity, 1);
  manager.advance(180_000);
  assert.equal(manager.acquirePreparedOfferPayment(payload()), first);
  pending.resolve(orderResponse(manager.calls[0].payload));
  await first;
});
