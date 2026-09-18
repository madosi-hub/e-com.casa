import { expect, mock, test } from 'bun:test';
import { isOfferRouteEnabled, NURALTA_OFFER_SLUG } from '../src/lib/offers/route-policy';
import type { ProductOffer } from '../src/lib/offers/promotion';

mock.module('@/lib/db', () => ({
  db: {
    productOffer: {
      findMany: async () => {
        throw new Error('simulated database interruption');
      },
    },
  },
}));

const { getProductOffers } = await import('../src/lib/offers/store');

const inactiveOffer: ProductOffer = {
  productSlug: 'nuralta-painel-ripado-decorativo',
  slug: NURALTA_OFFER_SLUG,
  enabled: false,
  discountPct: null,
  fixedPriceCents: null,
  startsAt: '2026-01-01T00:00:00.000Z',
  endsAt: '2030-01-01T00:00:00.000Z',
  version: 1,
};

test('campaign reads fail closed without propagating a storefront exception', async () => {
  expect(await getProductOffers()).toEqual([]);
});

test('the dedicated Nuralta funnel remains available at regular price when campaign state is missing', () => {
  expect(isOfferRouteEnabled(NURALTA_OFFER_SLUG, undefined)).toBe(true);
  expect(isOfferRouteEnabled('another-campaign', undefined)).toBe(false);
});

test('an explicit admin switch-off still disables the dedicated funnel', () => {
  expect(isOfferRouteEnabled(NURALTA_OFFER_SLUG, inactiveOffer)).toBe(false);
});
