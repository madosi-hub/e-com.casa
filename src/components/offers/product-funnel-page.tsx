'use client';

import { PainelRipadoOfferPage } from './painel-ripado/page';
import { FadoOfferPage } from './fado/page';
import { FADO_OFFER_SLUG } from '@/lib/offers/route-policy';
import type { CatalogProduct } from '@/lib/catalog/types';
import type { OfferConfig, OfferMarketContext } from '@/lib/offers/types';

/** Dedicated product families keep their own content and purchase controls. */
export function ProductFunnelPage(props: { product: CatalogProduct; offer: OfferConfig; market: OfferMarketContext; accessories?: CatalogProduct[] }) {
  if (props.offer.slug === FADO_OFFER_SLUG) return <FadoOfferPage {...props} />;
  return <PainelRipadoOfferPage {...props} />;
}
