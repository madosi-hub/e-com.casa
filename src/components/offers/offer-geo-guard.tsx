'use client';

import type { OfferMarketContext } from '@/lib/offers/types';

/**
 * Lightweight, non-visual market context marker for campaign diagnostics and
 * future analytics adapters. It intentionally does not create routing or
 * pricing logic; the existing country engine remains authoritative.
 */
export function OfferGeoGuard({ market }: { market: OfferMarketContext }) {
  return (
    <span
      hidden
      data-offer-country={market.countryCode}
      data-offer-locale={market.locale}
      data-offer-currency={market.currency}
      data-offer-language={market.language}
    />
  );
}
