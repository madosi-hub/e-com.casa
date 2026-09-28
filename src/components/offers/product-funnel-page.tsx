'use client';

import { PainelRipadoOfferPage } from './painel-ripado/page';
import type { CatalogProduct } from '@/lib/catalog/types';
import type { OfferConfig, OfferMarketContext } from '@/lib/offers/types';

/** Every offer uses the approved funnel. Only its product/content changes. */
export function ProductFunnelPage(props: { product: CatalogProduct; offer: OfferConfig; market: OfferMarketContext; accessories?: CatalogProduct[] }) {
  return <PainelRipadoOfferPage {...props} />;
}
