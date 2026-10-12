import { isOfferActive, type ProductOffer } from './promotion';

export const NURALTA_OFFER_SLUG = 'nuralta-painel-ripado';
export const NURALTA_OFFER_ALIAS = 'painel-ripado';
export const FADO_OFFER_SLUG = 'fado-table-lamp';
export const FADO_OFFER_ALIAS = 'fado';
export const PANEL_OFFER_SLUGS = [NURALTA_OFFER_ALIAS, NURALTA_OFFER_SLUG] as const;

export type PanelOfferSlug = (typeof PANEL_OFFER_SLUGS)[number];
export type FadoOfferSlug = typeof FADO_OFFER_SLUG | typeof FADO_OFFER_ALIAS;
export type DedicatedOfferSlug = PanelOfferSlug | FadoOfferSlug;

export function isFadoOfferSlug(value: string | null | undefined): value is FadoOfferSlug {
  return value === FADO_OFFER_SLUG || value === FADO_OFFER_ALIAS;
}

export function fadoOfferSlugFromPathname(pathname: string): FadoOfferSlug | null {
  const parts = pathname.split('/');
  return parts[1] === 'offers' && isFadoOfferSlug(parts[2]) ? parts[2] : null;
}

export function dedicatedOfferSlugFromPathname(pathname: string): DedicatedOfferSlug | null {
  return fadoOfferSlugFromPathname(pathname) ?? panelOfferSlugFromPathname(pathname);
}

export function dedicatedOfferPath(slug: DedicatedOfferSlug, suffix = ''): string {
  return `/offers/${slug}${suffix}`;
}

export function offerInformationPath(slug: DedicatedOfferSlug, page: string): string {
  if (!isFadoOfferSlug(slug)) return panelOfferPath(slug, `/informacao/${page}`);
  const paths: Record<string, string> = {
    privacidade: '/legal/privacy',
    'trocas-e-devolucoes': '/returns',
    contacto: '/contact',
    envios: '/shipping',
    'termos-e-condicoes': '/legal/terms',
  };
  return paths[page] ?? '/legal';
}

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
