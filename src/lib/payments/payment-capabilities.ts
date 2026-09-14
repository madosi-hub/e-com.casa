// E-com.casa — Payment capabilities resolver
// XPayments Store ECOM-CASA is configured for EUR. Until the
// merchant explicitly enables additional settlement currencies,
// checkout must not create intents in unsupported currencies.

import 'server-only';
import { isPaymentConfigured, getPaymentConfig } from './payments-config';
import { getPaymentMethodsForCountry } from './payment-methods';
import type { PaymentMethodCapability } from './payment-types';

export function resolvePaymentCapabilities(country: string, currency: string): { methods: PaymentMethodCapability[]; providerConfigured: boolean; environment: 'test' | 'live' } {
  const providerConfigured = isPaymentConfigured();
  const methods = getPaymentMethodsForCountry(country, currency, { providerConfigured });
  return { methods, providerConfigured, environment: getPaymentConfig().environment };
}

export function resolvePaymentCurrency(countryCurrency: string): { currency: string; supported: boolean } {
  const currency = (countryCurrency || 'EUR').toUpperCase();
  return { currency, supported: currency === 'EUR' };
}
