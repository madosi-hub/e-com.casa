// E-com.casa — Stripe.js loader (client)
// Single entry point for Stripe.js on the storefront. The
// publishable key is the only credential the browser ever sees.
// The secret xp_* keys NEVER reach this module.

import { loadStripe, type Stripe, type StripeElements } from '@stripe/stripe-js';

let stripePromise: Promise<Stripe | null> | null = null;

/**
 * Read the publishable key injected during SSR (from getPaymentConfig
 * via the create-intent response) — never hardcode keys here.
 */
export function getStripe(publishableKey: string): Promise<Stripe | null> {
  if (!stripePromise || stripePublishableKey !== publishableKey) {
    stripePublishableKey = publishableKey;
    stripePromise = loadStripe(publishableKey);
  }
  return stripePromise;
}

let stripePublishableKey: string | null = null;

/**
 * Stripe Elements appearance themed to the E-com.casa visual
 * language: warm neutrals, olive accent, soft radius and the
 * store font stack — while respecting Stripe brand rules.
 */
export const ELEMENTS_APPEARANCE = {
  theme: 'flat' as const,
  variables: {
    colorPrimary: '#5f7052', // olive
    colorBackground: '#ffffff',
    colorText: '#1f241c', // ink
    colorTextSecondary: '#6b7166',
    colorTextPlaceholder: '#9aa093',
    colorDanger: '#b3573f', // terracotta
    fontFamily: 'var(--font-sans, ui-sans-serif, system-ui, sans-serif)',
    fontSizeBase: '14px',
    spacingUnit: '4px',
    borderRadius: '6px',
    focusBoxShadow: '0 0 0 3px rgba(95, 112, 82, 0.18)',
  },
  rules: {
    '.Input': {
      border: '1px solid #d9dcd4',
      boxShadow: 'none',
      padding: '10px 12px',
    },
    '.Input:focus': {
      border: '1px solid #5f7052',
      boxShadow: '0 0 0 3px rgba(95, 112, 82, 0.18)',
    },
    '.Input--invalid': {
      border: '1px solid #b3573f',
    },
    '.Label': {
      fontSize: '12.5px',
      fontWeight: '500',
      marginBottom: '6px',
      color: '#1f241c',
    },
    '.Tab': {
      border: '1px solid #d9dcd4',
      boxShadow: 'none',
    },
    '.Tab--selected': {
      borderColor: '#5f7052',
      backgroundColor: 'rgba(95, 112, 82, 0.05)',
    },
    '.TermsText': {
      color: '#6b7166',
    },
  },
};

export type { StripeElements };
