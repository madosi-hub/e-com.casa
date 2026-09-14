export interface ProductOffer {
  productSlug: string;
  slug: string;
  enabled: boolean;
  discountPct: number | null;
  fixedPriceCents: number | null;
  startsAt: string;
  endsAt: string;
  version: number;
}

export function isOfferActive(offer: ProductOffer | null | undefined, now = Date.now()): offer is ProductOffer {
  return Boolean(offer?.enabled && now >= Date.parse(offer.startsAt) && now < Date.parse(offer.endsAt));
}

export function validateProductOffer(offer: ProductOffer) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(offer.slug)) throw new Error('Invalid offer slug');

  const hasPercentage = offer.discountPct !== null;
  const hasFixedPrice = offer.fixedPriceCents !== null;
  if (hasPercentage && hasFixedPrice) throw new Error('Choose either percentage or fixed price');

  if (hasPercentage && (!Number.isInteger(offer.discountPct) || offer.discountPct! < 1 || offer.discountPct! > 99)) {
    throw new Error('Percentage must be 1–99');
  }
  if (hasFixedPrice && (!Number.isInteger(offer.fixedPriceCents) || offer.fixedPriceCents! < 1)) {
    throw new Error('Fixed price must be a positive integer amount in cents');
  }

  const startsAt = Date.parse(offer.startsAt);
  const endsAt = Date.parse(offer.endsAt);
  if (!Number.isFinite(startsAt) || !Number.isFinite(endsAt) || endsAt <= startsAt) {
    throw new Error('Invalid campaign dates');
  }
}
