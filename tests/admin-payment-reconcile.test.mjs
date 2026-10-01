import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

function actionFixture({ authorized = true, payment = null, result = null } = {}) {
  const calls = { auth: 0, refresh: [], redirects: [], revalidated: [] };
  const source = fs.readFileSync('src/app/admin/actions.ts', 'utf8');
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const mocks = {
    'next/cache': { revalidatePath: path => calls.revalidated.push(path) },
    'next/navigation': { redirect: path => { calls.redirects.push(path); throw new Error('REDIRECT'); } },
    '@/lib/db': { db: { payment: { findUnique: async () => payment } } },
    '@/lib/admin/auth': {
      requireAdmin: async () => { calls.auth++; if (!authorized) throw new Error('UNAUTHORIZED'); },
    },
    '@/lib/offers/store': {},
    '@/lib/payments/refunds': {},
    '@/lib/payments/reconcile-payment': {
      refreshOrderPayment: async (orderId, options) => {
        calls.refresh.push({ orderId, options });
        return result;
      },
    },
    '@/lib/tracking': {},
  };
  const compiled = { exports: {} };
  new Function('require', 'module', 'exports', code)(id => {
    assert.ok(id in mocks, `Unexpected dependency: ${id}`);
    return mocks[id];
  }, compiled, compiled.exports);
  const form = new FormData();
  form.set('paymentId', 'cm9xpayment123');
  return { action: compiled.exports.reconcilePaymentAction, calls, form };
}

const storedPayment = {
  orderId: 'order-123', provider: 'xpayments_stripe', order: { orderNumber: 'EC-559989' },
};

test('admin authentication is required before payment lookup', async () => {
  const f = actionFixture({ authorized: false, payment: storedPayment });
  await assert.rejects(f.action(f.form), /UNAUTHORIZED/);
  assert.equal(f.calls.auth, 1);
  assert.equal(f.calls.refresh.length, 0);
});

test('a verified paid payment reconciles only its stored order and reports bridge delivery', async () => {
  const f = actionFixture({
    payment: storedPayment,
    result: { checked: true, changed: true, paymentStatus: 'PAID', providerStatus: 'SUCCEEDED' },
  });
  await assert.rejects(f.action(f.form), /REDIRECT/);
  assert.deepEqual(f.calls.refresh, [{
    orderId: 'order-123', options: { paymentEventDelivery: { attempts: 1, timeoutMs: 8_000 } },
  }]);
  assert.match(f.calls.redirects[0], /reconcile=paid_sent/);
  assert.match(f.calls.redirects[0], /order=EC-559989/);
  assert.ok(f.calls.revalidated.includes('/admin/payments'));
});

test('a successful provider status with missing checkout contact does not claim confirmation', async () => {
  const f = actionFixture({
    payment: storedPayment,
    result: { checked: true, changed: false, paymentStatus: 'PENDING_PAYMENT', providerStatus: 'SUCCEEDED', reason: 'checkout_contact_missing' },
  });
  await assert.rejects(f.action(f.form), /REDIRECT/);
  assert.match(f.calls.redirects[0], /reconcile=contact_missing/);
});

test('an unsupported payment cannot be reconciled', async () => {
  const f = actionFixture({ payment: { ...storedPayment, provider: 'other' } });
  await assert.rejects(f.action(f.form), /REDIRECT/);
  assert.equal(f.calls.refresh.length, 0);
  assert.equal(f.calls.redirects[0], '/admin/payments?reconcile=not_found');
});
