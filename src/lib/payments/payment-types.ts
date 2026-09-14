// E-com.casa — Payment domain types
// XPayments is the production payment provider. The browser uses
// the Stripe-compatible Payment Element; server confirmation comes
// only from the verified XPayments merchant webhook.

export type PaymentProviderName = 'xpayments_stripe';

export type PaymentMethodType =
  | 'card' | 'mb_way' | 'multibanco' | 'bizum' | 'blik' | 'bancontact'
  | 'apple_pay' | 'google_pay' | 'link' | 'paypal' | 'pix' | 'other';

export type PaymentStatus =
  | 'CREATED' | 'REQUIRES_PAYMENT_METHOD' | 'REQUIRES_ACTION' | 'PROCESSING'
  | 'SUCCEEDED' | 'FAILED' | 'CANCELLED' | 'REFUNDED' | 'PARTIALLY_REFUNDED';

export type OrderPaymentStatus =
  | 'PENDING_PAYMENT' | 'PAYMENT_PROCESSING' | 'PAID' | 'PAYMENT_FAILED'
  | 'CANCELLED' | 'REFUNDED' | 'PARTIALLY_REFUNDED';

export const PAYMENT_STATUS_RANK: Record<string, number> = {
  PENDING_PAYMENT: 0,
  PAYMENT_PROCESSING: 1,
  PAYMENT_FAILED: 1,
  CANCELLED: 1,
  PAID: 2,
  PARTIALLY_REFUNDED: 3,
  REFUNDED: 4,
};

export type PaymentErrorCode =
  | 'PAYMENT_METHOD_UNAVAILABLE' | 'PAYMENT_REQUIRES_ACTION' | 'PAYMENT_FAILED'
  | 'PAYMENT_PROCESSING' | 'PAYMENT_CANCELLED' | 'PAYMENT_CONFIGURATION_ERROR'
  | 'TEMPORARY_PAYMENT_ERROR' | 'PAYMENT_ORDER_NOT_FOUND' | 'PAYMENT_UNAUTHORIZED'
  | 'PAYMENT_ALREADY_PAID';

export interface ProviderPaymentIntent {
  id: string;
  clientSecret: string | null;
  status: PaymentStatus;
  amountMinor: number;
  currency: string;
  paymentMethodType: string | null;
  /** XPayments transaction correlation id when returned by the gateway. */
  xpaymentsTransactionId?: string | null;
  raw?: unknown;
}

export interface CreatePaymentIntentInput {
  amountMinor: number;
  currency: string;
  idempotencyKey: string;
  orderNumber: string;
  customerCountry: string;
  customerEmail?: string;
  description?: string;
  metadata?: Record<string, string>;
}

export type WebhookVerification = { ok: true } | { ok: false; reason: string };

export function normaliseGatewayIntentStatus(raw: string | undefined | null): PaymentStatus {
  switch (raw) {
    case 'succeeded': return 'SUCCEEDED';
    case 'processing': return 'PROCESSING';
    case 'requires_payment_method': return 'REQUIRES_PAYMENT_METHOD';
    case 'requires_action': case 'requires_confirmation': case 'requires_capture': return 'REQUIRES_ACTION';
    case 'canceled': case 'cancelled': return 'CANCELLED';
    case 'REFUNDED': return 'REFUNDED';
    case 'PARTIALLY_REFUNDED': return 'PARTIALLY_REFUNDED';
    case 'FAILED': return 'FAILED';
    default: return 'CREATED';
  }
}

export interface PaymentMethodCapability {
  method: PaymentMethodType;
  enabled: boolean;
  geographicallyEligible: boolean;
  displayName: string;
  logo: string | null;
  logoKind: 'static' | 'dynamic';
  brandLogos?: Array<{ src: string; alt: string }>;
  countryAvailability: readonly string[];
  currencyAvailability: readonly string[];
  providerAvailability: boolean;
  sortOrder: number;
}

export interface StripeLikeIntent {
  id?: string;
  client_secret?: string | null;
  status?: string;
  amount?: number;
  currency?: string;
  payment_method_types?: string[];
  payment_method?: string | { type?: string } | null;
  last_payment_error?: { code?: string; message?: string } | null;
  next_action?: unknown;
  metadata?: Record<string, string | undefined>;
}

export interface ClientPaymentSession {
  publishableKey: string;
  paymentIntentId: string;
  xpaymentsTransactionId?: string | null;
  clientSecret: string;
  currency: string;
  amountMinor: number;
  orderNumber: string;
  environment: 'test' | 'live';
  methods: PaymentMethodCapability[];
}
