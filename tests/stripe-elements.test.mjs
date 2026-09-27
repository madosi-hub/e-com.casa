import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function loadLoader(loadStripe) {
  const code = ts.transpileModule(fs.readFileSync('src/lib/payments/stripe-elements.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const compiled = { exports: {} };
  const timers = new Map();
  let nextTimer = 0;
  new Function('require', 'module', 'exports', 'setTimeout', 'clearTimeout', code)(
    (id) => {
      assert.equal(id, '@stripe/stripe-js');
      return { loadStripe };
    },
    compiled,
    compiled.exports,
    (callback, delay) => {
      assert.equal(delay, 15_000);
      const id = ++nextTimer;
      timers.set(id, callback);
      return id;
    },
    (id) => timers.delete(id),
  );
  return {
    ...compiled.exports,
    pendingTimers: () => timers.size,
    expire: () => {
      const callbacks = [...timers.values()];
      timers.clear();
      callbacks.forEach((callback) => callback());
    },
  };
}

test('deduplicates pending and successful loads by publishable key', async () => {
  const a = deferred();
  const b = deferred();
  const calls = [];
  const loader = loadLoader((key) => {
    calls.push(key);
    return key === 'pk_a' ? a.promise : b.promise;
  });
  const first = loader.getStripe('pk_a');
  assert.equal(loader.getStripe('pk_a'), first);
  const second = loader.getStripe('pk_b');
  assert.notEqual(first, second);
  assert.equal(loader.getStripe('pk_a'), first);
  await Promise.resolve();
  assert.deepEqual(calls, ['pk_a', 'pk_b']);
  const stripeA = { key: 'a' };
  const stripeB = { key: 'b' };
  a.resolve(stripeA);
  b.resolve(stripeB);
  assert.equal(await first, stripeA);
  assert.equal(await second, stripeB);
  assert.equal(loader.getStripe('pk_a'), first);
  assert.equal(loader.getStripe('pk_b'), second);
  assert.equal(loader.pendingTimers(), 0);
});

test('calls the SDK again after rejection, null, or a synchronous loader failure', async () => {
  const failure = new Error('script failed');
  const stripe = { ready: true };
  let calls = 0;
  const loader = loadLoader(() => {
    calls++;
    if (calls === 1) return Promise.reject(failure);
    if (calls === 2) return Promise.resolve(null);
    if (calls === 3) throw failure;
    return Promise.resolve(stripe);
  });
  await assert.rejects(loader.getStripe('pk_a'), (error) => error === failure);
  assert.equal(await loader.getStripe('pk_a'), null);
  await assert.rejects(loader.getStripe('pk_a'), (error) => error === failure);
  assert.equal(await loader.getStripe('pk_a'), stripe);
  assert.equal(calls, 4);
  assert.equal(loader.pendingTimers(), 0);
});

test('a pending script times out and a late result cannot replace its retry', async () => {
  const old = deferred();
  const retry = deferred();
  let calls = 0;
  const loader = loadLoader(() => ++calls === 1 ? old.promise : retry.promise);
  const first = loader.getStripe('pk_a');
  const timeout = assert.rejects(first, { name: 'StripeLoadTimeoutError', code: 'STRIPE_LOAD_TIMEOUT' });
  await Promise.resolve();
  loader.expire();
  await timeout;
  const second = loader.getStripe('pk_a');
  assert.notEqual(first, second);
  await Promise.resolve();
  old.resolve({ stale: true });
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(loader.getStripe('pk_a'), second);
  const stripe = { fresh: true };
  retry.resolve(stripe);
  assert.equal(await second, stripe);
  assert.equal(calls, 2);
  assert.equal(loader.pendingTimers(), 0);
});

test('late rejection from an expired attempt cannot clear the new successful instance', async () => {
  const old = deferred();
  const stripe = { fresh: true };
  let calls = 0;
  const loader = loadLoader(() => ++calls === 1 ? old.promise : Promise.resolve(stripe));
  const first = loader.getStripe('pk_a');
  const timedOut = assert.rejects(first, { code: 'STRIPE_LOAD_TIMEOUT' });
  await Promise.resolve();
  loader.expire();
  await timedOut;
  const second = loader.getStripe('pk_a');
  assert.equal(await second, stripe);
  old.reject(new Error('late error'));
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(loader.getStripe('pk_a'), second);
  assert.equal(calls, 2);
});

test('a failure for another key cannot invalidate a successful cached instance', async () => {
  const a = deferred();
  const stripeB = { key: 'b' };
  const loader = loadLoader((key) => key === 'pk_a' ? a.promise : Promise.resolve(stripeB));
  const first = loader.getStripe('pk_a');
  const failure = assert.rejects(first, /a failed/);
  const second = loader.getStripe('pk_b');
  assert.equal(await second, stripeB);
  a.reject(new Error('a failed'));
  await failure;
  assert.equal(loader.getStripe('pk_b'), second);
});

test('each wait is bounded even when the SDK retains a permanently pending script', async () => {
  const hung = new Promise(() => {});
  let calls = 0;
  const loader = loadLoader(() => { calls++; return hung; });
  for (let attempt = 0; attempt < 2; attempt++) {
    const waiting = loader.getStripe('pk_a');
    const timedOut = assert.rejects(waiting, { code: 'STRIPE_LOAD_TIMEOUT' });
    await Promise.resolve();
    loader.expire();
    await timedOut;
    assert.equal(loader.pendingTimers(), 0);
  }
  assert.equal(calls, 2);
});
