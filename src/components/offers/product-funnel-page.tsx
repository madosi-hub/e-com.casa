'use client';

import { PainelRipadoOfferPage } from './painel-ripado/page';
import { NuraltaPainelRipadoOfferPage } from './nuralta/page';
import type { CatalogProduct } from '@/lib/catalog/types';
import type { OfferConfig, OfferMarketContext } from '@/lib/offers/types';

/** Every offer uses the approved funnel. Only its product/content changes. */
export function ProductFunnelPage(props: { product: CatalogProduct; offer: OfferConfig; market: OfferMarketContext }) {
  if (props.offer.slug === 'nuralta-painel-ripado') {
    return <NuraltaPainelRipadoOfferPage {...props} />;
  }
  return <PainelRipadoOfferPage {...props} />;
}
