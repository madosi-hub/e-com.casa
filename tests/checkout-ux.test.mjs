import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import ts from 'typescript';

const code = ts.transpileModule(fs.readFileSync('src/components/checkout/painel-ripado-checkout.tsx', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
const deliveryCode = ts.transpileModule(fs.readFileSync('src/lib/offers/panel-delivery.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const deliveryModule = { exports: {} };
new Function('exports', deliveryCode)(deliveryModule.exports);
const { panelDeliveryWindowLabel } = deliveryModule.exports;
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
function fixture({ draft, phase = 'ready', reducedMotion = false } = {}) {
  const slots = [], effects = [], frames = [], focus = [], scroll = [], paymentCalls = [];
  const inputs = new Map(), events = [], saved = [], timers = new Map();
  let timerId = 0, elapsed = 0;
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
    if (props.ref) props.ref.current = { focus: () => focus.push({ id: props.id }), scrollIntoView: opts => scroll.push({ id: props.id, ...opts }), querySelector: selector => inputs.get(selector.slice(1)) ?? null };
    return { type, props };
  };
  const component = name => props => jsx(name, props);
  const lines = [{ slug: 'fixture-panel', quantity: 1, price: 5, name: 'Painel de teste', image: '/fixture.png' }];
  const cart = { lines, promoCode: null, subtotal: () => 5 };
  const session = {
    phase, elements: phase === 'preparing' ? null : { submit: async () => { paymentCalls.push('submit'); return {}; } }, stripe: {},
    syncOrder: async payload => { paymentCalls.push('sync'); saved.push(payload); return { ok: true }; },
    confirmPayment: async () => { paymentCalls.push('confirm'); return { ok: true }; }, retry() {},
  };
  const mocks = {
    react, 'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'fragment' },
    'next/link': { default: component('a') }, 'next/image': { default: component('img') },
    'next/navigation': { useRouter: () => ({ push() { throw new Error('Navigation not expected'); } }) },
    'lucide-react': Object.fromEntries(['ArrowRight', 'ArrowUp', 'CheckCircle2', 'ChevronDown', 'Lock', 'LoaderCircle', 'MessageCircle', 'RotateCcw', 'Search', 'ShieldCheck', 'ShoppingBag'].map(key => [key, component(key)])),
    '@/components/ui/input': { Input: component('input') }, '@/components/ui/label': { Label: component('label') }, '@/components/ui/separator': { Separator: component('hr') },
    '@/hooks/use-toast': { toast() {} }, '@/lib/cart-store': { useCart: () => cart },
    '@/components/offers/nuralta/campaign': { DispatchNotice: () => null },
    '@/lib/catalog/nuralta-media': { nuraltaCartImage: (_, image) => image }, '@/lib/offers/attribution': { offerTrackingParameters: () => ({}) },
    '@/lib/offers/analytics': { trackOfferEvent: (...event) => events.push(event) }, '@/lib/offers/route-policy': { NURALTA_OFFER_ALIAS: 'fixture-panel', panelOfferPath: (slug, suffix = '') => `/offers/${slug}${suffix}` },
    '@/lib/i18n': { translate: (_, key) => ({ 'checkout.paymentInitializing': 'A preparar o pagamento seguro…', 'checkout.processing': 'A processar…' })[key] ?? key },
    '@/hooks/use-payment-session': { usePaymentSession: () => session }, '@/lib/format': { formatPrice: value => `€${value}`, toNumber: Number, money: Number },
    '@/components/payments/payment-element': { PaymentElement: component('payment-element') },
    '@/components/payments/payment-loading-skeleton': { PaymentLoadingSkeleton: component('payment-loading') },
    '@/components/payments/express-checkout': { ExpressCheckout: component('express-checkout') },
    '@/lib/offers/panel-checkout-payload': { CHECKOUT_DRAFT_KEY: 'draft', PANEL_CHECKOUT_COUNTRY: 'PT', buildPanelCheckoutPayload: lines => ({ items: lines.map(({ slug, quantity }) => ({ slug, quantity })) }) },
    '@/lib/constants': { calculatePromoDiscount: () => 0, PROMO_CODES: {} }, '@/lib/shipping': { shippingPrice: () => 0 },
    '@/lib/offers/panel-delivery': deliveryModule.exports,
  };
  const browser = {
    localStorage: { getItem: () => draft ? JSON.stringify(draft) : null, setItem() {}, removeItem() {} },
    requestAnimationFrame: fn => frames.push(fn), matchMedia: () => ({ matches: reducedMotion }), clearTimeout(id) { timers.delete(id); },
    setTimeout(fn, delay) { const id = ++timerId; timers.set(id, { fn, due: elapsed + delay }); return id; },
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
    focus, scroll, paymentCalls, render, inputs, session, events, saved,
    get button() { return nodes(tree, n => n.type === 'button' && n.props.className?.includes('min-h-[50px]'))[0]; },
    get tree() { return tree; },
    get payment() { return nodes(tree, n => n.type === 'payment-element')[0]; },
    get express() { return nodes(tree, n => n.type === 'express-checkout')[0]; },
    submit() { return nodes(tree, n => n.type === 'form')[0].props.onSubmit({ preventDefault() {} }); },
    change(name, value) { const field = nodes(tree, n => n.props?.id === 'co-' + name)[0]; const input = inputs.get('co-' + name); input.value = value; field.props.onChange({ target: input, currentTarget: input }); render(); },
    advanceTime(ms) { elapsed += ms; for (const [id, timer] of [...timers]) { if (timer.due <= elapsed) { timers.delete(id); timer.fn(); } } render(); },
    finishShipping() { for (const [id, { fn }] of [...timers]) { timers.delete(id); fn(); } render(); },
    flushFrames() { while (frames.length) frames.shift()(); },
    readyElement() { nodes(tree, n => n.type === 'payment-element')[0].props.onReady(); render(); },
  };
}


test('incomplete delivery is actionable, focuses the first error and never submits payment', async () => {
  const f = fixture(); f.readyElement();
  assert.equal(f.button.props.disabled, false);
  assert.equal(f.button.props.type, 'submit');
  assert.equal(nodes(f.tree, n => n.type === 'form')[0].props.noValidate, true);
  await f.submit(); f.render(); f.flushFrames();
  assert.equal(f.focus[0].id, 'co-firstName');
  assert.equal(nodes(f.tree, n => n.props?.id === 'co-firstName')[0].props['aria-invalid'], true);
  assert.deepEqual(f.paymentCalls, []);
});

test('incomplete payment invokes Stripe validation and keeps its actionable error and delivery', async () => {
  const f = fixture({ draft: valid }); f.readyElement();
  f.session.elements.submit = async () => { f.paymentCalls.push('submit'); return { error: { type: 'validation_error', message: 'Preencha o número de telemóvel.' } }; };
  assert.equal(f.button.props.disabled, false);
  await f.submit(); f.render();
  assert.deepEqual(f.paymentCalls, ['submit']);
  assert.match(text(nodes(f.tree, n => n.props?.id === 'co-payment-error')[0]), /Preencha o número/);
  assert.equal(f.inputs.get('co-email').value, valid.email);
  assert.equal(f.button.props.disabled, false);
});

test('editing email preserves the payment options identity, method and completion', () => {
  const f = fixture({ draft: valid }); f.readyElement();
  const options = f.payment.props.options;
  f.payment.props.onChange({ complete: true, value: { type: 'multibanco' } }); f.render();
  f.change('email', 'outro@example.test');
  assert.equal(f.payment.props.options, options);
  assert.equal(options.defaultValues, undefined);
  assert.equal(options.fields.billingDetails.email, 'never');
  assert.match(text(f.button), /Gerar referência/);
  assert.match(text(nodes(f.tree, n => n.props?.id === 'co-payment-help')[0]), /só fica paga depois/);
});

test('a change event before readiness cannot enable confirmation, and failed/new elements stay disabled', () => {
  const f = fixture({ draft: valid });
  f.payment.props.onChange({ complete: true, value: { type: 'card' } }); f.render();
  assert.equal(f.button.props.disabled, true);
  f.readyElement(); assert.equal(f.button.props.disabled, false);
  f.payment.props.onLoadError('timeout'); f.render(); assert.equal(f.button.props.disabled, true);
  f.session.elements = { submit: async () => ({}) }; f.render(); assert.equal(f.button.props.disabled, true);
  f.readyElement(); assert.equal(f.button.props.disabled, false);
});

test('double submission validates, saves and confirms only once with current autofilled delivery', async () => {
  const f = fixture({ draft: valid }); f.readyElement();
  let resolve; f.session.elements.submit = () => { f.paymentCalls.push('submit'); return new Promise(done => { resolve = done; }); };
  f.inputs.get('co-email').value = 'autofill@example.test';
  f.inputs.get('co-firstName').value = '  Nome Preenchido Automaticamente  ';
  const first = f.submit(); await f.submit(); f.render();
  assert.equal(f.button.props.disabled, true);
  resolve({}); await first; f.render();
  assert.deepEqual(f.paymentCalls, ['submit', 'sync', 'confirm']);
  assert.equal(f.saved[0].email, 'autofill@example.test');
  assert.equal(f.saved[0].firstName, 'Nome Preenchido Automaticamente');
  assert.equal(f.saved[0].lastName, 'Nome Preenchido Automaticamente');
  assert.equal(f.events.filter(([name]) => name === 'checkout_payment_attempt').length, 1);
  assert.ok(f.events.some(([name, data]) => name === 'checkout_payment_result' && data.status === 'submitted'));
  assert.ok(!f.events.some(([name]) => name === 'purchase'));
});

test('saving delivery or confirming can fail without losing input, and retry remains possible', async () => {
  for (const stage of ['sync', 'confirm']) {
    const f = fixture({ draft: valid }); f.readyElement();
    f.session[stage === 'sync' ? 'syncOrder' : 'confirmPayment'] = async () => ({ ok: false, errorMessage: 'Tente novamente.' });
    await f.submit(); f.render(); f.flushFrames();
    assert.match(text(nodes(f.tree, n => n.props?.id === 'co-payment-error')[0]), /Tente novamente/);
    assert.equal(f.inputs.get('co-address').value, valid.address);
    assert.equal(f.button.props.disabled, false);
    assert.equal(f.focus.at(-1).id, 'co-payment-error');
    if (stage === 'sync') assert.ok(!f.paymentCalls.includes('confirm'));
  }
});

test('method/completeness telemetry deduplicates and excludes personal/payment data', () => {
  const f = fixture({ draft: valid }); f.readyElement();
  for (const complete of [false, false, true, true]) {
    f.payment.props.onChange({ complete, value: { type: 'mb_way', phone: '+351123456789', email: valid.email } }); f.render();
  }
  assert.equal(f.events.filter(([n]) => n === 'checkout_payment_method').length, 1);
  assert.equal(f.events.filter(([n]) => n === 'checkout_payment_details').length, 2);
  assert.ok(!JSON.stringify(f.events).includes(valid.email));
  assert.ok(!JSON.stringify(f.events).includes('+351'));
  assert.match(text(nodes(f.tree, n => n.props?.id === 'co-payment-help')[0]), /aplicação MB WAY/);
});

test('summary comes first and reveals shipping and delivery dates after one second with a complete address', () => {
  const f = fixture();
  const form = nodes(f.tree, n => n.type === 'form')[0];
  assert.equal(form.props.children.filter(Boolean)[0].type, 'aside');
  const summary = nodes(form, n => n.type === 'aside')[0];
  assert.equal(nodes(summary, n => n.type === 'details')[0].props.open, undefined);
  assert.match(text(summary), /1× Painel de teste/);
  assert.doesNotMatch(text(f.tree), /Grátis|Entrega grátis|Entrega prevista/);
  f.change('address', valid.address); f.change('city', valid.city); f.change('postalCode', valid.postalCode);
  assert.match(text(f.tree), /A calcular os portes/);
  assert.doesNotMatch(text(f.tree), /Grátis|Entrega grátis|Entrega prevista/);
  f.advanceTime(999);
  assert.match(text(f.tree), /A calcular os portes/);
  assert.doesNotMatch(text(f.tree), /Entrega prevista/);
  f.advanceTime(1);
  assert.match(text(f.tree), /Entrega grátis por/);
  assert.ok(text(f.tree).includes(panelDeliveryWindowLabel()));
  assert.match(text(f.tree), /1 a 4 dias úteis, para pagamentos confirmados hoje/);
  const readySummary = nodes(f.tree, n => n.type === 'aside')[0];
  assert.doesNotMatch(text(readySummary), /Grátis/);
  assert.doesNotMatch(text(readySummary), /a calcular após preencher a morada/);
  f.change('postalCode', '1000'); f.finishShipping();
  assert.doesNotMatch(text(f.tree), /Grátis|Entrega grátis|Entrega prevista/);
  f.change('postalCode', '1000-002');
  assert.match(text(f.tree), /A calcular os portes/);
  f.change('city', ''); f.finishShipping();
  assert.doesNotMatch(text(f.tree), /Grátis|Entrega grátis|Entrega prevista/);
});

test('delivery estimates use the Lisbon date, skip weekends and format month boundaries in Portuguese', () => {
  assert.equal(panelDeliveryWindowLabel(new Date('2026-10-09T12:00:00Z')), 'Entrega prevista entre 12 e 15 de outubro');
  assert.equal(panelDeliveryWindowLabel(new Date('2026-10-12T23:30:00Z')), 'Entrega prevista entre 14 e 19 de outubro');
  assert.equal(panelDeliveryWindowLabel(new Date('2026-02-24T12:00:00Z')), 'Entrega prevista entre 25 de fevereiro e 2 de março');
});

test('invalid email focuses its labelled error and respects reduced motion', async () => {
  const f = fixture({ draft: { ...valid, email: 'nome@' }, reducedMotion: true }); f.readyElement();
  await f.submit(); f.render(); f.flushFrames();
  assert.equal(f.focus[0].id, 'co-email'); assert.equal(f.scroll[0].behavior, 'auto');
  assert.equal(nodes(f.tree, n => n.props?.id === 'co-email')[0].props['aria-describedby'], 'co-email-error co-email-help');
  assert.deepEqual(f.paymentCalls, []);
});

test('express checkout validates delivery and shares the submission lock with the normal button', async () => {
  const invalid = fixture(); invalid.readyElement();
  await assert.rejects(invalid.express.props.onBeforeConfirm(), /dados de entrega/);
  invalid.render(); invalid.flushFrames(); assert.equal(invalid.focus[0].id, 'co-firstName');
  assert.deepEqual(invalid.paymentCalls, []);
  const f = fixture({ draft: valid }); f.readyElement();
  await f.express.props.onBeforeConfirm();
  assert.equal(f.saved[0].lastName, valid.firstName);
  await f.submit();
  await assert.rejects(f.express.props.onBeforeConfirm(), /já está/);
  assert.deepEqual(f.paymentCalls, ['sync']);
  await f.express.props.onConfirm(); f.render();
  assert.deepEqual(f.paymentCalls, ['sync', 'confirm']);
  assert.ok(f.events.some(([name, data]) => name === 'checkout_payment_attempt' && data.method === 'express'));
});

test('express failure restores the submit button and displays an inline error', async () => {
  const f = fixture({ draft: valid }); f.readyElement();
  f.session.syncOrder = async () => ({ ok: false });
  await assert.rejects(f.express.props.onBeforeConfirm()); f.render();
  assert.equal(f.button.props.disabled, false);
  assert.ok(nodes(f.tree, n => n.props?.id === 'co-payment-error').length);
});

test('continue validates then collapses delivery without submitting or recreating payment', () => {
  const f = fixture(); f.readyElement();
  const options = f.payment.props.options;
  const continueButton = () => nodes(f.tree, n => n.type === 'button' && text(n).includes('Continuar para o pagamento'))[0];
  continueButton().props.onClick(); f.render(); f.flushFrames();
  assert.equal(f.focus.at(-1).id, 'co-firstName');
  assert.equal(nodes(f.tree, n => n.props?.hidden === true).length, 0);
  for (const name of ['firstName', 'email', 'address', 'city', 'postalCode']) f.change(name, valid[name]);
  continueButton().props.onClick(); f.render(); f.flushFrames();
  assert.equal(f.focus.at(-1).id, 'co-payment');
  const collapsed = nodes(f.tree, n => n.props?.hidden === true)[0];
  assert.ok(nodes(collapsed, n => n.props?.id === 'co-email').length);
  assert.equal(f.payment.props.options, options);
  assert.deepEqual(f.paymentCalls, []);
  assert.match(text(nodes(f.tree, n => n.type === 'li' && n.props['aria-current'] === 'step')[0]), /Pagamento/);
  const edit = nodes(f.tree, n => n.type === 'button' && text(n) === 'Editar')[0];
  edit.props.onClick(); f.render(); f.flushFrames();
  assert.equal(f.focus.at(-1).id, 'co-firstName');
  assert.equal(nodes(f.tree, n => n.props?.hidden === true).length, 0);
  assert.equal(f.inputs.get('co-email').value, valid.email);
  assert.equal(f.payment.props.options, options);
});

test('a newly invalid autofilled address reopens the delivery form before focusing the error', async () => {
  const f = fixture({ draft: valid }); f.readyElement();
  nodes(f.tree, n => n.type === 'button' && text(n).includes('Continuar para o pagamento'))[0].props.onClick(); f.render();
  f.inputs.get('co-address').value = '';
  await f.submit(); f.render(); f.flushFrames();
  assert.equal(nodes(f.tree, n => n.props?.hidden === true).length, 0);
  assert.equal(f.focus.at(-1).id, 'co-address');
  assert.deepEqual(f.paymentCalls, []);
});
