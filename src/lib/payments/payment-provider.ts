// E-com.casa — Payment provider abstraction
// The storefront talks to this interface only. There is NO fake
// provider: production checkout requires the real XPayments
// Stripe-compatible provider. (Local unit tests may mock this
// interface — but no mock ships as a selectable provider.)

import type {
  CreatePaymentIntentInput,
  ProviderPaymentIntent,
  WebhookVerification,
} from './payment-types';

export interface PaymentProvider {
  readonly name: string;
  /** Create (or idempotently re-create) a PaymentIntent. */
  createPaymentIntent(input: CreatePaymentIntentInput): Promise<ProviderPaymentIntent>;
  retrievePaymentIntent(paymentIntentId: string): Promise<ProviderPaymentIntent>;
  cancelPaymentIntent(paymentIntentId: string): Promise<ProviderPaymentIntent>;
  capturePaymentIntent(paymentIntentId: string): Promise<ProviderPaymentIntent>;
  /** amountMinor omitted → full refund. */
  refundPayment(paymentIntentId: string, amountMinor?: number, reason?: string): Promise<{ refundId: string; status: string }>;
  /** Verify a merchant webhook delivery (fail-closed). */
  verifyWebhook(rawBody: string, headers: Record<string, string | undefined>): WebhookVerification;
  /** Human-safe capability summary for logging/diagnostics. */
  getPaymentCapabilities(): { provider: string; configured: boolean; environment: 'test' | 'live' };
}
