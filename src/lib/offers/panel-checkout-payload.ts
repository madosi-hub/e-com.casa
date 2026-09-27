import type { CartLine } from '@/types';
import type { CheckoutOrderPayload } from '@/hooks/use-payment-session';

export const CHECKOUT_DRAFT_KEY = 'ecom-painel-ripado-checkout-draft';

/** The dedicated panel checkout currently serves Portugal without a country selector. */
export const PANEL_CHECKOUT_COUNTRY = 'PT';

/** Shared draft shape keeps preparation reusable from the drawer to checkout. */
export function buildPanelCheckoutPayload(
  lines: Pick<CartLine, 'slug' | 'quantity' | 'variantId'>[],
  promoCode: string | null,
  country: string,
  trackingParameters: CheckoutOrderPayload['trackingParameters'],
): CheckoutOrderPayload {
  return {
    email: '',
    firstName: '',
    lastName: '',
    address: '',
    address2: null,
    city: '',
    postalCode: '',
    country,
    phone: null,
    shippingMethod: 'standard',
    promoCode,
    giftWrap: false,
    notes: null,
    marketingConsent: false,
    items: lines.map((line) => ({ slug: line.slug, quantity: line.quantity, variantId: line.variantId ?? null })),
    trackingParameters,
  };
}
