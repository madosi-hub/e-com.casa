import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import ts from 'typescript';

const require = createRequire(import.meta.url);
function load(file, mocks = {}) {
  const filename = path.resolve(file);
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const compiledModule = { exports: {} };
  const local = name => name in mocks ? mocks[name] : name === 'server-only' ? {} : name.startsWith('.') ? load(path.resolve(path.dirname(filename), `${name}.ts`), mocks) : require(name);
  new Function('require', 'module', 'exports', code)(local, compiledModule, compiledModule.exports);
  return compiledModule.exports;
}

// Opt-in only: never use DATABASE_URL or the application database.
const url = process.env.EMAIL_TEST_DATABASE_URL;
test('real PostgreSQL reservations and concurrent inbox retries remain idempotent', { skip: !url }, async () => {
  const target = new URL(url);
  assert.ok(['localhost', '127.0.0.1'].includes(target.hostname), 'Use an isolated local test database');
  assert.equal(target.pathname, '/ecom_email_verification', 'Refuse the application database');
  const db = new PrismaClient({ datasourceUrl: url });
  try {
    // Reproduce existing model fields in a disposable database, not a schema migration.
    await db.$executeRawUnsafe('CREATE TABLE IF NOT EXISTS "WebhookEvent" ("id" TEXT PRIMARY KEY, "provider" TEXT NOT NULL DEFAULT \'xpayments_stripe\', "type" TEXT NOT NULL, "payloadJson" TEXT NOT NULL, "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP)');
    await db.$executeRawUnsafe('CREATE TABLE IF NOT EXISTS "ContactMessage" ("id" TEXT PRIMARY KEY, "name" TEXT NOT NULL, "email" TEXT NOT NULL, "orderRef" TEXT, "subject" TEXT NOT NULL, "message" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP)');
    const token = randomUUID();
    const { sendTracked } = load('src/lib/email/tracking.ts');
    const { processWebhook } = load('src/lib/email/inbox.ts');
    const { createEmailOperations } = load('src/lib/email/operations.ts', {
      '@/lib/company': load('src/lib/company.ts'),
      '@/lib/order-visibility': load('src/lib/order-visibility.ts'),
    });
    let sends = 0;
    const input = { key: `test-${token}`, from: 'support@example.test', to: ['buyer@example.test'], subject: 'Test only', text: 'Isolated verification', type: 'reply', requireTracking: true };
    const fakeProvider = async () => { sends++; return { id: token }; };
    const results = await Promise.all([sendTracked(db, input, fakeProvider), sendTracked(db, input, fakeProvider)]);
    assert.equal(sends, 1);
    assert.ok(results.some(email => email.status === 'accepted'));
    const retained = await sendTracked(db, input, fakeProvider);
    assert.equal(retained.status, 'accepted');
    assert.equal(sends, 1);
    const received = { id: `in-${token}`, from: 'Buyer <buyer@example.test>', to: ['support@example.test'], subject: 'Test only', created_at: new Date().toISOString(), text: 'Received fixture', message_id: `<${token}@example.test>` };
    const event = { type: 'email.received', created_at: received.created_at, data: { email_id: received.id } };
    await assert.rejects(processWebhook(db, `msg-retry-${token}`, event, async () => { throw new Error('Test retrieval failure'); }));
    assert.equal(await db.webhookEvent.count({ where: { id: `resend:webhook:msg-retry-${token}` } }), 0);
    await Promise.all([processWebhook(db, `msg-retry-${token}`, event, async () => received), processWebhook(db, `msg-other-${token}`, event, async () => received)]);
    assert.equal(await db.contactMessage.count({ where: { message: 'Received fixture', subject: 'Test only', createdAt: new Date(received.created_at) } }), 1);
    await processWebhook(db, `msg-delivery-${token}`, { type: 'email.delivered', created_at: new Date().toISOString(), data: { email_id: token } });
    const activity = await createEmailOperations(db).loadEmailActivity({ query: 'Isolated verification' });
    assert.equal(activity.emails.find(email => email.emailId === token)?.status, 'delivered');
    console.log('Isolated PostgreSQL: durable send, real advisory locks, concurrent inbound deduplication, retry recovery and delivery reconciliation passed; provider transport is a test double.');
  } finally {
    await db.$disconnect();
  }
});
