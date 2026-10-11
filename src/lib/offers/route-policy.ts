import { isOfferActive, type ProductOffer } from './promotion';

export const NURALTA_OFFER_SLUG = 'nuralta-painel-ripado';
export const NURALTA_OFFER_ALIAS = 'painel-ripado';
export const FADO_OFFER_SLUG = 'fado-table-lamp';
export const FADO_OFFER_ALIAS = 'fado';
export const PANEL_OFFER_SLUGS = [NURALTA_OFFER_ALIAS, NURALTA_OFFER_SLUG] as const;

export type PanelOfferSlug = (typeof PANEL_OFFER_SLUGS)[number];

export function isPanelOfferSlug(value: string | null | undefined): value is PanelOfferSlug {
  return PANEL_OFFER_SLUGS.some((slug) => slug === value);
}

export function panelOfferSlugFromPathname(pathname: string): PanelOfferSlug | null {
  const slug = pathname.split('/')[2];
  return isPanelOfferSlug(slug) ? slug : null;
}

export function panelOfferPath(slug: PanelOfferSlug, suffix = ''): string {
  return `/offers/${slug}${suffix}`;
}

/**
 * The dedicated Nuralta funnel remains available at its regular catalogue price
 * when campaign state cannot be read. An explicit inactive row still disables it.
 * FADO also has a dedicated route at its regular catalogue price.
 * Every other campaign remains fail-closed unless an active database row exists.
 */
export function isOfferRouteEnabled(requestedSlug: string, offer?: ProductOffer): boolean {
  if (isPanelOfferSlug(requestedSlug) || requestedSlug === FADO_OFFER_SLUG || requestedSlug === FADO_OFFER_ALIAS) {
    return offer ? isOfferActive(offer) : true;
  }
  if (offer) return isOfferActive(offer);
  return false;
}
