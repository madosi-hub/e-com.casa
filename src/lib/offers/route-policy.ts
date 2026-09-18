import { isOfferActive, type ProductOffer } from './promotion';

export const NURALTA_OFFER_SLUG = 'nuralta-painel-ripado';

/**
 * The dedicated Nuralta funnel remains available at its regular catalogue price
 * when campaign state cannot be read. An explicit inactive row still disables it.
 * Every other campaign remains fail-closed unless an active database row exists.
 */
export function isOfferRouteEnabled(requestedSlug: string, offer?: ProductOffer): boolean {
  if (offer) return isOfferActive(offer);
  return requestedSlug === NURALTA_OFFER_SLUG;
}
