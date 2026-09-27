import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

const code = ts.transpileModule(fs.readFileSync('src/components/payments/express-checkout.tsx', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText;

// Render the production component using isolated hook/JSX doubles. The SDK is
// represented only by events: these tests cannot load Stripe or submit payment.
function fixture() {
  const slots = [];
  const effects = [];
  const mounts = [];
  const confirmations = [];
  let cursor = 0;
  let dirty = true;
  let tree;
  const react = {
    useRef(initial) { const i = cursor++; return slots[i] ??= { current: initial }; },
    useState(initial) {
      const i = cursor++;
      if (!slots[i]) slots[i] = { value: initial };
      return [slots[i].value, next => {
        const value = typeof next === 'function' ? next(slots[i].value) : next;
        if (!Object.is(value, slots[i].value)) { slots[i].value = value; dirty = true; }
      }];
    },
    useEffect(callback, dependencies) {
      const i = cursor++;
      const previous = slots[i];
      if (previous && dependencies.length === previous.dependencies.length
        && dependencies.every((value, index) => Object.is(value, previous.dependencies[index]))) return;
      const slot = { dependencies, cleanup: previous?.cleanup };
      slots[i] = slot;
      effects.push(() => { slot.cleanup?.(); slot.cleanup = callback(); });
    },
  };
  const jsx = (type, props) => {
    if (props.ref) props.ref.current ??= {};
    return { type, props };
  };
  const elements = {
    create(type) {
      assert.equal(type, 'expressCheckout');
      const record = { handlers: new Map(), mounted: false, destroyed: false };
      mounts.push(record);
      return {
        on(name, handler) { record.handlers.set(name, handler); },
        mount() { record.mounted = true; },
        destroy() { record.destroyed = true; },
      };
    },
  };
  let props = {
    stripe: {}, elements,
    onBeforeConfirm: async () => { confirmations.push('before'); },
    onConfirm: async () => { confirmations.push('confirm'); },
  };
  const mocks = { react, 'react/jsx-runtime': { jsx, jsxs: jsx } };
  const compiled = { exports: {} };
  new Function('require', 'module', 'exports', code)(
    id => { assert.ok(id in mocks, `Unmocked dependency: ${id}`); return mocks[id]; },
    compiled, compiled.exports,
  );
  function render(next = {}) {
    props = { ...props, ...next };
    dirty = true;
    let renders = 0;
    while (dirty) {
      assert.ok(++renders <= 20, 'Component should settle after its state updates');
      dirty = false;
      cursor = 0;
      tree = compiled.exports.ExpressCheckout(props);
      while (effects.length) effects.shift()();
    }
    return tree;
  }
  return {
    mounts, confirmations, render,
    ready(event) { mounts.at(-1).handlers.get('ready')(event); return render(); },
    get hidden() { return tree.props.className.split(/\s+/).includes('hidden'); },
  };
}

test('wallet container stays hidden until the SDK reports a supported method', () => {
  const f = fixture();
  const tree = f.render();
  assert.equal(tree.type, 'div');
  assert.equal(f.mounts.length, 1);
  assert.equal(f.mounts[0].mounted, true);
  assert.equal(f.hidden, true);
  assert.deepEqual(f.confirmations, []);
});

for (const method of ['applePay', 'googlePay']) {
  test(`${method} alone makes the real wallet container visible without confirming payment`, () => {
    const f = fixture();
    f.render();
    f.ready({ availablePaymentMethods: { applePay: false, googlePay: false, amazonPay: false, [method]: true } });
    assert.equal(f.hidden, false);
    assert.equal(f.mounts.length, 1, 'Readiness must not recreate the wallet element');
    assert.deepEqual(f.confirmations, []);
  });
}

test('missing availability and a map of false values keep wallets hidden', () => {
  const f = fixture();
  f.render();
  for (const event of [
    {},
    { availablePaymentMethods: undefined },
    { availablePaymentMethods: null },
    { availablePaymentMethods: {} },
    { availablePaymentMethods: { applePay: false, googlePay: false, amazonPay: false } },
  ]) {
    f.ready(event);
    assert.equal(f.hidden, true);
  }
  assert.deepEqual(f.confirmations, []);
});

test('unsupported legacy fields and non-boolean values cannot advertise a wallet', () => {
  const f = fixture();
  f.render();
  f.ready({ availablePaymentTypes: { applePay: true } });
  assert.equal(f.hidden, true);
  f.ready({ availablePaymentMethods: { applePay: 'true', googlePay: 1 } });
  assert.equal(f.hidden, true);
});

test('a queued ready event after cleanup cannot revive the old wallet container', () => {
  const f = fixture();
  f.render();
  const oldReady = f.mounts[0].handlers.get('ready');
  oldReady({ availablePaymentMethods: { applePay: true } });
  f.render();
  assert.equal(f.hidden, false);
  f.render({ elements: null });
  assert.equal(f.mounts[0].destroyed, true);
  assert.equal(f.hidden, true);
  oldReady({ availablePaymentMethods: { applePay: true } });
  f.render();
  assert.equal(f.hidden, true);
  assert.deepEqual(f.confirmations, []);
});
