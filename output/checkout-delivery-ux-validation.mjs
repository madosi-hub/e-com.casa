import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

const code = ts.transpileModule(fs.readFileSync('src/components/checkout/painel-ripado-checkout.tsx', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
const valid = { firstName: 'Cliente Teste', email: 'cliente@example.test', address: 'Rua Teste 1', city: 'Lisboa', postalCode: '1000-001', country: 'PT' };
function nodes(tree, predicate) {
  if (!tree || typeof tree !== 'object') return [];
  const children = tree.props?.children;
  return [...(predicate(tree) ? [tree] : []), ...(Array.isArray(children) ? children : [children]).flat().flatMap(child => nodes(child, predicate))];
}
function text(tree) {
  if (tree == null || typeof tree === 'boolean') return '';
  if (typeof tree !== 'object') return String(tree);
  return [tree.props?.children].flat(2).map(text).join('');
}
function fixture({ draft, phase = 'preparing', reducedMotion = false } = {}) {
  const slots = [], effects = [], frames = [], focus = [], scroll = [], paymentCalls = [];
  const inputs = new Map();
  let cursor = 0, dirty = true, tree;
  const same = (a, b) => a?.length === b?.length && a.every((v, i) => Object.is(v, b[i]));
  const react = {
    useRef(initial) { const i = cursor++; return slots[i] ??= { current: initial }; },
    useState(initial) {
      const i = cursor++;
      if (!slots[i]) slots[i] = { value: initial };
      return [slots[i].value, next => { const v = typeof next === 'function' ? next(slots[i].value) : next; if (!Object.is(v, slots[i].value)) { slots[i].value = v; dirty = true; } }];
    },
    useMemo(fn, deps) { const i = cursor++; if (!slots[i] || !same(slots[i].deps, deps)) slots[i] = { value: fn(), deps }; return slots[i].value; },
    useEffect(fn, deps) { const i = cursor++, old = slots[i]; if (old && same(old.deps, deps)) return; const slot = { deps }; slots[i] = slot; effects.push(() => { old?.cleanup?.(); slot.cleanup = fn(); }); },
  };
  const jsx = (type, props = {}) => {
    if (typeof type === 'function') return type(props);
    if (type === 'input') {
      const input = inputs.get(props.id) ?? { isConnected: true, focus: opts => focus.push({ id: props.id, ...opts }), scrollIntoView: opts => scroll.push({ id: props.id, ...opts }) };
      input.value = props.value;
      input.validity = { typeMismatch: props.type === 'email' && Boolean(props.value) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(props.value) };
      inputs.set(props.id, input);
    }
    if (props.ref) props.ref.current = { querySelector: selector => inputs.get(selector.slice(1)) ?? null };
    return { type, props };
  };
  const component = name => props => jsx(name, props);
  const lines = [{ slug: 'fixture-panel', quantity: 1, price: 5, name: 'Painel de teste', image: '/fixture.png' }];
  const cart = { lines, promoCode: null, subtotal: () => 5 };
  const session = {
    phase, elements: phase === 'preparing' ? null : { submit: async () => { paymentCalls.push('submit'); return {}; } }, stripe: {},
    syncOrder: async () => { paymentCalls.push('sync'); return { ok: true }; },
    confirmPayment: async () => { paymentCalls.push('confirm'); return { ok: true }; }, retry() {},
  };
  const mocks = {
    react, 'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'fragment' },
    'next/link': { default: component('a') }, 'next/image': { default: component('img') },
    'next/navigation': { useRouter: () => ({ push() { throw new Error('Navigation not expected'); } }) },
    'lucide-react': Object.fromEntries(['ArrowUp', 'CheckCircle2', 'ChevronDown', 'Lock', 'LoaderCircle', 'Search', 'ShieldCheck', 'ShoppingBag'].map(key => [key, component(key)])),
    '@/components/ui/input': { Input: component('input') }, '@/components/ui/label': { Label: component('label') }, '@/components/ui/separator': { Separator: component('hr') },
    '@/hooks/use-toast': { toast() {} }, '@/lib/cart-store': { useCart: () => cart },
    '@/lib/catalog/nuralta-media': { nuraltaCartImage: (_, image) => image }, '@/lib/offers/attribution': { offerTrackingParameters: () => ({}) },
    '@/lib/offers/analytics': { trackOfferEvent() {} }, '@/lib/offers/route-policy': { NURALTA_OFFER_ALIAS: 'fixture-panel', panelOfferPath: (slug, suffix = '') => `/offers/${slug}${suffix}` },
    '@/lib/i18n': { translate: (_, key) => ({ 'checkout.paymentInitializing': 'A preparar o pagamento seguro…', 'checkout.processing': 'A processar…' })[key] ?? key },
    '@/hooks/use-payment-session': { usePaymentSession: () => session }, '@/lib/format': { formatPrice: value => `€${value}`, toNumber: Number, money: Number },
    '@/components/payments/payment-element': { PaymentElement: component('payment-element') },
    '@/components/payments/payment-loading-skeleton': { PaymentLoadingSkeleton: component('payment-loading') },
    '@/components/payments/express-checkout': { ExpressCheckout: component('express-checkout') },
    '@/lib/constants': { calculatePromoDiscount: () => 0, PROMO_CODES: {} }, '@/lib/shipping': { shippingPrice: () => 0 },
  };
  const browser = {
    localStorage: { getItem: () => draft ? JSON.stringify(draft) : null, setItem() {}, removeItem() {} },
    requestAnimationFrame: fn => frames.push(fn), matchMedia: () => ({ matches: reducedMotion }), clearTimeout() {},
    setTimeout() { throw new Error('Shipping timeout not expected in this validation'); },
  };
  const compiled = { exports: {} };
  new Function('require', 'module', 'exports', 'window', 'document', code)(id => { assert.ok(id in mocks, `Unmocked dependency: ${id}`); return mocks[id]; }, compiled, compiled.exports, browser, { documentElement: {} });
  function render() {
    dirty = true; let count = 0;
    while (dirty) { assert.ok(++count < 20); dirty = false; cursor = 0; tree = compiled.exports.default({}); while (effects.length) effects.shift()(); }
    return tree;
  }
  render();
  return {
    focus, scroll, paymentCalls, render,
    get button() { return nodes(tree, n => n.type === 'button' && n.props.className?.includes('min-h-[50px]'))[0]; },
    get tree() { return tree; },
    flushFrames() { while (frames.length) frames.shift()(); },
    readyElement() { nodes(tree, n => n.type === 'payment-element')[0].props.onReady(); render(); },
  };
}

let checked = 0;
for (const phase of ['preparing', 'ready']) {
  const f = fixture({ phase });
  assert.equal(f.button.props.type, 'button'); assert.equal(f.button.props.disabled, false);
  assert.match(text(f.button), /Rever dados de entrega/);
  f.button.props.onClick(); f.render(); f.flushFrames();
  assert.equal(nodes(f.tree, n => n.props?.id === 'co-firstName')[0].props['aria-invalid'], true);
  assert.equal(nodes(f.tree, n => n.props?.id === 'co-firstName-error').length, 1);
  assert.deepEqual(f.focus, [{ id: 'co-firstName', preventScroll: true }]);
  assert.deepEqual(f.scroll, [{ id: 'co-firstName', behavior: 'smooth', block: 'center' }]);
  assert.deepEqual(f.paymentCalls, []); checked++;
}
const invalidEmail = fixture({ draft: { ...valid, email: 'nome@' }, phase: 'ready' });
assert.equal(invalidEmail.button.props.type, 'button'); assert.equal(invalidEmail.button.props.disabled, false);
invalidEmail.button.props.onClick(); invalidEmail.render(); invalidEmail.flushFrames();
assert.equal(invalidEmail.focus[0].id, 'co-email');
assert.match(text(nodes(invalidEmail.tree, n => n.props?.id === 'co-email-error')[0]), /e-mail válido/);
assert.deepEqual(invalidEmail.paymentCalls, []); checked++;
const preparing = fixture({ draft: valid });
assert.equal(preparing.button.props.type, 'submit'); assert.equal(preparing.button.props.disabled, true);
assert.match(text(preparing.button), /preparar o pagamento/); checked++;
for (const draft of [undefined, valid]) {
  const f = fixture({ draft, phase: 'confirming' });
  assert.equal(f.button.props.disabled, true); assert.match(text(f.button), /processar/); checked++;
}
const ready = fixture({ draft: valid, phase: 'ready' });
assert.equal(ready.button.props.disabled, true); ready.readyElement();
assert.equal(ready.button.props.type, 'submit'); assert.equal(ready.button.props.disabled, false); assert.match(text(ready.button), /Pagar €5/); checked++;
const reduced = fixture({ reducedMotion: true });
reduced.button.props.onClick(); reduced.render(); reduced.flushFrames();
assert.equal(reduced.scroll[0].behavior, 'auto'); assert.deepEqual(reduced.paymentCalls, []); checked++;
console.log(JSON.stringify({ checks: checked, result: 'passed', productionRequests: 0, paymentSubmissions: 0 }));
