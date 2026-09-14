'use client';

// <PaymentBrandStrip />
// Small, balanced, brand-correct strip of the supplied payment
// assets ("We accept"). Used in the footer, checkout and cart.
// Honesty rules:
// - only methods whose configuration rules allow them for the
// given country/currency are shown;
// - a logo NEVER implies gateway availability — actual method
// selection happens inside Stripe Elements at checkout;
// - methods without a supplied asset (Apple Pay, Google Pay,
// PayPal, PIX…) are NOT faked with text/icons — the official
// buttons/flows render dynamically via Stripe.

import { useEffect, useState } from 'react';
import { PaymentMethodLogo } from './payment-method-logo';
import type { PaymentMethodCapability } from '@/lib/payments/payment-types';

interface CapabilitiesResponse {
  methods: PaymentMethodCapability[];
}

export interface PaymentBrandStripProps {
  /** Two-letter country — drives availability rules. */
  country?: string;
  /** Three-letter currency. */
  currency?: string;
  variant?: 'footer' | 'checkout' | 'compact';
  className?: string;
  /** Optional localized caption, e.g. "We accept". */
  caption?: string;
  /** Capabilities passed pre-fetched (skips internal fetch). */
  methods?: PaymentMethodCapability[];
}

export function PaymentBrandStrip({
  country = 'PT',
  currency = 'EUR',
  variant = 'checkout',
  className = '',
  caption,
  methods: preloaded,
}: PaymentBrandStripProps) {
  const [fetched, setFetched] = useState<PaymentMethodCapability[] | null>(null);

  useEffect(() => {
    if (preloaded) return; // preloaded data short-circuits the fetch
    let cancelled = false;
    fetch(`/api/payments/capabilities?country=${encodeURIComponent(country)}&currency=${encodeURIComponent(currency)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: CapabilitiesResponse | null) => {
        if (!cancelled && data?.methods) setFetched(data.methods);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [country, currency, preloaded]);

  const methods = preloaded ?? fetched;
  const visible = (methods ?? []).filter(
    (m) => m.geographicallyEligible && m.logoKind === 'static' && (m.logo || m.brandLogos?.length),
  );

  if (visible.length === 0) return null;

  // Flatten: methods carrying individual brand marks (card networks
  // cropped from the same supplied artwork) render one chip per brand.
  const logos = visible.flatMap((m) =>
    m.brandLogos?.length
      ? m.brandLogos.map((b) => ({ key: `${m.method}:${b.alt}`, src: b.src, alt: b.alt }))
      : [{ key: m.method, src: m.logo!, alt: m.displayName }],
  );

  return (
    <div className={className}>
      {caption && (
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {caption}
        </p>
      )}
      <ul className="flex flex-wrap items-center gap-1.5" aria-label={caption ?? 'Accepted payment methods'}>
        {logos.map((l) => (
          <li key={l.key}>
            <PaymentMethodLogo src={l.src} alt={l.alt} variant={variant} height={variant === 'footer' ? 22 : 26} />
          </li>
        ))}
      </ul>
    </div>
  );
}
