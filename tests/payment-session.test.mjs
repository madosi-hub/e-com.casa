import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

const source = ts.transpileModule(fs.readFileSync('src/hooks/use-payment-session.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const preparationSource = ts.transpileModule(fs.readFileSync('src/lib/payments/offer-payment-preparation.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const errorSource = ts.transpileModule(fs.readFileSync('src/lib/payments/client-payment-errors.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

const payload = {
  email: 'buyer@example.test', firstName: 'Buyer', lastName: 'Test', address: 'Street 1',
  city: 'Lisboa', postalCode: '1000-001', country: 'PT', shippingMethod: 'standard',
  giftWrap: false, marketingConsent: false, items: [{ slug: 'panel', quantity: 1 }],
};
const offerPayload = { ...payload, email: '', firstName: '', lastName: '', address: '', city: '', postalCode: '' };

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

// A deliberately small hook scheduler: preserve slots, commit effects, run their
// cleanups before dependency changes, and render queued state updates. All I/O,
// timers and browser storage are private to each test; no production services run.
function fixture({ fetchMock, stripeMock, options = {} } = {}) {
  const slots = [];
  const effects = [];
  const timers = new Map();
  const requests = [];
  const stripeCalls = [];
  const confirmCalls = [];
  const completed = [];
  const diagnostics = [];
  const storage = new Map();
  let now = 0;
  let timerId = 0;
  let cursor = 0;
  let dirty = true;
  let started = false;
  let unmounted = false;
  let writesAfterUnmount = 0;
  let current;
  let props = {
    payload, signature: 'cart-a', prepareDelayMs: 0,
    onComplete: (...args) => completed.push(args),
    onPreparationEvent: event => diagnostics.push(event),
    ...options,
  };

  const setTimer = (callback, delay = 0) => {
    const id = ++timerId;
    timers.set(id, { callback, due: now + delay, delay });
    return id;
  };
  const clearTimer = id => timers.delete(id);
  const sameDeps = (a, b) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  const react = {
    useState(initial) {
      const index = cursor++;
      if (!slots[index]) {
        const slot = { value: typeof initial === 'function' ? initial() : initial };
        slot.set = next => {
          if (unmounted) { writesAfterUnmount++; return; }
          const value = typeof next === 'function' ? next(slot.value) : next;
          if (!Object.is(value, slot.value)) { slot.value = value; dirty = true; }
        };
        slots[index] = slot;
      }
      return [slots[index].value, slots[index].set];
    },
    useRef(initial) {
      const index = cursor++;
      return slots[index] ??= { current: initial };
    },
    useCallback(callback, deps) {
      const index = cursor++;
      if (!slots[index] || !sameDeps(slots[index].deps, deps)) slots[index] = { value: callback, deps };
      return slots[index].value;
    },
    useEffect(callback, deps) {
      const index = cursor++;
      const previous = slots[index];
      if (previous && sameDeps(previous.deps, deps)) return;
      const slot = { deps, cleanup: previous?.cleanup };
      slots[index] = slot;
      effects.push(() => {
        slot.cleanup?.();
        slot.cleanup = callback();
      });
    },
  };
  const stripe = {
    elements: config => ({ clientSecret: config.clientSecret }),
    confirmPayment: async config => {
      confirmCalls.push(config);
      return { paymentIntent: { status: 'succeeded' } };
    },
    ...stripeMock,
  };
  const getStripe = async (...args) => {
    stripeCalls.push(args);
    return typeof stripeMock === 'function' ? stripeMock(...args) : stripe;
  };
  const defaultFetch = async (url, config) => {
    if (url === '/api/checkout/create') return Response.json({ orderNumber: 'ORDER-A', accessToken: 'token-fixture', pricingHash: 'price-a' });
    if (url === '/api/payments/create-intent') return Response.json({ clientSecret: 'intent-a', publishableKey: 'pk_test_fixture', methods: [] });
    throw new Error(`Unexpected fixture URL: ${url}`);
  };
  const fetch = async (url, config) => {
    requests.push({ url, ...config, data: JSON.parse(config.body) });
    return (fetchMock ?? defaultFetch)(url, config, defaultFetch);
  };
  const timedSignal = {
    any: AbortSignal.any.bind(AbortSignal),
    timeout(delay) {
      const controller = new AbortController();
      setTimer(() => controller.abort(new DOMException('Fixture deadline exceeded', 'TimeoutError')), delay);
      return controller.signal;
    },
  };
  const mocks = {
    react,
    '@/lib/payments/stripe-elements': { getStripe, ELEMENTS_APPEARANCE: {} },
  };
  const browserStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) };
  function load(code) {
    const compiled = { exports: {} };
    new Function('require', 'module', 'exports', 'fetch', 'setTimeout', 'clearTimeout', 'AbortSignal', 'sessionStorage', 'window', 'Date', code)(
      id => { assert.ok(id in mocks, `Unmocked dependency: ${id}`); return mocks[id]; },
      compiled, compiled.exports, fetch, setTimer, clearTimer, timedSignal, browserStorage,
      { location: { origin: 'https://example.test' }, sessionStorage: browserStorage }, { now: () => now },
    );
    return compiled.exports;
  }
  const preparation = load(preparationSource);
  mocks['@/lib/payments/client-payment-errors'] = load(errorSource);
  mocks['@/lib/payments/offer-payment-preparation'] = preparation;
  const hook = load(source);

  function render() {
    if (!started || unmounted || !dirty) return;
    cursor = 0;
    dirty = false;
    current = hook.usePaymentSession(props);
    while (effects.length) effects.shift()();
  }
  async function flush() {
    // Fetch, Response.json, Stripe and hook continuations have several promise
    // boundaries. Drain them without advancing the simulated wall clock.
    for (let i = 0; i < 80; i++) { render(); await Promise.resolve(); }
    render();
  }
  async function advance(milliseconds) {
    const target = now + milliseconds;
    await flush();
    while (true) {
      const due = [...timers.entries()].filter(([, timer]) => timer.due <= target).sort((a, b) => a[1].due - b[1].due)[0];
      if (!due) break;
      now = due[1].due;
      timers.delete(due[0]);
      due[1].callback();
      await flush();
    }
    now = target;
    await flush();
  }
  return {
    get current() { return current; },
    get writesAfterUnmount() { return writesAfterUnmount; },
    get now() { return now; },
    requests, stripeCalls, stripe, confirmCalls, completed, diagnostics, timers, storage, preparation,
    resetCheckoutToken: hook.resetCheckoutToken,
    flush, advance,
    async update(next) { props = { ...props, ...next }; dirty = true; await flush(); },
    async start() { started = true; await advance(0); },
    unmount() { unmounted = true; for (const slot of slots) slot?.cleanup?.(); },
  };
}

function untilAborted(signal) {
  return new Promise((_, reject) => {
    if (signal.aborted) reject(signal.reason);
    else signal.addEventListener('abort', () => reject(signal.reason), { once: true });
  });
}

test('starts preparing immediately and keeps the checkout token stable on explicit retry', async () => {
  const f = fixture();
  await f.start();
  assert.equal(f.now, 0);
  assert.equal(f.requests.length, 2, 'Initial checkout must not wait for a typing debounce');
  assert.equal(f.current.phase, 'ready');
  const token = f.requests[0].headers['Idempotency-Key'];
  assert.ok(token);
  f.current.retry();
  await f.start();
  assert.equal(f.current.phase, 'ready');
  const orders = f.requests.filter(request => request.url === '/api/checkout/create');
  assert.equal(orders.length, 2);
  assert.equal(orders[1].headers['Idempotency-Key'], token);
  assert.equal(orders[1].data.checkoutToken, token);
  assert.equal(f.confirmCalls.length, 0);
});

test('the default contact-based checkout still debounces typing', async () => {
  const f = fixture({ options: { prepareDelayMs: undefined } });
  await f.start();
  assert.equal(f.requests.length, 0);
  await f.advance(649);
  assert.equal(f.requests.length, 0);
  await f.advance(1);
  assert.equal(f.current.phase, 'ready');
});

test('preparation diagnostics identify stages without exposing order or customer data', async () => {
  const f = fixture();
  await f.start();
  assert.deepEqual(f.diagnostics.map(({ stage, status }) => [stage, status]), [
    ['order', 'started'], ['order', 'ready'], ['intent', 'started'], ['intent', 'ready'],
    ['stripe', 'started'], ['stripe', 'ready'],
  ]);
  for (const event of f.diagnostics) {
    assert.ok(Object.keys(event).every(key => ['durationMs', 'reason', 'stage', 'status'].includes(key)));
    assert.equal(event.durationMs, 0);
  }
  assert.equal(JSON.stringify(f.diagnostics).includes(payload.email), false);
  assert.equal(JSON.stringify(f.diagnostics).includes('token-fixture'), false);
});

test('a changed cart aborts preparation and ignores a late Stripe result', async () => {
  const oldStripe = deferred();
  let loadCount = 0;
  const f = fixture({ stripeMock: async () => ++loadCount === 1 ? oldStripe.promise : {
    elements: () => ({ session: 'new-cart' }),
  } });
  await f.start();
  assert.equal(f.current.phase, 'preparing');
  const oldRequest = f.requests[0];
  await f.update({ signature: 'cart-b', payload: { ...payload, items: [{ slug: 'panel', quantity: 2 }] } });
  assert.equal(oldRequest.signal.aborted, true);
  await f.advance(650);
  assert.equal(f.current.phase, 'ready');
  assert.equal(f.current.elements.session, 'new-cart');
  let staleElementsCreated = 0;
  oldStripe.resolve({ elements: () => { staleElementsCreated++; return { session: 'old-cart' }; } });
  await f.flush();
  assert.equal(staleElementsCreated, 0);
  assert.equal(f.current.elements.session, 'new-cart');
});

test('a new payload object with the same signature cannot strand pending preparation', async () => {
  const oldStripe = deferred();
  let loads = 0;
  const f = fixture({ stripeMock: async () => ++loads === 1 ? oldStripe.promise : { elements: () => ({ session: 'current' }) } });
  await f.start();
  assert.equal(f.current.phase, 'preparing');
  await f.update({ payload: { ...payload } });
  await f.start();
  assert.equal(f.current.phase, 'ready');
  oldStripe.resolve({ elements: () => ({ session: 'obsolete' }) });
  await f.flush();
  assert.equal(f.current.elements.session, 'current');
  const requestCount = f.requests.length;
  await f.update({ payload: { ...payload } });
  await f.start();
  assert.equal(f.current.phase, 'ready');
  assert.equal(f.requests.length, requestCount, 'A settled unchanged checkout does not prepare again');
  assert.equal((await f.current.syncOrder(payload)).ok, true, 'The unchanged ready session must remain usable');
});

for (const delayedPath of ['/api/checkout/create', '/api/payments/create-intent']) {
  test(`an obsolete ${delayedPath} response cannot replace a newer checkout`, async () => {
    const delayed = deferred();
    let firstRequest = true;
    const f = fixture({ fetchMock: async (url, config, normal) => {
      if (url === delayedPath && firstRequest) {
        firstRequest = false;
        return delayed.promise; // Deliberately emulate a transport ignoring abort.
      }
      return normal(url, config);
    } });
    await f.start();
    assert.equal(f.current.phase, 'preparing');
    await f.update({ signature: 'cart-b', payload: { ...payload, items: [{ slug: 'panel', quantity: 2 }] } });
    await f.advance(650);
    assert.equal(f.current.phase, 'ready');
    const currentElements = f.current.elements;
    const requestCount = f.requests.length;
    const stripeCount = f.stripeCalls.length;
    delayed.resolve(Response.json(delayedPath === '/api/checkout/create'
      ? { orderNumber: 'ORDER-STALE', accessToken: 'stale-token', pricingHash: 'stale-price' }
      : { clientSecret: 'stale-intent', publishableKey: 'pk_test_fixture', methods: [] }));
    await f.flush();
    assert.equal(f.current.phase, 'ready');
    assert.equal(f.current.orderNumber, 'ORDER-A');
    assert.equal(f.current.elements, currentElements);
    assert.equal(f.requests.length, requestCount, 'Obsolete order must not continue to intent creation');
    assert.equal(f.stripeCalls.length, stripeCount, 'Obsolete intent must not initialise another element');
  });
}

test('unmount aborts requests and suppresses a late Stripe continuation', async () => {
  const loading = deferred();
  let elementsCreated = 0;
  const f = fixture({ stripeMock: () => loading.promise });
  await f.start();
  assert.equal(f.current.phase, 'preparing');
  f.unmount();
  assert.equal(f.requests[0].signal.aborted, true);
  loading.resolve({ elements: () => { elementsCreated++; return {}; } });
  await f.flush();
  assert.equal(elementsCreated, 0);
  assert.equal(f.writesAfterUnmount, 0);
});

for (const stalledPath of ['/api/checkout/create', '/api/payments/create-intent']) {
  test(`a stalled ${stalledPath} becomes recoverable instead of preparing indefinitely`, async () => {
    let stalled = true;
    const f = fixture({ fetchMock: async (url, config, normal) => {
      if (stalled && url === stalledPath) return untilAborted(config.signal);
      return normal(url, config);
    } });
    await f.start();
    assert.equal(f.current.phase, 'preparing');
    await f.advance(60_000);
    assert.equal(f.current.phase, 'error');
    assert.ok(f.current.errorMessage);
    assert.equal(f.current.errorCode, 'TEMPORARY_PAYMENT_ERROR');
    const diagnostic = f.diagnostics.find(event => event.status === 'error');
    assert.equal(diagnostic.stage, stalledPath === '/api/checkout/create' ? 'order' : 'intent');
    assert.equal(diagnostic.reason, 'timeout');
    assert.ok(diagnostic.durationMs > 0 && diagnostic.durationMs <= 30_000);
    const attempts = f.requests.filter(request => request.url === stalledPath);
    assert.equal(attempts.length, 1, 'A timeout does not silently resubmit a payment request');
    assert.equal(attempts[0].signal.aborted, true);
    stalled = false;
    f.current.retry();
    await f.start();
    assert.equal(f.current.phase, 'ready');
    assert.equal(f.confirmCalls.length, 0);
  });
}

test('saving delivery has a deadline and can be retried without confirming payment', async () => {
  let stalled = true;
  const f = fixture({ fetchMock: async (url, config, normal) => {
    if (stalled && url === '/api/checkout/create' && JSON.parse(config.body).draft === false) {
      assert.ok(config.signal, 'Saving delivery needs an abort deadline');
      return untilAborted(config.signal);
    }
    return normal(url, config);
  } });
  await f.start();
  const saving = f.current.syncOrder(payload);
  await f.advance(60_000);
  assert.equal((await saving).ok, false);
  assert.equal(f.current.phase, 'ready');
  assert.equal(f.confirmCalls.length, 0);
  stalled = false;
  assert.equal((await f.current.syncOrder(payload)).ok, true);
});

test('a thrown confirmation restores a usable checkout without an automatic financial retry', async () => {
  let confirmations = 0;
  const f = fixture({ stripeMock: { confirmPayment: async () => { confirmations++; throw new Error('SDK network fixture'); } } });
  await f.start();
  assert.equal((await f.current.syncOrder(payload)).ok, true);
  const result = await f.current.confirmPayment();
  await f.flush();
  assert.equal(result.ok, false);
  assert.ok(result.errorMessage);
  assert.equal(f.current.phase, 'ready');
  await f.advance(60_000);
  assert.equal(confirmations, 1);
  assert.deepEqual(f.completed, []);
});

test('a successful browser result navigates with the existing order and token', async () => {
  const f = fixture();
  await f.start();
  const result = await f.current.confirmPayment();
  await f.flush();
  assert.equal(result.ok, true);
  assert.equal(f.confirmCalls.length, 1);
  assert.deepEqual(f.completed, [['ORDER-A', 'token-fixture']]);
  const request = f.confirmCalls[0];
  assert.equal(request.redirect, 'if_required');
  const returnUrl = new URL(request.confirmParams.return_url);
  assert.equal(returnUrl.origin, 'https://example.test');
  assert.equal(returnUrl.searchParams.get('order'), 'ORDER-A');
  assert.equal(returnUrl.searchParams.get('token'), 'token-fixture');
});

test('offer checkout reuses a completed cart preparation and its token when saving delivery', async () => {
  const f = fixture({ options: { payload: offerPayload, prepareEarly: true } });
  const prepared = await f.preparation.acquirePreparedOfferPayment(offerPayload);
  assert.equal(f.requests.length, 2);
  // A generic checkout token is intentionally unrelated to the prepared offer.
  f.storage.set('ecom-checkout-token', 'foreign-checkout-token');
  await f.start();
  assert.equal(f.current.phase, 'ready');
  assert.equal(f.requests.length, 2, 'Entering checkout must not repeat completed order/intent requests');
  assert.equal(f.current.elements.clientSecret, prepared.clientSecret);
  assert.equal((await f.current.syncOrder(payload)).ok, true);
  const saved = f.requests.at(-1);
  assert.equal(saved.data.draft, false);
  assert.equal(saved.data.checkoutToken, prepared.checkoutToken);
  assert.equal(saved.headers['Idempotency-Key'], prepared.checkoutToken);
  assert.equal(f.confirmCalls.length, 0);
});

test('offer checkout joins cart preparation already in flight without another POST', async () => {
  const intent = deferred();
  const f = fixture({ options: { payload: offerPayload, prepareEarly: true }, fetchMock: async (url, config, normal) => {
    return url === '/api/payments/create-intent' ? intent.promise : normal(url, config);
  } });
  const prefetched = f.preparation.acquirePreparedOfferPayment(offerPayload);
  await f.flush();
  assert.equal(f.requests.length, 2);
  await f.start();
  assert.equal(f.current.phase, 'preparing');
  assert.equal(f.requests.length, 2);
  intent.resolve(Response.json({ clientSecret: 'intent-shared', publishableKey: 'pk_test_fixture', methods: [] }));
  const prepared = await prefetched;
  await f.flush();
  assert.equal(f.current.phase, 'ready');
  assert.equal(f.current.elements.clientSecret, prepared.clientSecret);
  assert.equal(f.requests.length, 2);
  assert.equal(f.stripeCalls.length, 1);
});

test('explicit offer retry refreshes even a valid shared cache while preserving idempotency', async () => {
  const f = fixture({ options: { payload: offerPayload, prepareEarly: true } });
  const prefetched = await f.preparation.acquirePreparedOfferPayment(offerPayload);
  await f.start();
  assert.equal(f.current.phase, 'ready');
  assert.equal(f.requests.length, 2);
  f.current.retry();
  await f.start();
  assert.equal(f.current.phase, 'ready');
  assert.equal(f.requests.length, 4);
  const orders = f.requests.filter(request => request.data.draft === true);
  assert.equal(orders.length, 2);
  assert.equal(orders[1].headers['Idempotency-Key'], prefetched.checkoutToken);
  assert.equal(orders[1].data.checkoutToken, prefetched.checkoutToken);
  assert.equal(f.confirmCalls.length, 0);
});

for (const returnToOriginal of [false, true]) {
  test(`changing the cart ${returnToOriginal ? 'A → B → A' : 'A → B'} while saving delivery prevents stale confirmation`, async () => {
    const saving = deferred();
    const f = fixture({ options: { payload: offerPayload, prepareEarly: true }, fetchMock: async (url, config, normal) => {
      if (url === '/api/checkout/create' && JSON.parse(config.body).draft === false) return saving.promise;
      return normal(url, config);
    } });
    await f.start();
    assert.equal(f.current.phase, 'ready');
    const oldConfirmation = f.current.confirmPayment;
    const confirming = oldConfirmation();
    await f.flush();
    assert.equal(f.requests.at(-1).data.draft, false);
    await f.update({ signature: 'cart-b', payload: { ...offerPayload, items: [{ slug: 'panel', quantity: 2 }] } });
    await f.start();
    assert.equal(f.current.phase, 'ready');
    if (returnToOriginal) {
      await f.update({ signature: 'cart-a', payload: offerPayload });
      await f.start();
      assert.equal(f.current.phase, 'ready');
    }
    saving.resolve(Response.json({ orderNumber: 'ORDER-A', accessToken: 'token-fixture', pricingHash: 'price-a' }));
    assert.equal((await confirming).ok, false);
    assert.equal((await oldConfirmation()).ok, false, 'A stale event callback must not confirm the current cart either');
    await f.flush();
    assert.equal(f.confirmCalls.length, 0);
    assert.deepEqual(f.completed, []);
    assert.equal(f.current.phase, 'ready');
  });
}

test('unmounting the offer consumer preserves shared preparation and suppresses its late state updates', async () => {
  const intent = deferred();
  const f = fixture({ options: { payload: offerPayload, prepareEarly: true }, fetchMock: async (url, config, normal) => {
    return url === '/api/payments/create-intent' ? intent.promise : normal(url, config);
  } });
  await f.start();
  assert.equal(f.current.phase, 'preparing');
  const sharedRequest = f.requests.find(request => request.url === '/api/payments/create-intent');
  assert.ok(sharedRequest);
  f.unmount();
  assert.equal(sharedRequest.signal.aborted, false);
  intent.resolve(Response.json({ clientSecret: 'intent-shared', publishableKey: 'pk_test_fixture', methods: [] }));
  await f.flush();
  assert.equal(f.writesAfterUnmount, 0);
  assert.equal(f.stripeCalls.length, 0);
  assert.equal(sharedRequest.signal.aborted, false);
  const prepared = await f.preparation.acquirePreparedOfferPayment(offerPayload);
  assert.equal(prepared.clientSecret, 'intent-shared');
  assert.equal(f.requests.length, 2);
});

test('a changed server price disables stale Elements and explicit retry prepares a fresh payment', async () => {
  let price = 'price-a';
  const f = fixture({ options: { payload: offerPayload, prepareEarly: true }, fetchMock: async (url, config, normal) => {
    if (url === '/api/checkout/create') return Response.json({ orderNumber: 'ORDER-A', accessToken: 'token-fixture', pricingHash: price });
    return normal(url, config);
  } });
  await f.start();
  const oldElements = f.current.elements;
  price = 'price-b';
  assert.equal((await f.current.syncOrder(payload)).ok, false);
  await f.flush();
  assert.equal(f.current.phase, 'error');
  assert.equal(f.current.elements, null);
  assert.equal(f.current.stripe, null);
  assert.equal((await f.current.confirmPayment()).ok, false);
  assert.equal(f.confirmCalls.length, 0);
  assert.equal(f.requests.filter(request => request.url === '/api/payments/create-intent').length, 1);
  f.current.retry();
  await f.start();
  assert.equal(f.current.phase, 'ready');
  assert.notEqual(f.current.elements, oldElements);
  assert.equal(f.requests.filter(request => request.data.draft === true).length, 2);
  assert.equal(f.requests.filter(request => request.url === '/api/payments/create-intent').length, 2);
  assert.equal((await f.current.syncOrder(payload)).ok, true);
  assert.equal(f.confirmCalls.length, 0);
});

test('an equivalent payload rerender during delivery save preserves the active payment session', async () => {
  const saving = deferred();
  const f = fixture({ options: { payload: offerPayload, prepareEarly: true }, fetchMock: async (url, config, normal) => {
    if (url === '/api/checkout/create' && JSON.parse(config.body).draft === false) return saving.promise;
    return normal(url, config);
  } });
  await f.start();
  const elements = f.current.elements;
  const pending = f.current.syncOrder(payload);
  await f.flush();
  await f.update({ payload: { ...offerPayload } });
  saving.resolve(Response.json({ orderNumber: 'ORDER-A', pricingHash: 'price-a' }));
  assert.equal((await pending).ok, true);
  assert.equal(f.current.elements, elements);
  assert.equal(f.requests.length, 3);
  assert.equal(f.confirmCalls.length, 0);
});

test('a manual retry still verifies server pricing even when the contact has not changed', async () => {
  let price = 'price-a';
  const f = fixture({ fetchMock: async (url, config, normal) => {
    if (url === '/api/checkout/create') return Response.json({ orderNumber: 'ORDER-A', pricingHash: price, accessToken: 'token-fixture' });
    return normal(url, config);
  } });
  await f.start();
  assert.equal((await f.current.syncOrder(payload)).ok, true);
  price = 'price-b';
  const result = await f.current.syncOrder({ ...payload });
  await f.flush();
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'pricing_changed');
  assert.equal(f.requests.filter(r => r.data.draft === false).length, 2);
  assert.equal(f.confirmCalls.length, 0);
  assert.equal(f.current.elements, null);
});

for (const mismatch of [true, false]) {
  test(`the displayed EUR amount ${mismatch ? 'cannot differ from' : 'matches'} the server total before confirmation`, async () => {
    const f = fixture({ fetchMock: async (url, config, normal) => {
      if (url === '/api/checkout/create') return Response.json({ orderNumber: 'ORDER-A', pricingHash: 'price-a', accessToken: 'token-fixture', totals: { total: '9.00', currency: 'EUR' } });
      return normal(url, config);
    } });
    await f.start();
    const result = await f.current.syncOrder(payload, { amountMinor: mismatch ? 500 : 900, currency: 'EUR' });
    await f.flush();
    assert.equal(result.ok, !mismatch);
    if (mismatch) {
      assert.equal(result.reason, 'displayed_amount_changed');
      assert.equal(f.current.phase, 'error');
      assert.equal(f.current.elements, null);
      assert.equal((await f.current.confirmPayment()).ok, false);
    }
    assert.equal(f.confirmCalls.length, 0);
  });
}

test('MB WAY decline returns Portuguese guidance and only allowlisted technical diagnostics', async () => {
  const f = fixture({ stripeMock: { confirmPayment: async () => ({ error: {
    type: 'card_error', code: 'card_declined', decline_code: 'do_not_honor',
    message: 'Sensitive provider text +351910000000', payment_method: { billing_details: { email: payload.email } },
  } }) } });
  await f.start();
  const result = await f.current.confirmPayment('mb_way');
  await f.flush();
  assert.equal(result.ok, false);
  assert.equal(result.errorCode, 'PAYMENT_FAILED');
  assert.equal(result.providerCode, 'card_declined');
  assert.equal(result.declineCode, 'do_not_honor');
  assert.match(result.errorMessage, /número de telemóvel.*MB WAY/);
  assert.ok(!JSON.stringify(result).includes('+351'));
  assert.ok(!JSON.stringify(result).includes(payload.email));
  assert.equal(f.current.phase, 'ready');
});

test('arbitrary provider diagnostic values are excluded instead of sending contacts or secrets', async () => {
  const f = fixture({ stripeMock: { confirmPayment: async () => ({ error: {
    type: 'card_error', code: 'pi_private_secret_value', decline_code: payload.email, message: 'Private message',
  } }) } });
  await f.start();
  const result = await f.current.confirmPayment('mb_way');
  assert.equal(result.providerCode, 'other');
  assert.equal(result.declineCode, 'other');
  assert.ok(!JSON.stringify(result).includes('private'));
  assert.ok(!JSON.stringify(result).includes(payload.email));
});

test('delivery HTTP errors include a safe status, preserve the session, and allow a manual retry', async () => {
  let fail = true;
  const f = fixture({ fetchMock: async (url, config, normal) => {
    if (fail && url === '/api/checkout/create' && JSON.parse(config.body).draft === false) return Response.json({ error: 'Private server details' }, { status: 429 });
    return normal(url, config);
  } });
  await f.start();
  const elements = f.current.elements;
  const result = await f.current.syncOrder(payload);
  assert.equal(result.reason, 'delivery_request_failed');
  assert.equal(result.httpStatus, 429);
  assert.match(result.errorMessage, /Aguarde/);
  assert.ok(!JSON.stringify(result).includes('Private'));
  fail = false;
  assert.equal((await f.current.syncOrder(payload)).ok, true);
  assert.equal(f.current.elements, elements);
  assert.equal(f.confirmCalls.length, 0);
});

test('Multibanco instructions return a pending outcome without a paid navigation or a permanent spinner', async () => {
  let confirmations = 0;
  const f = fixture({ stripeMock: { confirmPayment: async () => { confirmations++; return { paymentIntent: { status: 'requires_action', next_action: { multibanco_display_details: { entity: '12345', reference: '123 456 789' } } } }; } } });
  await f.start();
  const result = await f.current.confirmPayment('multibanco');
  await f.flush();
  assert.equal(result.ok, true);
  assert.equal(result.paymentStatus, 'requires_action');
  assert.deepEqual(result.multibanco, { entity: '12345', reference: '123456789' });
  assert.equal(f.current.phase, 'ready');
  assert.deepEqual(f.completed, []);
  assert.equal(confirmations, 1);
});

test('a changed cart during provider confirmation cannot navigate or clear the newer checkout', async () => {
  const confirmation = deferred();
  const f = fixture({ stripeMock: { confirmPayment: () => confirmation.promise } });
  await f.start();
  const pending = f.current.confirmPayment();
  await f.flush();
  await f.update({ signature: 'cart-b', payload: { ...payload, items: [{ slug: 'panel', quantity: 2 }] } });
  await f.start();
  confirmation.resolve({ paymentIntent: { status: 'succeeded' } });
  assert.equal((await pending).reason, 'session_changed');
  assert.deepEqual(f.completed, []);
  assert.equal(f.current.phase, 'ready');
});

test('resetCheckoutToken clears shared offer preparation as well as the generic token', async () => {
  const f = fixture();
  const first = await f.preparation.acquirePreparedOfferPayment(offerPayload);
  f.storage.set('ecom-checkout-token', 'generic-checkout-token');
  f.resetCheckoutToken();
  assert.equal(f.storage.has('ecom-checkout-token'), false);
  const second = await f.preparation.acquirePreparedOfferPayment(offerPayload);
  assert.notEqual(second.checkoutToken, first.checkoutToken);
  assert.equal(f.requests.length, 4);
  assert.equal(f.confirmCalls.length, 0);
});

test('a shared preparation error is recoverable by explicit retry without confirming payment', async () => {
  let fail = true;
  const f = fixture({ options: { payload: offerPayload, prepareEarly: true }, fetchMock: async (url, config, normal) => {
    if (fail && url === '/api/payments/create-intent') return Response.json({ error: 'fixture_unavailable' }, { status: 503 });
    return normal(url, config);
  } });
  await f.start();
  assert.equal(f.current.phase, 'unavailable');
  assert.equal(f.current.elements, null);
  assert.equal(f.current.errorCode, 'PAYMENT_CONFIGURATION_ERROR');
  assert.ok(f.current.errorMessage);
  assert.equal(f.requests.length, 2);
  fail = false;
  f.current.retry();
  await f.start();
  assert.equal(f.current.phase, 'ready');
  assert.equal(f.requests.length, 4);
  assert.equal(f.confirmCalls.length, 0);
});
