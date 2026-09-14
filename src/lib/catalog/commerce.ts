import { isOfferActive } from '../offers/promotion';
import type { CatalogProduct } from './types';

export const ACCESSORY_CATEGORIES = [
  'acessorios',
  'produtos-instalacao',
  'acessorios-divisorias',
  'acessorios-instalacao',
];

export const isAccessory = (product: Pick<CatalogProduct, 'categorySlug'> & { name?: string }) =>
  ACCESSORY_CATEGORIES.includes(product.categorySlug) || /acessórios|ripa de fixação/i.test(product.name ?? '');

export const isSample = (product: Pick<CatalogProduct, 'categorySlug'> & { name?: string }) =>
  product.categorySlug === 'amostras' || /\b(amostras?|samples?)\b/i.test(product.name ?? '');

export function applyCommerce(product: CatalogProduct, now = Date.now()): CatalogProduct {
  const base = product.regularPriceCents ?? product.priceCents;
  const offer = isOfferActive(product.funnelOffer, now) ? product.funnelOffer : null;
  const fixed = offer?.fixedPriceCents ?? null;
  const percentage = offer?.discountPct ?? null;

  let cents = base;
  if (fixed !== null) cents = fixed;
  else if (percentage !== null) cents = Math.round(base * (100 - percentage) / 100);

  return {
    ...product,
    regularPriceCents: base,
    offerSlug: offer?.slug ?? null,
    priceCents: cents,
    price: (cents / 100).toFixed(2),
    comparePrice: null,
    promoDiscountPct: offer ? percentage ?? (fixed !== null && base > 0 ? Math.round((1 - fixed / base) * 100) : null) : null,
    promoEndsAt: offer ? offer.endsAt : null,
    variants: product.variants.map((variant) => {
      const delta = variant.regularPriceDeltaCents ?? variant.priceDeltaCents ?? 0;
      const regularVariantPrice = base + delta;
      const campaignVariantPrice = fixed !== null
        ? fixed + delta
        : percentage !== null
          ? Math.round(regularVariantPrice * (100 - percentage) / 100)
          : regularVariantPrice;

      return {
        ...variant,
        regularPriceDeltaCents: delta,
        priceDeltaCents: campaignVariantPrice - cents,
      };
    }),
  };
}
