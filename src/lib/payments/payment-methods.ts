// E-com.casa — Payment method registry
// Single source of truth for which payment methods exist, which
// brand assets they use (ONLY the user-supplied files — never
// redrawn or substituted), and where they may be offered.
// Rules encoded here:
// - A logo asset is NOT availability. Availability = configured
// active (storefront) + country + currency + provider capability.
// - MB WAY / Multibanco: Portugal + EUR only.
// - Bizum: Spain + EUR. BLIK: Poland. Bancontact: Belgium.
// - PIX: configuration-gated, OFF unless explicitly enabled — it
// must never be shown to European customers just because an
// asset exists.
// - Apple Pay / Google Pay / Link / PayPal have no static logos:
// Stripe's Express Checkout Element renders the official
// buttons dynamically, so availability stays truthful.

import type { PaymentMethodCapability, PaymentMethodType } from './payment-types';

export interface PaymentMethodDefinition {
  method: PaymentMethodType;
  displayName: string;
  /** Path under /public for the supplied brand asset, if one exists. */
  logo: string | null;
  /** Countries where the method can be offered (ISO 3166-1 alpha-2). */
  countries: readonly string[];
  /** Currencies the method can be charged in (ISO 4217). */
  currencies: readonly string[];
  /** Must the gateway explicitly support it (local methods)? */
  requiresGatewaySupport: boolean;
  /** Rendered by Stripe Express Checkout Element rather than a static logo? */
  dynamic?: boolean;
  /** Individual brand marks cropped from the same supplied asset
   *  (display-only — capability identity stays the single `method`). */
  brandLogos?: ReadonlyArray<{ src: string; alt: string }>;
  sortOrder: number;
}

/**
 * Storefront-level activation (only show configured methods).
 * Driven by the PAYMENT_METHODS env var ("card,mb_way,…"); defaults
 * to the European retail set. PIX is always opt-in.
 */
export const DEFAULT_ACTIVE_METHODS: PaymentMethodType[] = [
  'card',
  'mb_way',
  'multibanco',
  'bizum',
  'blik',
  'bancontact',
];

export function activeStorefrontMethods(): PaymentMethodType[] {
  const raw = process.env.PAYMENT_METHODS?.trim();
  if (!raw) return DEFAULT_ACTIVE_METHODS;
  const parsed = raw
    .split(',')
    .map((m) => m.trim().toLowerCase())
    .filter((m): m is PaymentMethodType => m.length > 0);
  return parsed.length > 0 ? parsed : DEFAULT_ACTIVE_METHODS;
}

export function isPixEnabled(): boolean {
  return activeStorefrontMethods().includes('pix');
}

export const PAYMENT_METHODS: Record<PaymentMethodType, PaymentMethodDefinition> = {
  card: {
    method: 'card',
    displayName: 'Card',
    // Supplied combined brand asset (Visa · Mastercard · American Express)
    logo: '/payment-methods/cards.jpg',
    // Individual marks cropped from that same supplied artwork — used by
    // the brand strips so each card network stays legible.
    brandLogos: [
      { src: '/payment-methods/visa.png', alt: 'Visa' },
      { src: '/payment-methods/mastercard.png', alt: 'Mastercard' },
      { src: '/payment-methods/amex.png', alt: 'American Express' },
    ],
    countries: ['*'],
    currencies: ['EUR', 'GBP', 'DKK', 'SEK', 'PLN', 'CZK', 'HUF', 'RON', 'BGN'],
    requiresGatewaySupport: false,
    sortOrder: 30,
  },
  mb_way: {
    method: 'mb_way',
    displayName: 'MB WAY',
    logo: '/payment-methods/mb-way.png',
    countries: ['PT'],
    currencies: ['EUR'],
    requiresGatewaySupport: true,
    sortOrder: 10,
  },
  multibanco: {
    method: 'multibanco',
    displayName: 'Multibanco',
    logo: '/payment-methods/multibanco.png', // dark-on-transparent supplied asset (legible on light chips)
    countries: ['PT'],
    currencies: ['EUR'],
    requiresGatewaySupport: true,
    sortOrder: 11,
  },
  bizum: {
    method: 'bizum',
    displayName: 'Bizum',
    logo: '/payment-methods/bizum.png',
    countries: ['ES'],
    currencies: ['EUR'],
    requiresGatewaySupport: true,
    sortOrder: 12,
  },
  blik: {
    method: 'blik',
    displayName: 'BLIK',
    logo: '/payment-methods/blik.png',
    countries: ['PL'],
    currencies: ['EUR', 'PLN'],
    requiresGatewaySupport: true,
    sortOrder: 13,
  },
  bancontact: {
    method: 'bancontact',
    displayName: 'Bancontact',
    logo: '/payment-methods/bancontact.png',
    countries: ['BE'],
    currencies: ['EUR'],
    requiresGatewaySupport: true,
    sortOrder: 14,
  },
  apple_pay: {
    method: 'apple_pay',
    displayName: 'Apple Pay',
    logo: null, // official button is rendered dynamically by Stripe
    countries: ['*'],
    currencies: ['EUR', 'GBP', 'DKK', 'SEK', 'PLN', 'CZK', 'HUF', 'RON', 'BGN'],
    requiresGatewaySupport: true,
    dynamic: true,
    sortOrder: 1,
  },
  google_pay: {
    method: 'google_pay',
    displayName: 'Google Pay',
    logo: null,
    countries: ['*'],
    currencies: ['EUR', 'GBP', 'DKK', 'SEK', 'PLN', 'CZK', 'HUF', 'RON', 'BGN'],
    requiresGatewaySupport: true,
    dynamic: true,
    sortOrder: 2,
  },
  link: {
    method: 'link',
    displayName: 'Link',
    logo: null,
    countries: ['*'],
    currencies: ['EUR'],
    requiresGatewaySupport: true,
    dynamic: true,
    sortOrder: 3,
  },
  paypal: {
    method: 'paypal',
    displayName: 'PayPal',
    logo: null,
    countries: ['*'],
    currencies: ['EUR'],
    requiresGatewaySupport: true,
    dynamic: true,
    sortOrder: 4,
  },
  pix: {
    method: 'pix',
    displayName: 'PIX',
    logo: null, // no supplied asset — PIX stays hidden until configured (BR/BRL)
    countries: ['BR'],
    currencies: ['BRL'],
    requiresGatewaySupport: true,
    sortOrder: 20,
  },
  other: {
    method: 'other',
    displayName: 'Other',
    logo: null,
    countries: [],
    currencies: [],
    requiresGatewaySupport: true,
    sortOrder: 99,
  },
};

/** Methods that only make sense when the gateway confirms support. */
export const GATEWAY_ASSUMED_METHODS: PaymentMethodType[] = ['card'];

/**
 * Resolve the payment methods that may be offered for a country +
 * currency combination. Availability layers:
 *   1. storefront configuration (PAYMENT_METHODS)
 *   2. country / currency rules above
 *   3. provider capability (gateway configured) — for gateway-gated
 *      local methods this stays false until the merchant activates
 *      them with XPayments.
 */
export function getPaymentMethodsForCountry(
  country: string,
  currency: string,
  options: { providerConfigured: boolean },
): PaymentMethodCapability[] {
  const active = new Set(activeStorefrontMethods());
  // country '*' = "union of all served markets" (used by the footer
  // brand strip, which advertises every configured method).
  const all = country === '*';
  const cc = country.toUpperCase();
  const cur = currency.toUpperCase();
  // currency '*' = any configured currency qualifies.
  const anyCurrency = currency === '*';

  const result: PaymentMethodCapability[] = [];
  for (const def of Object.values(PAYMENT_METHODS)) {
    if (def.method === 'other') continue;
    if (!active.has(def.method)) continue;

    const countryOk = all || def.countries.includes('*') || def.countries.includes(cc);
    const currencyOk = anyCurrency || def.currencies.includes(cur);
    // With no gateway configured nothing is bookable — the
    // storefront must never imply payment support it cannot honour.
    const providerOk = options.providerConfigured;

    // PIX hard gate: never shown without explicit storefront config.
    if (def.method === 'pix' && !isPixEnabled()) continue;

    result.push({
      method: def.method,
      enabled: countryOk && currencyOk && providerOk,
      geographicallyEligible: countryOk && currencyOk,
      displayName: def.displayName,
      logo: def.logo,
      logoKind: def.dynamic ? 'dynamic' : 'static',
      brandLogos: def.brandLogos ? def.brandLogos.map((b) => ({ ...b })) : undefined,
      countryAvailability: def.countries,
      currencyAvailability: def.currencies,
      providerAvailability: providerOk,
      sortOrder: def.sortOrder,
    });
  }
  return result.sort((a, b) => a.sortOrder - b.sortOrder);
}
