import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

// Execute production components with explicit React, browser and I/O doubles.
// No database, payment provider, analytics script or network request is loaded.
function load(path, mocks = {}) {
  const code = ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const compiled = { exports: {} };
  new Function('require', 'module', 'exports', code)(id => {
    assert.ok(id in mocks, `Unexpected runtime dependency: ${id}`);
    return mocks[id];
  }, compiled, compiled.exports);
  return compiled.exports;
}

const jsxRuntime = {
  jsx: (type, props) => ({ type, props }),
  jsxs: (type, props) => ({ type, props }),
  Fragment: Symbol('Fragment'),
};

function hookHarness() {
  let cursor = 0;
  const slots = [];
  const pending = [];
  const react = {
    useState(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial;
      return [slots[index], value => { slots[index] = typeof value === 'function' ? value(slots[index]) : value; }];
    },
    useRef(initial) { const index = cursor++; return slots[index] ??= { current: initial }; },
    useEffect(callback, dependencies) {
      const index = cursor++;
      const previous = slots[index];
      if (!previous || dependencies.some((value, i) => !Object.is(value, previous.dependencies[i]))) {
        pending.push(() => {
          previous?.cleanup?.();
          slots[index] = { dependencies, cleanup: callback() };
        });
      }
    },
  };
  return {
    react,
    render(Component) {
      cursor = 0;
      const tree = Component();
      while (pending.length) pending.shift()();
      return tree;
    },
    unmount() {
      for (const slot of slots) slot?.cleanup?.();
      slots.length = 0;
    },
  };
}

function browserFixture(t) {
  let now = 0;
  let nextId = 1;
  const timers = new Map();
  const cleanup = [];
  const previous = { window: global.window, document: global.document };
  global.window = {
    setTimeout(callback, delay) { const id = nextId++; timers.set(id, { callback, due: now + delay }); return id; },
    clearTimeout(id) { timers.delete(id); },
  };
  global.document = {};
  t.after(() => {
    for (const dispose of cleanup) dispose();
    if (previous.window === undefined) delete global.window; else global.window = previous.window;
    if (previous.document === undefined) delete global.document; else global.document = previous.document;
  });
  return {
    timers, cleanup,
    tick(milliseconds) {
      const target = now + milliseconds;
      while (true) {
        const next = [...timers].filter(([, timer]) => timer.due <= target).sort((a, b) => a[1].due - b[1].due)[0];
        if (!next) break;
        const [id, timer] = next;
        timers.delete(id);
        now = timer.due;
        timer.callback();
      }
      now = target;
    },
  };
}

function find(tree, predicate) {
  if (!tree || typeof tree !== 'object') return null;
  if (predicate(tree)) return tree;
  const children = tree.props?.children;
  for (const child of Array.isArray(children) ? children : [children]) {
    const result = find(child, predicate);
    if (result) return result;
  }
  return null;
}

const payloadHelper = load('src/lib/offers/panel-checkout-payload.ts');
const sampleLine = { slug: 'nuralta-painel-ripado-decorativo', variantId: 'carvalho-240', quantity: 2, name: 'Painel', price: '5.00', image: '/fixture.webp' };
const tracking = { src: null, sck: null, utm_source: 'FB', utm_medium: null, utm_campaign: 'fixture', utm_content: null, utm_term: null };

function cartFixture(t, initial = {}) {
  const browser = browserFixture(t);
  const hooks = hookHarness();
  browser.cleanup.push(hooks.unmount);
  const state = { pathname: '/offers/nuralta-painel-ripado', isOpen: false, hydrated: true, lines: [sampleLine], promoCode: null, ...initial };
  const requests = [];
  const events = [];
  const attributionSlugs = [];
  let resets = 0;
  const useCartDrawer = selector => selector(state);
  useCartDrawer.getState = () => ({ open: () => { state.isOpen = true; }, close: () => { state.isOpen = false; } });
  const { CartDrawer } = load('src/components/cart/cart-drawer.tsx', {
    react: hooks.react,
    'react/jsx-runtime': jsxRuntime,
    'next/link': { default: 'Link' }, 'next/image': { default: 'Image' },
    'next/navigation': { usePathname: () => state.pathname },
    './accessory-upsell': {}, './accessory-detail-modal': {}, 'lucide-react': {},
    '@/components/ui/sheet': {}, '@/components/ui/button': {},
    '@/lib/cart-store': { useCart: selector => selector(state) },
    '@/lib/cart-drawer-store': { useCartDrawer },
    '@/lib/format': { formatPrice: value => value }, '@/lib/constants': { FREE_SHIPPING_THRESHOLD: 50 },
    '@/lib/catalog/inventory': {}, '@/lib/catalog/nuralta-media': { nuraltaCartImage: (_, image) => image },
    '@/lib/offers/route-policy': load('src/lib/offers/route-policy.ts', { './promotion': {} }),
    '@/lib/offers/analytics': { trackOfferEvent: (...event) => events.push(event) },
    '@/lib/offers/attribution': { offerTrackingParameters: slug => { attributionSlugs.push(slug); return tracking; } },
    '@/lib/offers/panel-checkout-payload': payloadHelper,
    '@/lib/payments/offer-payment-preparation': {
      acquirePreparedOfferPayment(payload) {
        let resolve, reject;
        const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
        requests.push({ payload, promise, resolve, reject });
        return promise;
      },
      resetPreparedOfferPayment: () => { resets++; },
    },
  });
  return { ...browser, state, requests, events, attributionSlugs, get resets() { return resets; }, render: () => hooks.render(CartDrawer), unmount: hooks.unmount };
}

test('the shared payload preserves commerce and attribution without copying delivery or presentation fields', () => {
  const payload = payloadHelper.buildPanelCheckoutPayload([sampleLine, { slug: 'kit', quantity: 1 }], 'CODE', payloadHelper.PANEL_CHECKOUT_COUNTRY, tracking);
  assert.deepEqual(payload, {
    email: '', firstName: '', lastName: '', address: '', address2: null, city: '', postalCode: '', country: 'PT', phone: null,
    shippingMethod: 'standard', promoCode: 'CODE', giftWrap: false, notes: null, marketingConsent: false,
    items: [{ slug: sampleLine.slug, quantity: 2, variantId: 'carvalho-240' }, { slug: 'kit', quantity: 1, variantId: null }],
    trackingParameters: tracking,
  });
});

test('visiting the offer or opening an unhydrated drawer neither prepares nor clears payment', t => {
  const f = cartFixture(t, { hydrated: false, isOpen: true, lines: [] });
  f.render(); f.tick(1_000);
  f.state.lines = [sampleLine]; f.render(); f.tick(1_000);
  f.state.hydrated = true; f.state.isOpen = false; f.render(); f.tick(1_000);
  assert.equal(f.requests.length, 0);
  assert.equal(f.resets, 0);
  assert.deepEqual(f.events, []);
});

test('an open hydrated offer drawer waits 650ms and prepares the same checkout payload', t => {
  const f = cartFixture(t, { isOpen: true });
  f.render(); f.tick(649);
  assert.equal(f.requests.length, 0);
  f.tick(1);
  assert.equal(f.requests.length, 1);
  assert.deepEqual(f.requests[0].payload, payloadHelper.buildPanelCheckoutPayload(f.state.lines, null, 'PT', tracking));
  assert.deepEqual(f.attributionSlugs, ['nuralta-painel-ripado']);
  assert.deepEqual(f.events, []);
  const entry = find(f.render(), node => node.type === 'Link' && node.props.href.endsWith('/checkout'));
  entry.props.onClick();
  assert.equal(f.events.length, 1);
  assert.equal(f.events[0][0], 'begin_checkout');
  assert.equal(f.state.isOpen, false);
});

test('quantity and promotion changes replace the pending timer and prepare the latest snapshot', t => {
  const f = cartFixture(t, { isOpen: true });
  f.render(); f.tick(400);
  f.state.lines = [{ ...sampleLine, quantity: 5 }]; f.state.promoCode = 'NEW'; f.render();
  assert.equal(f.timers.size, 1);
  f.tick(649); assert.equal(f.requests.length, 0);
  f.tick(1);
  assert.equal(f.requests.length, 1);
  assert.equal(f.requests[0].payload.items[0].quantity, 5);
  assert.equal(f.requests[0].payload.promoCode, 'NEW');
});

test('closing before debounce cancels it; closing or unmounting after preparation preserves the shared request', async t => {
  const f = cartFixture(t, { isOpen: true });
  f.render(); f.tick(300); f.state.isOpen = false; f.render(); f.tick(1_000);
  assert.equal(f.requests.length, 0);
  f.state.isOpen = true; f.render(); f.tick(650);
  f.state.isOpen = false; f.render(); f.unmount();
  assert.equal(f.timers.size, 0);
  assert.equal(f.resets, 0);
  f.requests[0].resolve({ ready: true });
  assert.deepEqual(await f.requests[0].promise, { ready: true });
});

test('checkout, information, success and unrelated routes do not prepare from the drawer', t => {
  const f = cartFixture(t, { isOpen: true });
  for (const path of ['/offers/nuralta-painel-ripado/checkout', '/offers/nuralta-painel-ripado/informacao/envios', '/offers/painel-ripado/checkout/sucesso', '/shop']) {
    f.state.pathname = path; f.render(); f.tick(1_000);
  }
  assert.equal(f.requests.length, 0);
  f.state.pathname = '/offers/painel-ripado/'; f.render(); f.tick(650);
  assert.equal(f.requests.length, 1);
  assert.deepEqual(f.attributionSlugs, ['painel-ripado']);
});

test('emptying a hydrated cart resets once, while empty mounts and hydration do not wipe preparation', t => {
  const f = cartFixture(t, { isOpen: true, hydrated: false, lines: [] });
  f.render(); f.state.hydrated = true; f.render();
  assert.equal(f.resets, 0);
  f.state.lines = [sampleLine]; f.render(); f.tick(650);
  f.state.lines = []; f.render(); f.render();
  assert.equal(f.resets, 1);
  f.unmount(); f.render();
  assert.equal(f.resets, 1);
});

test('a speculative preparation rejection is consumed without checkout events or a reset', async t => {
  const f = cartFixture(t, { isOpen: true });
  f.render(); f.tick(650);
  f.requests[0].reject(new Error('Fixture preparation failure'));
  await Promise.resolve();
  assert.equal(f.resets, 0);
  assert.deepEqual(f.events, []);
});

test('runtime UTMify effects do not trigger IC on the offer, but trigger on checkout and clean up on exit', t => {
  const browser = browserFixture(t);
  const hooks = hookHarness();
  browser.cleanup.push(hooks.unmount);
  let pathname = '/offers/nuralta-painel-ripado';
  let clicks = 0;
  const requestedIds = [];
  document.getElementById = id => {
    requestedIds.push(id);
    return id === 'utmify-initiate-checkout-trigger' ? { click: () => { clicks++; } } : null;
  };
  const { UtmifyTracking } = load('src/components/analytics/utmify-tracking.tsx', {
    react: hooks.react, 'react/jsx-runtime': jsxRuntime,
    'next/script': { default: 'Script' }, 'next/navigation': { usePathname: () => pathname },
    '@/lib/offers/attribution': { captureOfferAttribution: () => {} },
  });
  const first = hooks.render(UtmifyTracking);
  find(first, node => node.props?.id === 'utmify-pixel').props.onReady();
  hooks.render(UtmifyTracking);
  browser.tick(10_000);
  assert.equal(clicks, 0);
  assert.equal(browser.timers.size, 0);

  pathname = '/offers/nuralta-painel-ripado/checkout'; hooks.render(UtmifyTracking);
  assert.equal(browser.timers.size, 5);
  browser.tick(0);
  assert.equal(clicks, 1);
  assert.deepEqual(requestedIds, ['utmify-initiate-checkout-trigger']);
  pathname = '/offers/nuralta-painel-ripado'; hooks.render(UtmifyTracking);
  assert.equal(browser.timers.size, 0);
  browser.tick(10_000); assert.equal(clicks, 1);

  pathname = '/offers/nuralta-painel-ripado/checkout/sucesso'; hooks.render(UtmifyTracking);
  assert.equal(browser.timers.size, 0);
  pathname = '/checkout'; hooks.render(UtmifyTracking);
  assert.equal(browser.timers.size, 5);
  hooks.unmount();
  assert.equal(browser.timers.size, 0);
});
