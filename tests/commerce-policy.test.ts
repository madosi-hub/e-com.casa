import { expect, test } from 'bun:test';
import { applyCommerce } from '../src/lib/catalog/commerce';
import { isCatalogProductSaleable } from '../src/lib/catalog/saleability';
import { shippingPrice } from '../src/lib/shipping';
import { calculatePromoDiscount } from '../src/lib/constants';
import { toStorefrontProduct } from '../src/lib/catalog/public-product';
import rows from '../data/catalog/generated-provider-products.json';
import type { CatalogProduct } from '../src/lib/catalog/types';

const products = rows as unknown as CatalogProduct[];
const product = products.find((item) => item.priceCents > 0)!;
const startsAt = '2026-09-01T00:00:00.000Z';
const endsAt = '2026-10-01T00:00:00.000Z';

test('provider snapshot excludes sample records and keeps expected catalogue shape', () => {
  expect(products).toHaveLength(355);
  expect(products.some((item) => item.categorySlug === 'amostras' || /amostra|sample/i.test(item.name))).toBe(false);
  expect(products.filter((item) => item.categorySlug === 'acessorios-instalacao')).toHaveLength(203);
  const nuralta = products.filter((item) => item.supplierKey === 'nuralta');
  expect(nuralta).toHaveLength(3);
  expect(nuralta.find((item) => item.slug === 'nuralta-painel-ripado-decorativo')?.variants).toHaveLength(21);
});

test('base product pricing is unchanged when there is no ProductOffer', () => {
  const priced = applyCommerce(product, Date.parse(startsAt) + 1000);
  expect(priced.priceCents).toBe(product.priceCents);
  expect(priced.offerSlug).toBeNull();
  expect(priced.promoDiscountPct).toBeNull();
  expect(priced.promoEndsAt).toBeNull();
});

test('ProductOffer is the only campaign price source and expires deterministically', () => {
  const offer = {
    productSlug: product.slug,
    slug: 'controlled-campaign',
    enabled: true,
    discountPct: 25,
    fixedPriceCents: null,
    startsAt,
    endsAt,
    version: 1,
  };
  const priced = applyCommerce({ ...product, funnelOffer: offer }, Date.parse(startsAt) + 1000);
  expect(priced.priceCents).toBe(Math.round(product.priceCents * 0.75));
  expect(priced.offerSlug).toBe('controlled-campaign');
  expect(priced.promoDiscountPct).toBe(25);
  expect(priced.promoEndsAt).toBe(endsAt);

  const ended = applyCommerce({ ...product, funnelOffer: offer }, Date.parse(endsAt));
  expect(ended.priceCents).toBe(product.priceCents);
  expect(ended.offerSlug).toBeNull();
});

test('variant supplements follow the ProductOffer rule and remain stable through public serialization', () => {
  const offer = {
    productSlug: product.slug,
    slug: 'fixed-price-campaign',
    enabled: true,
    discountPct: null,
    fixedPriceCents: 1000,
    startsAt,
    endsAt,
    version: 1,
  };
  const priced = applyCommerce({ ...product, funnelOffer: offer }, Date.parse(startsAt) + 1000);
  expect(priced.priceCents).toBe(1000);
  expect(priced.variants.map((variant) => variant.priceDeltaCents)).toEqual(product.variants.map((variant) => variant.priceDeltaCents));
  expect(toStorefrontProduct(priced).priceCents).toBe(1000);
});

test('explicit blocks and unavailable stock prevent purchase', () => {
  expect(isCatalogProductSaleable(product)).toBe(true);
  expect(isCatalogProductSaleable({ ...product, complianceStatus: 'BLOCKED' })).toBe(false);
  expect(isCatalogProductSaleable({ ...product, documentationStatus: 'BLOCKED' })).toBe(false);
  expect(isCatalogProductSaleable({ ...product, priceCents: 0 })).toBe(false);
  expect(isCatalogProductSaleable({ ...product, stockUnlimited: false, stockKnown: true, stock: 0, availability: 'outOfStock' })).toBe(false);
});

test('Portugal and Spain are free while other supported destinations use the configured threshold', () => {
  for (const country of ['PT', 'ES']) {
    expect(shippingPrice(country, 1)).toBe(0);
    expect(shippingPrice(country, 1, 'express')).toBe(0);
  }
  expect(shippingPrice('FR', 50)).toBe(4.9);
  expect(shippingPrice('FR', 50.01)).toBe(0);
  expect(shippingPrice('FR', 49.99)).toBe(4.9);
  expect(shippingPrice('US', 100)).toBe(4.9);
});

test('coupon calculation does not stack on an already discounted line', () => {
  expect(calculatePromoDiscount([
    { slug: 'a', price: '30', quantity: 1, automaticDiscountPct: 25 },
    { slug: 'b', price: '20', quantity: 1 },
  ], { type: 'percent', value: 10, label: 'Welcome' })).toBe(2);
});
