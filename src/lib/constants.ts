// E-com.casa — central commerce configuration
// Prices are VAT-inclusive for consumers (EU display rule).
// VAT configuration object: rates are REFERENCE values and
// must be validated per market before go-live.

// Country configuration has moved to the data-driven country engine
// (src/lib/countries.ts) per the international architecture. This file
// keeps thin, backwards-compatible aliases for existing imports.
import { getCountryConfiguration, getShipToCountries } from './countries';

export interface CountryConfig {
  code: string;
  name: string;
  vatRate: number; // reference standard rate — validate before go-live
  currency: string;
  market: 'EU' | 'UK';
}

export const COUNTRIES: CountryConfig[] = getShipToCountries().map((c) => ({
  code: c.code,
  name: c.name,
  vatRate: c.vat.standardRate,
  currency: c.currency,
  market: c.market,
}));

// Shipping — placeholder configuration, confirmed at logistics setup
export const FREE_SHIPPING_THRESHOLD = 50.0; // EUR — placeholder
export const SHIPPING_OPTIONS = [
  {
    id: 'standard',
    name: 'Standard delivery',
    description: '3–5 working days', // EU_STANDARD_DELIVERY_DAYS placeholder
    price: 4.9,
  },
  {
    id: 'express',
    name: 'Express delivery',
    description: '1–2 working days',
    price: 9.9,
  },
] as const;

export interface PromoCodeConfig {
  type: 'percent';
  value: number;
  label: string;
  /** When set, the discount is calculated only on matching product slugs. */
  eligibleSlugs?: string[];
  /** Campaign codes can be applied automatically by a dedicated offer page. */
  campaign?: boolean;
}

export const PROMO_CODES: Record<string, PromoCodeConfig> = {
  WELCOME10: { type: 'percent', value: 10, label: '10% welcome discount' },
  HOME5: { type: 'percent', value: 5, label: '5% off your order' },

};

export function calculatePromoDiscount(
  lines: Array<{ slug: string; price: string | number; quantity: number; automaticDiscountPct?: number | null }>,
  promo: PromoCodeConfig | null | undefined,
): number {
  if (!promo) return 0;
  const eligibleSubtotal = lines.reduce((sum, line) => {
    if (line.automaticDiscountPct) return sum;
    if (promo.eligibleSlugs?.length && !promo.eligibleSlugs.includes(line.slug)) return sum;
    const price = typeof line.price === 'number' ? line.price : Number.parseFloat(line.price);
    if (!Number.isFinite(price)) return sum;
    return sum + price * line.quantity;
  }, 0);
  return (eligibleSubtotal * promo.value) / 100;
}

// Gift wrap service — flat fee added at checkout (never discounted by promos)
export const GIFT_WRAP_PRICE = 3.9; // EUR
export const ORDER_NOTES_MAX = 500;

export const LANGUAGES = [
  { code: 'EN', label: 'English' },
  { code: 'PT', label: 'Português' },
  { code: 'FR', label: 'Français' },
  { code: 'DE', label: 'Deutsch' },
  { code: 'ES', label: 'Español' },
  { code: 'IT', label: 'Italiano' },
  { code: 'NL', label: 'Nederlands' },
];

export const SEARCH_SUGGESTIONS = [
  'wall panels',
  'lighting',
  'garden',
  'balcony',
  'mirrors',
  'planters',
  'outdoor lighting',
];

// Simple country rule engine scaffold — extend per market requirements
export function getCountryRequirements(countryCode: string) {
  const cfg = getCountryConfiguration(countryCode);
  const isUK = cfg?.market === 'UK';
  return {
    withdrawalDays: cfg?.returns.withdrawalDays ?? 14,
    legalGuaranteeYears: cfg && !isUK ? cfg.returns.legalGuaranteeYears : null,
    currency: cfg?.currency ?? 'EUR',
    vatRate: cfg?.vat.standardRate ?? null,
    market: cfg?.market ?? 'EU',
    complaintBookUrl: countryCode === 'PT' ? 'https://www.livroreclamacoes.pt/' : null,
    mediator: countryCode === 'FR' ? '[MÉDIATEUR DE LA CONSOMMATION À DÉSIGNER]' : null,
  };
}
