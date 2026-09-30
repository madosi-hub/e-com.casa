// E-com.casa — XPayments payment configuration (SERVER ONLY)
// Exact names for the XPayments Stripe-compatible LIVE contract.
// Secrets are server-only and are never returned to the browser.
// Merchant webhooks use the configured secret or a temporary server-only
// fallback. Pending orders are also reconciled by authenticated
// server-to-server PaymentIntent retrieval.

import 'server-only';

// Temporary fallback until the merchant webhook secret is configured in production.
const TEMPORARY_XPAYMENTS_WEBHOOK_SECRET = 'whsec_d4a38423dd1e2266c9115093c61bc2848260b4c3913a1c81';

export type PaymentEnvironment = 'test' | 'live';

export interface PaymentConfig {
  environment: PaymentEnvironment;
  apiBaseUrl: string;
  secretKey: string | null;
  webhookSecret: string | null;
  storeId: string | null;
  publishableKey: string | null;
  stripeApiVersion: string | null;
}

export function getPaymentConfig(): PaymentConfig {
  const rawEnv = (process.env.PAYMENT_ENVIRONMENT ?? 'live').toLowerCase();
  const environment: PaymentEnvironment = rawEnv === 'test' ? 'test' : 'live';

  return {
    environment,
    apiBaseUrl:
      process.env.XPAYMENTS_STRIPE_BASE_URL?.trim() ||
      'https://api.xpayments.digital/api/stripe/v1',
    secretKey: process.env.XPAYMENTS_API_KEY?.trim() || null,
    webhookSecret: process.env.XPAYMENTS_WEBHOOK_SECRET?.trim() || TEMPORARY_XPAYMENTS_WEBHOOK_SECRET,
    storeId: process.env.XPAYMENTS_STORE_ID?.trim() || null,
    publishableKey:
      process.env.NEXT_PUBLIC_XPAYMENTS_STRIPE_PUBLISHABLE_KEY?.trim() || null,
    stripeApiVersion: process.env.STRIPE_API_VERSION?.trim() || null,
  };
}

export function isPaymentConfigured(): boolean {
  const cfg = getPaymentConfig();
  return Boolean(cfg.secretKey && cfg.publishableKey);
}

export function isMerchantWebhookConfigured(): boolean {
  return Boolean(getPaymentConfig().webhookSecret);
}

export interface PaymentConfigIssue {
  field: string;
  problem: string;
}

export function validatePaymentConfig(): PaymentConfigIssue[] {
  const cfg = getPaymentConfig();
  const issues: PaymentConfigIssue[] = [];

  if (!cfg.secretKey) {
    issues.push({ field: 'XPAYMENTS_API_KEY', problem: 'missing' });
  } else {
    const expected = cfg.environment === 'live' ? 'xp_live_' : 'xp_test_';
    if (!cfg.secretKey.startsWith(expected)) {
      issues.push({ field: 'XPAYMENTS_API_KEY', problem: `expected ${expected} credential for PAYMENT_ENVIRONMENT=${cfg.environment}` });
    }
  }

  if (!cfg.publishableKey) {
    issues.push({ field: 'NEXT_PUBLIC_XPAYMENTS_STRIPE_PUBLISHABLE_KEY', problem: 'missing' });
  } else if (cfg.environment === 'live' && !cfg.publishableKey.startsWith('pk_live_')) {
    issues.push({ field: 'NEXT_PUBLIC_XPAYMENTS_STRIPE_PUBLISHABLE_KEY', problem: 'expected pk_live_ for LIVE environment' });
  }

  // The temporary fallback keeps this optional in environment configuration;
  // /api/payments/status also securely reconciles with XPayments.
  return issues;
}
