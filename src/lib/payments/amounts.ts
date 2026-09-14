// E-com.casa — Money → smallest currency unit
// Payment amounts are always integers in the smallest currency
// unit. Floating-point amounts are never sent to the gateway.
// Exponents per ISO 4217 / Stripe currency model.

import { PaymentError } from './payment-errors';

const CURRENCY_EXPONENTS: Record<string, number> = {
  EUR: 2, GBP: 2, USD: 2,
  DKK: 2, SEK: 2, PLN: 2, CZK: 2, HUF: 2, RON: 2, BGN: 2,
  // zero-decimal examples (kept explicit for correctness if used later)
  ISK: 0, JPY: 0, KRW: 0, VND: 0,
  // two-decimal LATAM (PIX)
  BRL: 2,
};

export function currencyExponent(currency: string): number {
  return CURRENCY_EXPONENTS[currency.toUpperCase()] ?? 2;
}

/**
 * Convert a decimal string ("49.90") into minor units (4990).
 * String-based to avoid float drift entirely.
 */
export function toMinorUnit(amountMajor: string | number, currency: string): number {
  const cur = currency.toUpperCase();
  const exp = currencyExponent(cur);
  const clean = String(amountMajor).trim().replace(/^-/, '');
  const negative = /^-/.test(String(amountMajor).trim());

  const [whole, frac = ''] = clean.split('.');
  const fracPadded = (frac + '0'.repeat(exp)).slice(0, exp);
  const minor = Number(whole || '0') * 10 ** exp + Number(fracPadded || '0');

  if (!Number.isFinite(minor)) {
    throw new PaymentError('TEMPORARY_PAYMENT_ERROR', 500, 'invalid_amount');
  }
  return negative ? -minor : minor;
}

/** Convert minor units back to a display string with the currency exponent. */
export function fromMinorUnit(amountMinor: number, currency: string): string {
  const exp = currencyExponent(currency);
  return (amountMinor / 10 ** exp).toFixed(exp);
}

/** Currencies the payment account can process commercially. */
export const PAYMENT_SUPPORTED_CURRENCIES = [
  'EUR', 'GBP', 'DKK', 'SEK', 'PLN', 'CZK', 'HUF', 'RON', 'BGN',
] as const;

export function isSupportedPaymentCurrency(currency: string): boolean {
  return (PAYMENT_SUPPORTED_CURRENCIES as readonly string[]).includes(currency.toUpperCase());
}
