# Email operations integration

## Activation (no database migration)

This integration uses **only existing `ContactMessage`, `Order`, `NewsletterSubscriber`, and `WebhookEvent` tables**. Do not run a migration or `db push` for this feature. Email events have `provider = "resend"` and IDs prefixed `resend:`; they are isolated from payment webhook records.

1. Set `RESEND_API_KEY` on the server/deployment. Use a Resend key authorized to send from the verified store domain and to read received/sent emails. Never expose this key in a `NEXT_PUBLIC_*` variable.
2. Verify the sending domain and the existing store addresses from `src/lib/company.ts` (`orders@e-com.casa`, `support@e-com.casa`). Configure Resend Receiving and its DNS/MX records deliberately; do not replace an existing mailbox provider's MX records without planning mail routing.
3. Register the HTTPS webhook URL **`https://e-com.casa/api/webhooks/resend`** (use the appropriate deployment hostname for staging).
4. Set that endpoint's signing secret in `RESEND_WEBHOOK_SECRET`. It must be the `whsec_...` signing secret, not the API key.
5. Subscribe to `email.received`, `email.sent`, `email.delivered`, `email.delivery_delayed`, `email.bounced`, `email.complained`, `email.opened`, `email.clicked`, `email.failed`, `email.scheduled`, and `email.suppressed`.
6. Verify with a staging/test-domain received message and an intentional staging send. No live sending, account configuration, DNS edits, or database writes were performed during implementation/testing.

Contacts submitted through the website remain available when Resend is unavailable. Configuration flags indicate presence of environment configuration, **not** a successful domain/API health check.

## Admin API contract and security

`src/app/admin/email-actions.ts` exports `loadContacts`, `loadContact`, `searchContactOrders`, `linkContactOrder`, `replyToContact`, `loadEmailActivity`, and `syncEmailInbox`. Every action independently calls `requireAdmin()` before accessing the service. Actions execute against `/admin` pages so the existing `/admin`-scoped session cookie applies. Next Server Actions provide the Origin/Host CSRF check; do not replace these actions with unauthenticated `/api/admin` handlers or broadly relax allowed origins.

Inputs are validated server-side. Replies accept only a contact ID, plain-text message (1–20,000 characters), and stable request ID; recipient, from address, subject, thread headers, and stored order reference come from server-owned records. No client-supplied recipient is used. Replies use `In-Reply-To` with the provider inbound RFC Message-ID and validated `References` from its headers. Website form contacts have no fabricated Message-ID.

Search matches case-insensitive order email or explicit stored order reference. Only captured purchases (paid timestamp or paid/refunded payment state) appear in purchase summaries; checkout drafts are excluded. Matching multiple orders does not auto-assign a link. Manual linking/unlinking writes only `ContactMessage.orderRef`. Admin order search can locate a different customer's placed order for deliberate correction; the UI must explicitly confirm mismatches.

Email and contact bodies returned to the UI are plain text. Incoming HTML-only bodies are reduced to readable text; scripts/styles and tags are removed, entities decoded, and retained bodies capped at 100,000 characters. The receiving API requests `html_format=cid`, avoiding embedded base64 image inflation. **Never render these strings with `dangerouslySetInnerHTML`.**

## Delivery, reservations, and status

Transactional order templates and boolean callers are unchanged; sends now pass through tracked delivery with stable order/type/tracking/refund keys and Resend `Idempotency-Key`. An accepted API response means **accepted**, not delivered. Confirmed states are obtained from authenticated webhooks or explicit historical synchronization. Local reservations, definite 4xx failures (`failed`), ambiguous transport/provider failures (`failed_or_uncertain`), acceptance, and provider confirmation are distinct. Provider body/error text and credentials are never returned to the browser.

Reply request IDs must be stable across retries of the same draft. A durable reservation is inserted **before** sending, under a PostgreSQL advisory transaction lock; concurrent calls and reused IDs cannot send twice. Reusing a request ID with different content is rejected. A global durable budget permits 10 admin replies per minute across runtime instances. The provider request has a 10-second timeout and does not automatically retry.

The UI retains the draft for failed, reserved, and uncertain outcomes and never labels those outcomes as accepted. A definite rejected send can be deliberately prepared as a new attempt with a new request ID; uncertain/reserved outcomes retain the same request ID. Message direction is labelled Entrada/Saída independently of delivery status.

The reservation is intentionally not automatically released or replayed after a crash/timeout. A process crash between reservation and provider call can therefore leave an unsent `reserved` record. This conservative at-most-once policy prevents a delayed retry from duplicating a message after provider idempotency retention expires. Check Resend and local history before deciding to issue a new request ID. Definite failed messages also require a deliberate new attempt after correcting the problem.

A storage failure **before** reservation prevents sending; transactional functions return false without interrupting payment completion. A tracking update failure **after** provider acceptance cannot turn that accepted send into a payment error or trigger another send. The durable reservation remains, and the provider `ecom_send` correlation tag lets later webhooks reconcile its state without creating duplicate activity rows. If there is no provider webhook/API evidence, the system does not claim delivery.

## Receiving and retry recovery

The webhook verifies raw request bytes using Svix HMAC-SHA256, constant-time signature comparison, signature rotation support, and a ±5-minute timestamp tolerance. Bodies are streamed with a 256,000-byte cap. Invalid/malformed requests return 400; missing configuration returns 503. Provider retrieval/storage problems return 503 so Resend can retry.

`email.received` metadata is insufficient to create a complete contact. The service retrieves the received body from the fixed `api.resend.com` endpoint **before** committing the inbound record/contact/event. A failed retrieval is not marked processed. Successful inbound/contact/webhook records commit together in a transaction; provider email IDs and Svix event IDs deduplicate retries, including concurrent webhook/import calls.

Only needed safe fields are retained. Raw signed download URLs, arbitrary headers, HTML, and attachment contents/URLs are not retained. No attachment or payload URL is fetched. Attachments are currently **unsupported** for preview, sending, download, and forwarding.

## Explicit historical sync and retention limits

`syncEmailInbox` performs one bounded page per action. It first imports received messages with body retrieval, then walks historical sent metadata. It never sends email. Pages contain at most 10 messages. Provider calls are serial with 600 ms pacing in the default sync path; other concurrent account traffic can still produce 429, which returns a safe error. Retry the same cursor after an error: already committed messages are deduplicated, and a failed page does not falsely advance the cursor.

Treat `nextCursor` as opaque and keep requesting it only while `hasMore` is true. `inbox:<provider-id>` continues inbound pagination, `sent` transitions to sent history, and `sent:<provider-id>` continues sent pagination. At the inbound-to-sent transition `hasMore = true` means the sent-history phase remains, not that the received endpoint reported another page. Provider `has_more` controls each phase; empty pages claiming more results are rejected. `imported` counts newly inserted durable messages in that action, not skipped duplicates.

Historical sent records contain recipient/subject/time/provider last state, **not historical bodies**. Locally tracked body and order/contact links remain authoritative when merged with historical provider states. The local activity page reports accurate deduplicated local totals and filters; it does not imply complete provider history. Received/sent backfill cannot recover emails already outside provider retention, so `historyLimited` remains true. There is no automatic background polling, attachment recovery, or retention/deletion job. Local email/contact PII requires the store's existing access and data-retention controls. Activity currently folds all stored Resend history in memory to preserve exact totals without a schema change; at larger volume a separately approved indexed storage/pagination design will be needed.

## Verification

```bash
node --test tests/email-integration.test.mjs
node --test tests/*.test.mjs
npx tsc --noEmit --incremental false
npm run lint
```

Unit tests exercise real TypeScript service code via installed TypeScript transpilation, injecting an in-memory persistence boundary and fake provider transport. They do not connect to the store database or send real email. Red-before-green runs were performed for implementation and review fixes.

`tests/email-postgres.test.mjs` is an opt-in integration test, requiring `EMAIL_TEST_DATABASE_URL` to target a disposable **local** database named `ecom_email_verification`; it refuses the normal application `DATABASE_URL`. It reproduces the existing ContactMessage/WebhookEvent fields there and verifies real Prisma transactions, advisory locks, concurrent reservation/inbound deduplication, retrieval failure recovery, and delivery reconciliation. This test passed against isolated PostgreSQL 17 in Docker with a test-double email transport. Advisory-lock queries explicitly cast PostgreSQL's `void` result to `text`, which Prisma can deserialize. Never run this test against production.

The actual React inbox components were also exercised in a local browser fixture with clearly labelled fictitious data: desktop/mobile rendering, order association, safe text display, retained uncertain-send drafts and no horizontal mobile overflow. This is not evidence of a live Resend delivery or an authenticated production session. Activation still requires staging verification of the provider/domain/account permissions and configuration.

## Official references consulted

- Resend `api-reference/emails/list-emails.md`
- Resend `api-reference/emails/list-received-emails.md`
- Resend `api-reference/emails/retrieve-received-email.md`
- Resend `dashboard/receiving/reply-to-emails.md`
- Resend `webhooks/verify-webhooks-requests.md`
- Resend `webhooks/emails/received.md`
- Installed Next.js `node_modules/next/dist/docs/01-app/02-guides/server-actions.md`
