// E-com.casa — Stripe.js loader (client)
// Single entry point for Stripe.js on the storefront. The
// publishable key is the only credential the browser ever sees.
// The secret xp_* keys NEVER reach this module.

import { loadStripe, type Stripe, type StripeElements } from '@stripe/stripe-js';

const STRIPE_LOAD_TIMEOUT_MS = 15_000;
const stripeLoads = new Map<string, Promise<Stripe | null>>();

export class StripeLoadTimeoutError extends Error {
  readonly code = 'STRIPE_LOAD_TIMEOUT';

  constructor() {
    super('O pagamento demorou demasiado a carregar. Tente novamente ou recarregue a página.');
    this.name = 'StripeLoadTimeoutError';
  }
}

/**
 * Read the publishable key injected during SSR (from getPaymentConfig
 * via the create-intent response) — never hardcode keys here.
 */
export function getStripe(publishableKey: string): Promise<Stripe | null> {
  const existing = stripeLoads.get(publishableKey);
  if (existing) return existing;

  let timeout: ReturnType<typeof setTimeout>;
  const loading = new Promise<Stripe | null>((resolve, reject) => {
    timeout = setTimeout(() => reject(new StripeLoadTimeoutError()), STRIPE_LOAD_TIMEOUT_MS);
    // Preserve the official loader and its default preload. Converting a
    // synchronous failure into a rejection also keeps retry behaviour uniform.
    Promise.resolve().then(() => loadStripe(publishableKey)).then(resolve, reject);
  });
  const attempt = loading.then(
    (stripe) => {
      clearTimeout(timeout);
      if (!stripe && stripeLoads.get(publishableKey) === attempt) stripeLoads.delete(publishableKey);
      return stripe;
    },
    (error: unknown) => {
      clearTimeout(timeout);
      if (stripeLoads.get(publishableKey) === attempt) stripeLoads.delete(publishableKey);
      throw error;
    },
  );
  stripeLoads.set(publishableKey, attempt);
  return attempt;
}

// The SDK resets its own script cache on rejection, so retry reaches loadStripe
// again after transient failures. A script that never fires load/error cannot
// be reset through its public API: timeout ends our wait, while a permanently
// stalled script can still require a page reload. Late results never replace
// or clear a newer attempt, and successful instances stay cached by key.

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
    colorTextPlaceholder: '#676770',
    colorDanger: '#a32924',
    fontFamily: 'var(--font-sans, ui-sans-serif, system-ui, sans-serif)',
    fontSizeBase: '16px',
    spacingUnit: '4px',
    borderRadius: '6px',
    focusBoxShadow: '0 0 0 3px rgba(95, 112, 82, 0.18)',
  },
  rules: {
    '.Input': {
      border: '1px solid #85858e',
      boxShadow: 'none',
      padding: '13px 12px',
    },
    '.Input:focus': {
      border: '1px solid #5f7052',
      boxShadow: '0 0 0 3px rgba(95, 112, 82, 0.18)',
    },
    '.Input--invalid': {
      border: '1px solid #a32924',
    },
    '.Label': {
      fontSize: '14px',
      fontWeight: '500',
      marginBottom: '6px',
      color: '#1f241c',
    },
    '.Tab': {
      border: '1px solid #85858e',
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
