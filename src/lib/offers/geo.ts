import { getCountryConfigurationOrDefault } from '@/lib/countries';
import type { OfferLanguage, OfferMarketContext } from './types';

const SUPPORTED_LANGS = new Set<OfferLanguage>(['en', 'pt', 'fr', 'de', 'es', 'it', 'nl']);

export function languageFromLocale(locale: string): OfferLanguage {
  const base = locale.toLowerCase().split('-')[0] as OfferLanguage;
  return SUPPORTED_LANGS.has(base) ? base : 'en';
}

/**
 * Resolve GEO using the hosting/CDN country headers, then reuse the existing
 * E-com.casa country engine as the source of truth for locale and currency.
 * No pricing, VAT, shipping or payment rules are duplicated here.
 */
export function resolveOfferMarket(
  headersLike: { get(name: string): string | null },
  fallbackCountry = 'PT',
): OfferMarketContext {
  const detected =
    headersLike.get('x-vercel-ip-country') ||
    headersLike.get('cf-ipcountry') ||
    headersLike.get('x-country-code') ||
    fallbackCountry;

  const country = getCountryConfigurationOrDefault(detected.toUpperCase());
  return {
    countryCode: country.code,
    countryName: country.name,
    locale: country.locale,
    currency: country.currency,
    language: languageFromLocale(country.locale),
  };
}
