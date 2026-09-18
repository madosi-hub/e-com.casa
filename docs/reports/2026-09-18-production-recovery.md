# Production recovery report — 18 September 2026

## Executive summary

This maintenance release restores reliable catalogue delivery and removes a runtime failure from the dedicated Nuralta offer. The changes are deliberately narrow: the product-page work introduced in `feature/pagina-produto`, including its responsive gallery behaviour, media assets and layout decisions, remains in place.

## Incident findings

### Nuralta offer

The gallery was reduced from eight to seven entries while the configurator continued to select the former eighth position. The resulting undefined gallery item caused the offer to fail before the customer could configure the product.

### Catalogue delivery

The catalogue service selected PostgreSQL after a successful health check and then loaded every page concurrently. With the production catalogue this generated a burst of database operations during a cold request. A later read failure was not recovered through the bundled provider snapshot, so the API could return an empty 503 response and server-rendered pages could fail.

## Corrections

- The Nuralta configurator now derives its initial image from the current gallery length and retains a defensive fallback.
- The responsive swipe behaviour and the media set from the partner implementation are preserved.
- PostgreSQL remains the authoritative source when it is available.
- The normalized database catalogue is now loaded with one product query instead of a page fan-out.
- Concurrent cold requests share the same in-flight catalogue load.
- The provider snapshot is merged behind PostgreSQL so newly synchronized database records retain priority.
- Product and category reads recover through the provider snapshot if PostgreSQL becomes unavailable after its health check.
- Database recovery state is time-bound, allowing PostgreSQL to be retried automatically.

## Regression coverage

- Gallery tests verify that the initial Nuralta media index always points to an existing item.
- Catalogue resilience tests simulate a database interruption, verify that concurrent callers share one database attempt and confirm that the provider catalogue remains available.
- Existing offer, pricing, inventory, checkout and funnel contract tests remain part of the validation command.

## Pre-release validation

- ESLint: passed.
- TypeScript (`tsc --noEmit`): passed.
- Commerce and catalogue suite: 24 tests passed, 0 failed.
- Local Next.js compilation reached the external font acquisition step; the restricted validation runner could not establish TLS connections to Google Fonts. The production build remains the deployment gate in Vercel, where these fonts were already building successfully.

## Operational result

The storefront now has a controlled degradation path: a temporary database interruption can remove database-only administrative updates until the next health retry, but it no longer removes the complete public catalogue. No payment, checkout, promotion, product-pricing or inventory rules were relaxed by this release.
