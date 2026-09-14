import { expect, test } from 'bun:test';
import { applyCommerce } from '../src/lib/catalog/commerce';
import { applyBundleOffer, rankAccessories } from '../src/lib/catalog/bundle';
import { isOfferActive, validateProductOffer } from '../src/lib/offers/promotion';
import rows from '../data/catalog/generated-provider-products.json';
import offers from '../data/catalog/product-offers.json';
import type { CatalogProduct } from '../src/lib/catalog/types';

const products = rows as unknown as CatalogProduct[];
const offer = offers[0];
const now = Date.parse(offer.startsAt) + 1000;
const raw = products.find((product) => product.slug === offer.productSlug)!;

test('bundled offer fixtures remain valid and reference catalogue products', () => {
  expect(offers).toHaveLength(10);
  expect(new Set(offers.map((row) => row.slug)).size).toBe(10);

  for (const row of offers) {
    validateProductOffer(row);
    expect(products.some((product) => product.slug === row.productSlug)).toBe(true);
  }

  expect(offers.filter((row) => row.productSlug.startsWith('woodupp-'))).toHaveLength(5);
  expect(
    products
      .filter((product) => product.supplierKey === 'woodupp')
      .every(
        (product) =>
          product.image.startsWith('https://') &&
          product.mediaRights === 'PARTNER_CONFIRMED_BY_MERCHANT',
      ),
  ).toBe(true);
});

test('an active percentage ProductOffer is authoritative for product and variant pricing', () => {
  const product = applyCommerce({ ...raw, funnelOffer: offer }, now);
  expect(product.offerSlug).toBe(offer.slug);
  expect(product.priceCents).toBe(Math.round(raw.priceCents * 0.25));

  for (let index = 0; index < product.variants.length; index += 1) {
    expect(product.priceCents + product.variants[index].priceDeltaCents).toBe(
      Math.round((raw.priceCents + raw.variants[index].priceDeltaCents) * 0.25),
    );
  }

  expect(applyCommerce(product, now + 1000).priceCents).toBe(product.priceCents);
  expect(applyCommerce({ ...product, funnelOffer: { ...offer, enabled: false } }, now).offerSlug).toBeNull();
  expect(applyCommerce(product, Date.parse(offer.endsAt)).priceCents).toBe(raw.priceCents);
  expect(isOfferActive(offer, Date.parse(offer.startsAt) - 1)).toBe(false);
});

test('fixed pricing preserves variant supplements and price modes are mutually exclusive', () => {
  const fixed = { ...offer, discountPct: null, fixedPriceCents: 1000 };
  validateProductOffer(fixed);

  const product = applyCommerce({ ...raw, funnelOffer: fixed }, now);
  expect(product.priceCents).toBe(1000);
  expect(product.variants.map((variant) => variant.priceDeltaCents)).toEqual(
    raw.variants.map((variant) => variant.priceDeltaCents),
  );

  expect(() => validateProductOffer({ ...fixed, discountPct: 75 })).toThrow();
  expect(() => validateProductOffer({ ...offer, discountPct: 100 })).toThrow();
  expect(() => validateProductOffer({ ...offer, endsAt: offer.startsAt })).toThrow();
});

test('a funnel may use the normal product price without a discount', () => {
  const standardPriceOffer = { ...offer, discountPct: null, fixedPriceCents: null };
  expect(() => validateProductOffer(standardPriceOffer)).not.toThrow();

  const product = applyCommerce({ ...raw, funnelOffer: standardPriceOffer }, now);
  expect(product.offerSlug).toBe(standardPriceOffer.slug);
  expect(product.priceCents).toBe(raw.priceCents);
});

test('bundle helpers never introduce hidden discounts and still prioritize matching brands', () => {
  const accessory = products.find(
    (product) => product.categorySlug === 'acessorios-instalacao' && product.brand === 'WoodUpp' && product.priceCents > 0,
  )!;
  const panel = products.find(
    (product) => product.brand === 'WoodUpp' && product.categorySlug === 'paineis-acusticos' && product.priceCents > 0,
  )!;

  const standalone = applyBundleOffer(accessory, [], now);
  const bundled = applyBundleOffer(accessory, [panel], now);
  expect(standalone.priceCents).toBe(accessory.priceCents);
  expect(bundled.priceCents).toBe(accessory.priceCents);
  expect(bundled.promoDiscountPct).toBeNull();

  const odem = products.find(
    (product) => product.brand === 'ODEM' && product.categorySlug === 'acessorios-instalacao',
  )!;
  expect(rankAccessories([odem, accessory], [panel])[0].slug).toBe(accessory.slug);
});
