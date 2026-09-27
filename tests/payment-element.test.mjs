import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

function load(path, mocks = {}, timers = globalThis) {
  const code = ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const compiled = { exports: {} };
  new Function('require', 'module', 'exports', 'setTimeout', 'clearTimeout', code)(
    id => mocks[id], compiled, compiled.exports, timers.setTimeout, timers.clearTimeout,
  );
  return compiled.exports;
}

function fixture({ mount, createError = false, unmountError = false } = {}) {
  const timers = new Map();
  const handlers = new Map();
  const calls = [];
  const results = [];
  const clock = {
    setTimeout(callback, delay) { const id = {}; timers.set(id, { callback, delay }); return id; },
    clearTimeout(id) { timers.delete(id); },
  };
  const element = {
    on(name, handler) { calls.push(`on:${name}`); handlers.set(name, handler); },
    off(name, handler) { calls.push(`off:${name}`); if (handlers.get(name) === handler) handlers.delete(name); },
    mount() { calls.push('mount'); mount?.(handlers); },
    unmount() { calls.push('unmount'); if (unmountError) throw new Error('Already unmounted'); },
    destroy() { calls.push('destroy'); },
  };
  const elements = { create() { if (createError) throw new Error('Create failed'); return element; } };
  const { mountPaymentElement } = load('src/components/payments/payment-element-lifecycle.ts', {}, clock);
  const dispose = mountPaymentElement({
    elements, container: {},
    onReady: () => results.push('ready'), onLoadError: code => results.push(code),
  });
  return { calls, handlers, timers, results, dispose };
}

test('captures synchronous Stripe readiness during mount and clears its deadline', () => {
  const f = fixture({ mount: handlers => handlers.get('ready')() });
  assert.deepEqual(f.calls.slice(0, 3), ['on:ready', 'on:loaderror', 'mount']);
  assert.deepEqual(f.results, ['ready']);
  assert.equal(f.timers.size, 0);
  f.handlers.get('ready')();
  assert.deepEqual(f.results, ['ready']);
  f.dispose();
});

test('ends an unresponsive mount after 20 seconds and ignores a late ready event', () => {
  const f = fixture();
  const [deadline] = f.timers.values();
  assert.equal(deadline.delay, 20_000);
  deadline.callback();
  f.handlers.get('ready')();
  f.handlers.get('loaderror')({ error: { message: 'Provider details must not be forwarded' } });
  assert.deepEqual(f.results, ['payment_element_ready_timeout']);
  assert.equal(f.timers.size, 0);
  f.dispose();
});

test('a deadline callback already queued cannot turn a ready element into a timeout', () => {
  const f = fixture();
  const [deadline] = f.timers.values();
  f.handlers.get('ready')();
  deadline.callback();
  assert.deepEqual(f.results, ['ready']);
  f.dispose();
});

test('reports loaderror once, including after readiness, without forwarding provider details', () => {
  const f = fixture({ mount: handlers => handlers.get('ready')() });
  f.handlers.get('loaderror')({ error: { code: 'provider-code', message: 'Sensitive details' } });
  f.handlers.get('loaderror')({ error: {} });
  assert.deepEqual(f.results, ['ready', 'payment_element_load_error']);
  assert.equal(f.timers.size, 0);
  f.dispose();
});

test('handles both create and mount exceptions without leaving a pending timer', () => {
  for (const options of [{ createError: true }, { mount: () => { throw new Error('Mount failed'); } }]) {
    const f = fixture(options);
    assert.deepEqual(f.results, ['payment_element_mount_error']);
    assert.equal(f.timers.size, 0);
    f.dispose();
  }
});

test('cleanup removes listeners and timers and ignores already queued callbacks', () => {
  const f = fixture({ unmountError: true });
  const ready = f.handlers.get('ready');
  const error = f.handlers.get('loaderror');
  const [deadline] = f.timers.values();
  f.dispose();
  f.dispose();
  ready(); error(); deadline.callback();
  assert.equal(f.handlers.size, 0);
  assert.equal(f.timers.size, 0);
  assert.deepEqual(f.results, []);
  assert.equal(f.calls.filter(call => call === 'destroy').length, 1);
});

// Minimal React hook doubles exercise actual component rerenders without a DOM,
// a live Stripe script, or an additional test-runner dependency.
function componentFixture() {
  let cursor = 0;
  const slots = [];
  const pendingEffects = [];
  const mounts = [];
  let disposals = 0;
  const react = {
    useRef(initial) { const i = cursor++; return slots[i] ??= { current: initial }; },
    useState(initial) {
      const i = cursor++;
      if (!(i in slots)) slots[i] = initial;
      return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }];
    },
    useEffect(callback, dependencies) {
      const i = cursor++;
      const previous = slots[i];
      if (!previous || dependencies.some((value, index) => !Object.is(value, previous.dependencies[index]))) {
        pendingEffects.push(() => {
          previous?.cleanup?.();
          slots[i] = { dependencies, cleanup: callback() };
        });
      }
    },
  };
  const jsx = (type, props) => {
    if (props.ref) props.ref.current = {};
    if (typeof type === 'function') return type(props);
    return { type, props };
  };
  const skeleton = load('src/components/payments/payment-loading-skeleton.tsx', {
    'react/jsx-runtime': { jsx, jsxs: jsx },
  });
  const { PaymentElement } = load('src/components/payments/payment-element.tsx', {
    react,
    'react/jsx-runtime': { jsx, jsxs: jsx },
    './payment-loading-skeleton': skeleton,
    './payment-element-lifecycle': {
      mountPaymentElement(options) { mounts.push(options); return () => { disposals++; }; },
    },
  });
  return {
    mounts,
    get disposals() { return disposals; },
    render(props) {
      cursor = 0;
      const tree = PaymentElement(props);
      while (pendingEffects.length) pendingEffects.shift()();
      return tree;
    },
  };
}

function find(tree, predicate) {
  if (!tree || typeof tree !== 'object') return null;
  if (predicate(tree)) return tree;
  const children = tree.props?.children;
  for (const child of Array.isArray(children) ? children : [children]) {
    const match = find(child, predicate);
    if (match) return match;
  }
  return null;
}

test('callback changes preserve the iframe and deliver readiness to the latest callback', () => {
  const f = componentFixture();
  const elements = {};
  const calls = [];
  const loadingTree = f.render({ elements, loadingLabel: 'A carregar pagamento…', onReady: () => calls.push('old') });
  assert.ok(find(loadingTree, node => node.props?.role === 'status'));
  assert.equal(find(loadingTree, node => node.props?.className === 'sr-only').props.children, 'A carregar pagamento…');
  const loadingContainer = find(loadingTree, node => node.props?.id === 'payment-element');
  assert.equal(loadingContainer.props.hidden, false);
  assert.equal(loadingContainer.props.inert, true);
  assert.equal(loadingContainer.props['aria-hidden'], true);
  assert.match(loadingContainer.props.className, /absolute inset-0 opacity-0/);
  f.render({ elements, onReady: () => calls.push('latest') });
  assert.equal(f.mounts.length, 1);
  assert.equal(f.disposals, 0);
  f.mounts[0].onReady();
  assert.deepEqual(calls, ['latest']);
  const readyTree = f.render({ elements });
  assert.equal(find(readyTree, node => node.props?.role === 'status'), null);
  const readyContainer = find(readyTree, node => node.props?.id === 'payment-element');
  assert.equal(readyContainer.props.inert, false);
  assert.equal(readyContainer.props['aria-hidden'], false);
  assert.equal(readyContainer.props.className, 'static opacity-100');
});

test('an error replaces the loading skeleton with a Portuguese retry action', () => {
  const f = componentFixture();
  const elements = {};
  const errors = [];
  let retries = 0;
  const props = { elements, onLoadError: code => errors.push(code), onRetry: () => { retries++; } };
  f.render(props);
  f.mounts[0].onLoadError('payment_element_ready_timeout');
  const tree = f.render(props);
  assert.deepEqual(errors, ['payment_element_ready_timeout']);
  assert.equal(find(tree, node => node.props?.role === 'status'), null);
  assert.equal(find(tree, node => node.props?.id === 'payment-element').props.hidden, true);
  assert.ok(find(tree, node => node.props?.role === 'alert'));
  const retry = find(tree, node => node.type === 'button');
  assert.equal(retry.props.children, 'Tentar novamente');
  retry.props.onClick();
  assert.equal(retries, 1);
  assert.equal(find(f.render({ ...props, onRetry: undefined }), node => node.type === 'button'), null);
});
