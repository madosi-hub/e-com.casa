'use client';

// <PaymentElement />
// Mounts the official Stripe Payment Element into
// #payment-element. No custom card fields are ever built — card
// data is collected by Stripe's iframe, never by E-com.casa.
// Visual alignment with the store theme comes from the shared
// Elements Appearance configuration.

import { useEffect, useRef, useState } from 'react';
import type { StripeElements, StripePaymentElementOptions } from '@stripe/stripe-js';
import { mountPaymentElement } from './payment-element-lifecycle';
import { PaymentLoadingSkeleton } from './payment-loading-skeleton';

export interface PaymentElementProps {
  elements: StripeElements | null;
  /** Keep options stable so rerenders preserve the selected method and fields. */
  options?: StripePaymentElementOptions;
  className?: string;
  ariaLabel?: string;
  loadingLabel?: string;
  onReady?: () => void;
  onLoadError?: (code: string) => void;
  onChange?: (event: { complete?: boolean }) => void;
  onRetry?: () => void;
}

export function PaymentElement({
  elements,
  options,
  className = '',
  ariaLabel = 'Secure payment details',
  loadingLabel = 'Loading secure payment…',
  onReady,
  onLoadError,
  onChange,
  onRetry,
}: PaymentElementProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const callbacksRef = useRef({ onReady, onLoadError, onChange });

  useEffect(() => {
    callbacksRef.current = { onReady, onLoadError, onChange };
  }, [onReady, onLoadError, onChange]);

  useEffect(() => {
    if (!elements || !containerRef.current) return;
    const dispose = mountPaymentElement({
      elements,
      container: containerRef.current,
      options,
      onReady: () => {
        setMounted(true);
        callbacksRef.current.onReady?.();
      },
      onLoadError: (code) => {
        setMounted(false);
        setLoadError(code);
        callbacksRef.current.onLoadError?.(code);
      },
      onChange: (event) => callbacksRef.current.onChange?.(event),
    });
    return () => {
      dispose();
      setMounted(false);
      setLoadError(null);
    };
  }, [elements, options]);

  return (
    <div className={`relative ${loadError ? '' : 'min-h-[216px]'} ${className}`}>
      {/* Preserve the iframe's dimensions while the skeleton occupies normal flow. */}
      <div
        id="payment-element"
        ref={containerRef}
        aria-label={ariaLabel}
        aria-hidden={!mounted || Boolean(loadError)}
        inert={!mounted || Boolean(loadError)}
        hidden={Boolean(loadError)}
        className={mounted ? 'static opacity-100' : 'pointer-events-none absolute inset-0 opacity-0'}
      />
      {loadError ? (
        <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm">
          <p>Não foi possível carregar o formulário de pagamento. Tente novamente.</p>
          {onRetry && (
            <button type="button" onClick={onRetry} className="mt-3 rounded-md border border-current px-3 py-2 text-sm font-medium">
              Tentar novamente
            </button>
          )}
        </div>
      ) : !mounted && (
        <PaymentLoadingSkeleton label={loadingLabel} />
      )}
    </div>
  );
}
