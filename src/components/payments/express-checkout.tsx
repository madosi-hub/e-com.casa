'use client';

// <ExpressCheckout />
// Mounts the official Stripe Express Checkout Element — the only
// place Apple Pay / Google Pay / Link / PayPal buttons come from.
// Stripe decides which wallet buttons the visitor's browser,
// device and merchant configuration actually support; unsupported
// wallets are never shown (and we never draw fake buttons).
// Position: above the conventional Payment Element, followed by
// the "or pay with card" separator.

import { useEffect, useRef, useState } from 'react';
import type { Stripe, StripeElements } from '@stripe/stripe-js';

export interface ExpressCheckoutProps {
  stripe: Stripe | null;
  elements: StripeElements | null;
  /** Fired when the wallet button is pressed — sync order details first. */
  onBeforeConfirm: () => Promise<void>;
  /** Confirms the payment for the wallet flow (same return URL). */
  onConfirm: () => Promise<void>;
  className?: string;
}

export function ExpressCheckout({ stripe, elements, onBeforeConfirm, onConfirm, className = '' }: ExpressCheckoutProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [available, setAvailable] = useState(false);
  const confirmRef = useRef({ onBeforeConfirm, onConfirm });

  useEffect(() => {
    confirmRef.current = { onBeforeConfirm, onConfirm };
  }, [onBeforeConfirm, onConfirm]);

  useEffect(() => {
    if (!stripe || !elements || !containerRef.current) return;
    let cancelled = false;
    const express = elements.create('expressCheckout', {
      buttonType: {
        googlePay: 'buy',
        applePay: 'buy',
      },
      buttonHeight: 44,
      buttonTheme: {
        googlePay: 'black',
        applePay: 'black',
      },
    });

    express.on('ready', (event) => {
      if (cancelled) return;
      // The runtime payload includes the wallet types the visitor's
      // browser/device actually supports (Apple Pay, Google Pay, Link,
      // PayPal) — the typing does not expose it, so probe defensively.
      const types = (event as { availablePaymentTypes?: Record<string, unknown> }).availablePaymentTypes;
      const count = types ? Object.keys(types).length : 0;
      setAvailable(count > 0);
    });

    express.on('click', (event) => {
      // Wallets may provide contact/billing details — give the host a
      // chance to persist them onto the pending order before confirming.
      void confirmRef.current.onBeforeConfirm();
      event.resolve();
    });

    express.on('confirm', () => {
      void confirmRef.current.onConfirm();
    });

    express.mount(containerRef.current);

    return () => {
      cancelled = true;
      try {
        express.destroy();
      } catch {
        // already destroyed
      }
      setAvailable(false);
    };
  }, [stripe, elements]);

  if (!available) return null;

  return (
    <div className={className}>
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        Express checkout
      </p>
      <div ref={containerRef} aria-label="Express checkout wallets" />
    </div>
  );
}
