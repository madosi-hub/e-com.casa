// E-com.casa — XPayments Stripe-compatible provider
// Production payment provider. XPayments owns the Store, gateway
// routing and Stripe credentials; E-com.casa only holds the
// XPayments API key and merchant webhook secret.

import 'server-only';
import { createHmac, timingSafeEqual } from 'crypto';
import { getPaymentConfig, type PaymentConfig } from './payments-config';
import { normaliseGatewayError, PaymentError, toPaymentError } from './payment-errors';
import type { CreatePaymentIntentInput, PaymentStatus, ProviderPaymentIntent, StripeLikeIntent, WebhookVerification } from './payment-types';
import type { PaymentProvider } from './payment-provider';

function normaliseStatus(raw: string | undefined): PaymentStatus {
  switch (raw) {
    case 'succeeded': return 'SUCCEEDED';
    case 'processing': return 'PROCESSING';
    case 'requires_payment_method': return 'REQUIRES_PAYMENT_METHOD';
    case 'requires_action': case 'requires_confirmation': case 'requires_capture': return 'REQUIRES_ACTION';
    case 'canceled': case 'cancelled': return 'CANCELLED';
    case 'FAILED': case 'failed': return 'FAILED';
    default: return 'CREATED';
  }
}

function toProviderIntent(intent: StripeLikeIntent): ProviderPaymentIntent {
  const pm = intent.payment_method;
  const methodType = typeof pm === 'string' ? null : pm?.type ?? null;
  const metadata = intent.metadata ?? {};
  return {
    id: String(intent.id ?? ''),
    clientSecret: intent.client_secret ?? null,
    status: normaliseStatus(intent.status),
    amountMinor: Number(intent.amount ?? 0),
    currency: String(intent.currency ?? '').toUpperCase(),
    paymentMethodType: methodType,
    xpaymentsTransactionId: metadata.nexflowx_transaction_id ?? metadata.xpayments_transaction_id ?? null,
    raw: intent,
  };
}

function formEncode(fields: Record<string, string | number | boolean | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined && value !== null && value !== '') params.append(key, String(value));
  }
  return params.toString();
}

export class XPaymentsStripeProvider implements PaymentProvider {
  readonly name = 'xpayments_stripe';
  private readonly cfg: PaymentConfig;

  constructor(cfg: PaymentConfig = getPaymentConfig()) { this.cfg = cfg; }

  private headers(idempotencyKey?: string, includeContentType = true): Record<string, string> {
    if (!this.cfg.secretKey) throw new PaymentError('PAYMENT_CONFIGURATION_ERROR', 503, 'missing_secret');
    const headers: Record<string, string> = { Authorization: `Bearer ${this.cfg.secretKey}` };
    if (includeContentType) headers['Content-Type'] = 'application/x-www-form-urlencoded';
    if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;
    if (this.cfg.stripeApiVersion) headers['Stripe-Version'] = this.cfg.stripeApiVersion;
    return headers;
  }

  private base(): string { return this.cfg.apiBaseUrl.replace(/\/+$/, ''); }

  private async request<T>(method: 'GET' | 'POST', path: string, opts: { body?: string; idempotencyKey?: string } = {}): Promise<T> {
    let res: Response;
    try {
      res = await fetch(`${this.base()}${path}`, {
        method,
        headers: this.headers(opts.idempotencyKey, method === 'POST'),
        body: method === 'POST' ? opts.body : undefined,
        cache: 'no-store',
        signal: AbortSignal.timeout(20_000),
      });
    } catch (error) { throw toPaymentError(error); }
    const text = await res.text();
    let parsed: unknown = null;
    try { parsed = text ? JSON.parse(text) : null; } catch { parsed = { raw: text.slice(0, 500) }; }
    if (!res.ok) throw normaliseGatewayError(res.status, parsed);
    return parsed as T;
  }

  async createPaymentIntent(input: CreatePaymentIntentInput): Promise<ProviderPaymentIntent> {
    const body = formEncode({
      amount: input.amountMinor,
      currency: input.currency.toLowerCase(),
      'automatic_payment_methods[enabled]': 'true',
      description: input.description ?? `E-com.casa order ${input.orderNumber}`,
      ...(input.customerEmail ? { receipt_email: input.customerEmail } : {}),
      'metadata[merchant_reference]': input.orderNumber,
      'metadata[order_number]': input.orderNumber,
      'metadata[customer_country]': input.customerCountry,
      'metadata[store]': 'e-com.casa',
      ...(this.cfg.storeId ? { 'metadata[store_id]': this.cfg.storeId } : {}),
      ...input.metadata,
    });
    const intent = await this.request<StripeLikeIntent>('POST', '/payment_intents', { body, idempotencyKey: input.idempotencyKey });
    return toProviderIntent(intent);
  }

  async retrievePaymentIntent(paymentIntentId: string): Promise<ProviderPaymentIntent> {
    return toProviderIntent(await this.request<StripeLikeIntent>('GET', `/payment_intents/${encodeURIComponent(paymentIntentId)}`));
  }

  async cancelPaymentIntent(paymentIntentId: string): Promise<ProviderPaymentIntent> {
    return toProviderIntent(await this.request<StripeLikeIntent>('POST', `/payment_intents/${encodeURIComponent(paymentIntentId)}/cancel`, { body: '', idempotencyKey: `ecom-cancel-${paymentIntentId}` }));
  }

  async capturePaymentIntent(paymentIntentId: string): Promise<ProviderPaymentIntent> {
    return toProviderIntent(await this.request<StripeLikeIntent>('POST', `/payment_intents/${encodeURIComponent(paymentIntentId)}/capture`, { body: '', idempotencyKey: `ecom-capture-${paymentIntentId}` }));
  }

  async refundPayment(paymentIntentId: string, amountMinor?: number, reason?: string): Promise<{ refundId: string; status: string }> {
    const refund = await this.request<{ id?: string; status?: string }>('POST', '/refunds', {
      body: formEncode({ payment_intent: paymentIntentId, amount: amountMinor, reason: reason ? mapRefundReason(reason) : undefined }),
      idempotencyKey: `ecom-refund-${paymentIntentId}-${amountMinor ?? 'full'}`,
    });
    return { refundId: String(refund.id ?? ''), status: String(refund.status ?? 'pending') };
  }

  verifyWebhook(rawBody: string, headers: Record<string, string | undefined>): WebhookVerification {
    if (!this.cfg.webhookSecret) return { ok: false, reason: 'webhook secret not configured' };
    const signature = headers['x-nexflowx-signature'] ?? headers['X-Nexflowx-Signature'] ?? undefined;
    if (!signature) return { ok: false, reason: 'missing x-nexflowx-signature header' };
    const expected = createHmac('sha256', this.cfg.webhookSecret).update(rawBody, 'utf8').digest('hex');
    const supplied = signature.trim().toLowerCase();
    if (!/^[0-9a-f]{64}$/.test(supplied)) return { ok: false, reason: 'invalid signature format' };
    const a = Buffer.from(expected, 'hex');
    const b = Buffer.from(supplied, 'hex');
    if (a.length !== b.length || !timingSafeEqual(a, b)) return { ok: false, reason: 'signature mismatch' };
    return { ok: true };
  }

  getPaymentCapabilities() {
    return { provider: this.name, configured: Boolean(this.cfg.secretKey && this.cfg.publishableKey), environment: this.cfg.environment };
  }
}

function mapRefundReason(reason: string): string | undefined {
  const r = reason.toLowerCase();
  if (r.includes('duplicate')) return 'duplicate';
  if (r.includes('fraud')) return 'fraudulent';
  if (r.includes('requested') || r.includes('return')) return 'requested_by_customer';
  return undefined;
}

let providerInstance: XPaymentsStripeProvider | null = null;
export function getPaymentProvider(): XPaymentsStripeProvider {
  if (!providerInstance) providerInstance = new XPaymentsStripeProvider();
  return providerInstance;
}
