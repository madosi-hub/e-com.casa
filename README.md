# E-com.casa

E-com.casa is a Next.js commerce application for home and interior products sold across European markets. The application combines a product catalogue, product pages, campaign funnels, cart and checkout, payment processing, order lifecycle, tracking, customer contact tools and an internal operations panel.

This repository is intended to be maintained by the development, marketing and sales operations teams. Routine catalogue, price, campaign and order operations belong in the application database and `/admin`; Git should be reserved for application code, templates, infrastructure and reviewed configuration changes.

## 1. Technology stack

| Area | Technology |
| --- | --- |
| Application | Next.js 16, App Router, React 19 |
| Language | TypeScript |
| Styling | Tailwind CSS 4, Radix UI / shadcn-style components |
| Database | PostgreSQL on Supabase |
| ORM | Prisma |
| Hosting | Vercel |
| Payments | XPayments Stripe-compatible API and Stripe Elements |
| Transactional email | Resend |
| Client state | Zustand |
| Storefront concierge | Optional server-side `z-ai-web-dev-sdk` integration |

Production architecture:

```text
GitHub
  -> Vercel
      -> Next.js application
          -> Supabase PostgreSQL
          -> XPayments payment API
          -> Resend
```

The application uses `DATABASE_URL` as its runtime database contract. Vercel should use a Supabase pooled PostgreSQL connection. Direct or session connections should be reserved for database migrations and maintenance operations.

## 2. Main application areas

### Storefront

Core routes:

```text
/                         Home
/shop                     Catalogue
/product/[slug]            Product detail
/search                    Product search
/cart                      Cart
/checkout                  Checkout
/offers                    Active funnels
/offers/[slug]              Sales funnel
/track                     Order tracking
/account/orders            Buyer order access
/legal/*                   Legal information
/admin                     Internal operations
```

### Commerce flow

The critical purchase path is:

```text
Catalogue / Funnel
  -> Cart
  -> Checkout creation
  -> PaymentIntent creation
  -> Payment provider
  -> Verified webhook
  -> Order becomes PAID
  -> Stock / tracking / fulfilment
  -> Transactional communication
```

An order must never be considered paid because of a browser redirect or a manual admin action. The payment status becomes `PAID` only through a verified provider event.

## 3. Repository structure

```text
src/
  app/
    api/                    Public and internal route handlers
    admin/                  Internal operations panel
    offers/[slug]/          Dynamic sales funnel route
    product/[slug]/         Product detail
    checkout/               Checkout UI
    ...                     Storefront routes
  components/
    cart/
    chat/
    cookie/
    home/
    layout/
    offers/
    payments/
    product/
    ui/
  lib/
    admin/                  Admin authentication
    catalog/                Catalogue domain and adapters
    offers/                 Funnel resolution, pricing and audit
    payments/               Payment provider and reconciliation
    db.ts                   Prisma client
    tracking.ts             Fulfilment and tracking logic
prisma/
  schema.prisma             Application database model
  migrations/               Prisma migration history
  seed.ts                   Catalogue bootstrap utility
data/catalog/
  generated-provider-*.json Bundled emergency catalogue fallback
tests/                      Commerce and funnel tests
```

## 4. Database model

The primary application models are:

### Catalogue

- `Product`
- `Category`
- `Review`

### Campaigns and funnels

- `ProductOffer`
- `ProductOfferAudit`

### Orders and payments

- `Order`
- `Payment`
- `PaymentAttempt`
- `Refund`
- `Invoice`
- `CreditNote`
- `WebhookEvent`

### Fulfilment

- `TrackingEvent`

### Marketing and support

- `NewsletterSubscriber`
- `ContactMessage`

Supabase PostgreSQL is the mutable source of truth. The JSON files under `data/catalog/` are a read-only fallback for storefront availability if the database cannot be reached. When PostgreSQL is healthy, the application does not merge those files into the live catalogue.

## 5. Product lifecycle

A product has two separate concepts that should not be confused:

1. Operational information: supplier, stock, media, documentation, compliance and internal traceability.
2. Publication: whether the product is intentionally available to the storefront.

`Product.published` is the explicit merchant publication flag.

A product is eligible for the storefront when it is published, is not a demo/sample record, has a valid price and is not explicitly blocked. Stock and availability rules are then applied normally.

This design deliberately avoids a hardcoded supplier whitelist. Adding a new supplier does not require changing storefront code.

## 6. Adding a product

### Preferred workflow: Admin

Open:

```text
/admin/products/new
```

Create the product as a draft first. At minimum confirm:

- product name;
- unique slug;
- unique SKU;
- base price and currency;
- category;
- main image;
- description;
- stock model;
- supplier/manufacturer where applicable;
- variants;
- compliance/documentation status.

After commercial and operational review, set `Published` and save.

The storefront will then use the product directly from PostgreSQL. No Git commit or catalogue snapshot regeneration is required for normal product creation.

### Variants

Variants are stored in `variantsJson`. The value must be a JSON array. A typical variant is:

```json
[
  {
    "id": "oak-240",
    "type": "colour",
    "name": "Natural Oak",
    "value": "natural-oak",
    "priceDeltaCents": 0,
    "availability": "inStock",
    "image": "https://..."
  }
]
```

Keep variant IDs stable after orders have been created. Price deltas are expressed in cents.

### Media

`image` is the primary product image. `gallery` contains comma-separated image URLs. Remote hosts must also be allowed in `next.config.ts` if Next Image will optimize those assets.

Do not commit credentials, signed private URLs or supplier back-office links as media references.

### Direct database work

Direct SQL or Prisma scripts may be used for controlled bulk imports, but the resulting records must follow the same field rules as the admin workflow. Bulk jobs should be idempotent and reviewed before production execution.

## 7. Pricing

`Product.price` and `Product.priceCents` hold the base selling price.

Routine pricing should be changed in `/admin/products`.

Campaign pricing belongs to `ProductOffer`, not to hidden code rules or generated JSON. An active offer can use:

- the product base price;
- one percentage discount; or
- one fixed campaign price.

The cart and checkout always reprice server-side before payment. Client-side displayed values are never authoritative for the amount charged.

## 8. Sales funnels

Public funnels use:

```text
/offers/[slug]
```

`ProductOffer` controls the commercial state:

- `productSlug`: linked product;
- `slug`: public funnel URL;
- `enabled`: operational switch;
- `discountPct`: optional percentage discount;
- `fixedPriceCents`: optional fixed campaign price;
- `startsAt` / `endsAt`: schedule;
- `version`: optimistic locking for concurrent edits.

Every write through the admin application creates a `ProductOfferAudit` record with the operator and before/after state.

### Create or edit a funnel in Admin

Use:

```text
/admin/funnels
/admin/funnels/new
```

A funnel may be enabled while using the ordinary product price. Discounts are optional.

Disabling or allowing a campaign to expire removes the public funnel without needing a deployment.

### Funnel presentation templates

The route is resolved in:

```text
src/app/offers/[slug]/page.tsx
src/lib/offers/resolver.ts
src/components/offers/product-funnel-page.tsx
```

The default product funnel uses the reusable panel funnel presentation. Nuralta has a dedicated presentation while still using `ProductOffer` for activation, schedule and price control.

### Add another funnel with the existing template

If the new campaign can use the current generic layout:

1. publish the product;
2. create a `ProductOffer` in Admin;
3. choose the public slug and schedule;
4. enable the funnel;
5. validate `/offers/[slug]`, cart and checkout.

No new page component is required.

### Add a new visual funnel template

When a campaign requires a materially different design:

1. create a component under `src/components/offers/`;
2. keep catalogue and price data supplied through `CatalogProduct` and `OfferConfig`;
3. add a deterministic template selection rule in `product-funnel-page.tsx`;
4. do not duplicate checkout, cart or payment logic inside the funnel;
5. keep the funnel URL controlled by `ProductOffer`;
6. add tests for rendering, price and cart behaviour.

A funnel should be a presentation and conversion layer over the same commerce engine, not a separate ecommerce implementation.

## 9. Admin operations

`/admin` is intentionally separate from the storefront chrome and is not indexed.

Authentication uses one fixed team password stored as a deployment secret:

```text
ADMIN_PASSWORD
```

Sessions are signed and stored in an HTTP-only cookie. Configure a separate signing secret:

```text
ADMIN_SESSION_SECRET
```

Use `ADMIN_OPERATOR` to identify the team/operator in funnel audit records.

Current admin modules:

```text
/admin                  Dashboard
/admin/products         Catalogue and pricing
/admin/funnels          Funnels and campaign pricing
/admin/orders           Orders and fulfilment
/admin/payments         Payment and refund records
/admin/customers        Customer summary from order history
/admin/contacts         Contact messages and newsletter totals
```

### Product permissions

Admin can:

- create and edit products;
- publish or archive products;
- change base price;
- update stock and availability;
- manage media and variants;
- maintain supplier and compliance metadata.

### Orders

Admin can:

- inspect buyer and order details;
- update fulfilment status after payment is verified;
- manage tracking fields;
- review tracking history.

A paid order should be refunded before fulfilment is cancelled.

### Payments

Admin can inspect:

- provider status;
- PaymentIntent ID;
- amount and payment method;
- attempts;
- refunds;
- associated order.

Admin cannot manually mark an order `PAID`. This is an intentional financial integrity rule.

### Refunds

Refunds are executed from the order detail page. The application calls the payment provider and persists the result in the same workflow. A successful refund also creates the internal credit-note record.

Never implement a “refund” button that only changes database status without contacting the provider.

## 10. Payment architecture

Browser payment UI uses Stripe Elements while the server communicates with the XPayments Stripe-compatible API.

Relevant routes:

```text
POST /api/checkout/create
POST /api/payments/create-intent
GET  /api/payments/status
GET  /api/payments/capabilities
GET  /api/payments/health
POST /api/webhooks/xpayments
```

Payment lifecycle and fulfilment lifecycle are separate.

Typical payment states include:

```text
PENDING_PAYMENT
PAYMENT_PROCESSING
PAID
PAYMENT_FAILED
CANCELLED
REFUNDED
PARTIALLY_REFUNDED
```

`PAID` is established by a verified webhook/reconciliation path. Webhook processing is idempotent through `WebhookEvent`.

Amounts sent to the provider use integer minor units. Do not introduce floating-point gateway amounts.

## 11. Tracking and fulfilment

Tracking data is stored on `Order` and in `TrackingEvent`.

The current implementation includes an internal fulfilment timeline that can assign tracking information after verified payment and advance delivery states. This is an integration boundary, not a substitute for a real carrier API.

When a production 3PL/carrier integration is introduced:

- keep `Order` and `TrackingEvent` as the application-facing contract;
- replace simulated event generation with authenticated carrier events;
- preserve idempotency;
- preserve monotonic fulfilment transitions;
- never create shipment lifecycle events for unpaid orders.

## 12. Storefront catalogue service

Storefront code should access products through:

```text
src/lib/catalog/service.ts
```

Do not scatter direct Prisma catalogue queries through UI components.

The catalogue service chooses:

1. PostgreSQL when the database is healthy and contains published products;
2. the bundled provider snapshot only as an emergency read fallback.

The fallback is intentionally read-only. Product operations belong in PostgreSQL/Admin.

## 13. Storefront concierge

`/api/chat` provides an optional catalogue-aware shopping concierge. The provider runs server-side and should never receive application secrets from the browser.

The feature can be disabled with:

```text
NEXT_PUBLIC_CHAT_ENABLED=false
```

The concierge is advisory. It does not set prices, create products, publish catalogue records or alter orders.

## 14. Working on the project manually or with coding assistants

Normal engineering workflow:

1. create a feature branch;
2. make the smallest coherent code change;
3. run lint, tests and build;
4. review database and payment implications;
5. open a pull request;
6. validate the Vercel preview;
7. merge after review.

Coding assistants can be used for implementation, refactoring, test generation and documentation, but the repository should remain tool-neutral. Do not commit conversation transcripts, generated planning notes, assistant-specific filenames, temporary migration endpoints or prompts.

When using an assistant, give it the same boundaries expected from a developer:

- read this README first;
- treat Supabase as the catalogue source of truth;
- preserve the checkout/payment integrity rules;
- do not invent product, legal, payment or supplier facts;
- do not commit secrets;
- do not change a live payment state manually;
- use branch/PR workflow for code changes;
- validate build and tests before merge.

For a request such as “add a new product funnel”, specify whether the existing funnel layout should be reused or a new visual template is required. The assistant should not duplicate commerce infrastructure merely to produce a new landing page.

## 15. Environment variables

Copy `.env.example` for local setup. Production secrets belong in Vercel.

Required groups:

### Database

```text
DATABASE_URL
DIRECT_URL                optional for maintenance/migrations
```

### Admin

```text
ADMIN_PASSWORD
ADMIN_SESSION_SECRET
ADMIN_OPERATOR
```

### Payments

```text
PAYMENT_ENVIRONMENT
XPAYMENTS_STRIPE_BASE_URL
XPAYMENTS_API_KEY
XPAYMENTS_STORE_ID
NEXT_PUBLIC_XPAYMENTS_STRIPE_PUBLISHABLE_KEY
XPAYMENTS_WEBHOOK_SECRET
STRIPE_API_VERSION
```

### Email

```text
RESEND_API_KEY
```

### Site and optional integrations

```text
NEXT_PUBLIC_SITE_URL
NEXT_PUBLIC_INDEXING_ENABLED
NEXT_PUBLIC_ANALYTICS_ENABLED
NEXT_PUBLIC_CHAT_ENABLED
NEXT_PUBLIC_GA_ID
NEXT_PUBLIC_META_PIXEL_ID
```

Do not expose server secrets through `NEXT_PUBLIC_*` variables.

## 16. Local development

Bun is used by the project scripts and tests.

```bash
bun install
cp .env.example .env
bunx prisma generate
bun run dev
```

Useful commands:

```bash
bun run lint
bun run build
bun run test:catalog
bun run db:status
bun run db:migrate
bun run db:migrate:deploy
```

Avoid `db:push` against production as a routine workflow. Production schema changes should be reviewed migrations.

## 17. Supabase and Prisma

For Vercel runtime traffic, use the Supabase transaction pooler connection recommended for serverless workloads. Prisma transaction-pooler connections should disable prepared statements according to the active Supabase/Prisma connection guidance.

Use a direct/session connection for migrations when required.

The current production database is already provisioned and the repository's Prisma migrations are incremental; they are not yet a complete fresh-database baseline. Before running `prisma migrate deploy` against a brand-new database, establish and review a baseline from `prisma/schema.prisma`. Do not treat the incremental migration directory as a complete bootstrap for an empty production database.

Schema changes must be represented in `prisma/schema.prisma` and in the production migration process. Do not make undocumented structural changes directly in Supabase Studio.

## 18. Deployment to Vercel

For a new environment:

1. connect the target GitHub repository to a new Vercel project;
2. configure all environment variables;
3. keep indexing disabled while validating;
4. deploy to the Vercel preview/temporary hostname;
5. verify database connectivity and catalogue count;
6. test at least one product, one funnel, cart and checkout;
7. verify payment configuration and webhook destination;
8. verify admin login and read/write operations;
9. confirm email delivery configuration;
10. move custom domains only after the new environment is accepted.

Recommended cutover order:

```text
new GitHub
  -> new Vercel
  -> Supabase validation
  -> checkout/payment validation
  -> domain cutover
```

Keep the previous environment available for rollback until the new production path is stable.

## 19. Release validation

Before a production release, verify:

```text
bun run lint
bun run test:catalog
bun run build
```

Then smoke-test:

```text
/
/shop
/product/[known-product]
/offers
/offers/[active-funnel]
/cart
/checkout
/api/products
/api/payments/health
/admin
```

For payment releases also validate:

- PaymentIntent creation;
- webhook signature verification;
- order transition to `PAID` only after provider verification;
- refund path in a controlled environment;
- no secrets in browser bundles or logs.

## 20. Operating principles

The following rules are architectural, not stylistic:

- PostgreSQL is the source of truth for mutable commerce data.
- Product publication is explicit and controlled in Admin.
- Funnels do not duplicate checkout or payment infrastructure.
- Campaign prices come from `ProductOffer`.
- Checkout reprices server-side.
- Payment success comes from the provider, not Admin or browser redirects.
- Refunds must reach the provider before local financial state is changed.
- Secrets are deployment configuration, never repository content.
- Public product responses must not expose supplier or compliance internals.
- Routine catalogue operations should not create Git commits or deployments.

These boundaries allow development, marketing and sales operations to work on the same platform without coupling day-to-day commercial changes to software releases.
