// GET /api/payments/capabilities?country=PT&currency=EUR
// Public endpoint: returns the payment methods that are actually
// configurable for a country/currency pair. Availability layers
// (storefront config → country rules → provider capability) live
// in the payment-methods registry; this endpoint exposes no
// gateway internals.

import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rate-limit';
import { resolvePaymentCapabilities } from '@/lib/payments/payment-capabilities';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const limit = rateLimit(req, 'payment-capabilities', 60, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } },
    );
  }

  const { searchParams } = new URL(req.url);
  const rawCountry = searchParams.get('country') ?? 'PT';
  const rawCurrency = searchParams.get('currency') ?? 'EUR';
  // country=ALL → union of every served market (footer brand strip)
  const country = rawCountry.toUpperCase() === 'ALL' ? '*' : rawCountry.slice(0, 2);
  const currency = rawCurrency.toUpperCase() === 'ALL' ? '*' : rawCurrency.slice(0, 3);

  const { methods, providerConfigured, environment } = resolvePaymentCapabilities(country, currency);

  return NextResponse.json({
    country: rawCountry.toUpperCase().slice(0, 3),
    currency: rawCurrency.toUpperCase().slice(0, 3),
    providerConfigured,
    environment,
    methods,
  });
}
