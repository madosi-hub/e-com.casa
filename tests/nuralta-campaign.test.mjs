import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';

const runtimeRequire = createRequire(import.meta.url);
function load(path, mocks = {}) {
  const code = ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const compiledModule = { exports: {} };
  new Function('require', 'module', 'exports', code)(id => id in mocks ? mocks[id] : runtimeRequire(id), compiledModule, compiledModule.exports);
  return compiledModule.exports;
}
const campaign = load('src/lib/offers/nuralta-campaign.ts');
const { NURALTA_CAMPAIGN: config, campaignState, campaignRemaining } = campaign;
const deadline = Date.parse('2026-10-13T17:00:00Z');

test('every visitor gets the same October 13 deadline at 18:00 mainland Portugal time', () => {
  assert.equal(Date.parse(config.endsAt), deadline);
  assert.equal(new Intl.DateTimeFormat('pt-PT', { timeZone: 'Europe/Lisbon', hour: '2-digit', minute: '2-digit' }).format(new Date(deadline)), '18:00');
  for (const visit of ['2026-10-09T09:00:00Z', '2026-10-12T20:00:00Z', '2026-10-13T16:59:00Z']) {
    const state = campaignState(Date.parse(visit));
    assert.equal(state.active, true);
    assert.equal(Date.parse(state.endsAt), deadline);
  }
});

test('remaining time counts down from the current instant rather than resetting on a visit', () => {
  assert.deepEqual(campaignRemaining(config.endsAt, Date.parse('2026-10-10T08:28:00Z')), { days: 3, hours: 8, minutes: 32, seconds: 0 });
  assert.deepEqual(campaignRemaining(config.endsAt, Date.parse('2026-10-12T08:28:00Z')), { days: 1, hours: 8, minutes: 32, seconds: 0 });
  assert.deepEqual(campaignRemaining(config.endsAt, deadline - 1000), { days: 0, hours: 0, minutes: 0, seconds: 1 });
  assert.deepEqual(campaignRemaining(config.endsAt, deadline + 60000), { days: 0, hours: 0, minutes: 0, seconds: 0 });
});

test('clearance stops exactly at the deadline and does not restart afterwards', () => {
  assert.equal(campaignState(Date.parse(config.startsAt) - 1).active, false);
  assert.equal(campaignState(Date.parse(config.startsAt)).active, true);
  assert.equal(campaignState(deadline - 1).active, true);
  assert.equal(campaignState(deadline).active, false);
  assert.equal(campaignState(deadline + 86400000).active, false);
});

test('server clock endpoint is uncached and independent of visitor cookies or campaign secrets', async () => {
  const route = load('src/app/api/offers/nuralta-campaign/route.ts', {
    'next/server': { NextResponse: Response },
    '@/lib/offers/nuralta-campaign': campaign,
  });
  for (const method of [route.GET, route.POST]) {
    const response = method();
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal(response.headers.get('set-cookie'), null);
    assert.equal(Date.parse((await response.json()).endsAt), deadline);
  }
});

test('checkout uses normal catalogue prices and ignores obsolete 15-euro campaign overrides', async () => {
  const product = { slug: config.productSlug, name: 'Panel', priceCents: 500, price: '5.00', variants: [{ id: 'large', name: 'Large', priceDeltaCents: 800 }], stockUnlimited: true };
  const { repriceCart } = load('src/lib/checkout.ts', {
    './catalog/bundle': { applyBundleOffer: value => value },
    '@/lib/catalog': { getProduct: async slug => slug === config.productSlug ? product : { ...product, slug, priceCents: 300 } },
    '@/lib/catalog/inventory': { hasStock: () => true },
    '@/lib/catalog/saleability': { isCatalogProductSaleable: () => true },
    '@/lib/shipping': { shippingPrice: () => 0 },
    '@/lib/constants': { SHIPPING_OPTIONS: [{ id: 'standard' }], PROMO_CODES: {}, GIFT_WRAP_PRICE: 0 },
    '@/lib/countries': { getCountryConfiguration: () => ({ currency: 'EUR' }) },
  });
  const input = { country: 'PT', shippingMethod: 'standard', items: [{ slug: config.productSlug, quantity: 2, variantId: 'large' }, { slug: 'accessory', quantity: 1 }] };
  const normal = await repriceCart(input);
  const obsolete = await repriceCart({ ...input, unitPriceOverrides: { [config.productSlug]: 1500 } });
  assert.equal(normal.lineItems[0].price, '13.00');
  assert.equal(obsolete.lineItems[0].price, '13.00');
  assert.equal(normal.lineItems[1].price, '3.00');
  assert.equal(normal.total, 29);
  assert.equal(normal.pricingHash, obsolete.pricingHash);
});
