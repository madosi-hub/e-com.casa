'use client';

// <PaymentElement />
// Mounts the official Stripe Payment Element into
// #payment-element. No custom card fields are ever built — card
// data is collected by Stripe's iframe, never by E-com.casa.
// Visual alignment with the store theme comes from the shared
// Elements Appearance configuration.

import { useEffect, useRef, useState } from 'react';
import type { StripeElements } from '@stripe/stripe-js';
import { LoaderCircle } from 'lucide-react';

export interface PaymentElementProps {
  elements: StripeElements | null;
  /** Hide the built-in payment method tabs' default spacing tweaks. */
  className?: string;
}

export function PaymentElement({ elements, className = '' }: PaymentElementProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (!elements || !containerRef.current) return;
    let cancelled = false;
    const paymentElement = elements.create('payment', {
      layout: { type: 'accordion', defaultCollapsed: false, radios: true, spacedAccordionItems: true },
    });
    paymentElement.mount(containerRef.current);
    paymentElement.on('ready', () => {
      if (!cancelled) setMounted(true);
    });
    return () => {
      cancelled = true;
      try {
        paymentElement.unmount();
        paymentElement.destroy();
      } catch {
        // element already destroyed with the elements instance
      }
      setMounted(false);
    };
  }, [elements]);

  return (
    <div className={`relative ${className}`}>
      <div id="payment-element" ref={containerRef} aria-label="Secure payment details" />
      {!mounted && (
        <div className="absolute inset-0 flex items-center justify-center rounded-md border border-border/60 bg-background/60">
          <span className="flex items-center gap-2 text-[12.5px] text-muted-foreground">
            <LoaderCircle className="h-4 w-4 animate-spin" />
            Loading secure payment…
          </span>
        </div>
      )}
    </div>
  );
}
