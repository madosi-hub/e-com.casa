'use client';

import type { CheckoutOrderPayload, PaymentPreparationEvent } from '@/hooks/use-payment-session';
import type { PaymentErrorCode, PaymentMethodCapability } from '@/lib/payments/payment-types';

export interface PreparedOfferPayment {
  checkoutToken: string;
  orderNumber: string;
  accessToken: string;
  pricingHash: string | null;
  clientSecret: string;
  publishableKey?: string;
  methods: PaymentMethodCapability[];
}

export class OfferPaymentPreparationError extends Error {
  constructor(
    message: string,
    public readonly phase: 'error' | 'unavailable' = 'error',
    public readonly errorCode: PaymentErrorCode = 'TEMPORARY_PAYMENT_ERROR',
  ) {
    super(message);
    this.name = 'OfferPaymentPreparationError';
  }
}

type Subscriber = (event: PaymentPreparationEvent) => void;
type SessionRecord = { commerceKey: string; checkoutToken: string; signature?: string };
type PreparationEntry = {
  signature: string;
  checkoutToken: string;
  controller: AbortController;
  promise: Promise<PreparedOfferPayment>;
  settledAt: number | null;
  history: PaymentPreparationEvent[];
  subscribers: Set<Subscriber>;
};

const SESSION_KEY = 'ecom-offer-payment-session-v1';
const READY_TTL_MS = 120_000;
let current: PreparationEntry | null = null;
let sessionRecord: SessionRecord | null = null;
let sessionLoaded = false;

// Only the latest commerce snapshot and its idempotency token survive reloads.
// Contacts, attribution, order access tokens and client secrets stay in memory.
function checkoutTokenFor(payload: CheckoutOrderPayload, signature: string): string {
  const commerceKey = JSON.stringify({
    items: payload.items.map(({ slug, quantity, variantId }) => ({ slug, quantity, variantId: variantId ?? null })),
    country: payload.country,
    shippingMethod: payload.shippingMethod,
    promoCode: payload.promoCode ?? null,
    giftWrap: payload.giftWrap,
  });
  if (!sessionLoaded) {
    sessionLoaded = true;
    try {
      const stored = JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? 'null');
      if (typeof stored?.commerceKey === 'string' && typeof stored?.checkoutToken === 'string'
        && stored.checkoutToken.length >= 8 && stored.checkoutToken.length <= 80) {
        sessionRecord = { commerceKey: stored.commerceKey, checkoutToken: stored.checkoutToken };
      }
    } catch { /* Memory remains usable when browser storage is blocked. */ }
  }
  if (!sessionRecord || sessionRecord.commerceKey !== commerceKey
    || (sessionRecord.signature !== undefined && sessionRecord.signature !== signature)) {
    const checkoutToken = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID() : `ct-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    sessionRecord = { commerceKey, checkoutToken, signature };
  } else {
    sessionRecord.signature = signature;
  }
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ commerceKey, checkoutToken: sessionRecord.checkoutToken }));
  } catch { /* Do not persist anything else as a fallback. */ }
  return sessionRecord.checkoutToken;
}

function discarded(): DOMException {
  return new DOMException('A preparação do pagamento foi substituída.', 'AbortError');
}

function assertCurrent(entry: PreparationEntry): void {
  if (current !== entry || entry.controller.signal.aborted) throw discarded();
}

function discardCurrent(): void {
  const previous = current;
  current = null;
  previous?.controller.abort();
  previous?.subscribers.clear();
}

function deliver(subscriber: Subscriber, event: PaymentPreparationEvent): void {
  try { subscriber({ ...event }); } catch { /* Diagnostics cannot block payment. */ }
}

function subscribe(entry: PreparationEntry, subscriber?: Subscriber): void {
  if (!subscriber) return;
  for (const event of entry.history) deliver(subscriber, event);
  if (entry.settledAt === null) entry.subscribers.add(subscriber);
}

// A stopped consumer never cancels this work. Only invalidating the shared entry
// aborts it; identity checks also discard servers that finish after cancellation.
function withAbort<T>(signal: AbortSignal, operation: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const onAbort = () => reject(signal.reason ?? discarded());
    if (signal.aborted) { onAbort(); return; }
    signal.addEventListener('abort', onAbort, { once: true });
    Promise.resolve().then(() => {
      if (signal.aborted) throw signal.reason ?? discarded();
      return operation();
    }).then(resolve, reject).finally(() => signal.removeEventListener('abort', onAbort));
  });
}

async function post<T extends { stage?: string }>(
  entry: PreparationEntry, path: string, payload: unknown, timeoutMs: number, idempotencyKey?: string,
): Promise<{ response: Response; data: T }> {
  const signal = AbortSignal.any([entry.controller.signal, AbortSignal.timeout(timeoutMs)]);
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;
  const body = JSON.stringify(payload);
  for (let attempt = 0; ; attempt++) {
    assertCurrent(entry);
    const response = await withAbort(signal, () => fetch(path, { method: 'POST', headers, body, signal }));
    assertCurrent(entry);
    const data = await withAbort(signal, () => response.json()) as T;
    assertCurrent(entry);
    const safeToRetry = data.stage === 'load_order'
      || (path === '/api/checkout/create' && data.stage === 'persist_order');
    if (response.status < 500 || !safeToRetry || attempt === 1) return { response, data };
    await withAbort(signal, () => new Promise<void>((resolve) => setTimeout(resolve, 300)));
  }
}

async function prepare(entry: PreparationEntry, payload: CheckoutOrderPayload): Promise<PreparedOfferPayment> {
  let stage: PaymentPreparationEvent['stage'] = 'order';
  let startedAt = Date.now();
  let failureReason: string | undefined;
  const report = (status: PaymentPreparationEvent['status'], reason?: string) => {
    assertCurrent(entry);
    const event = { stage, status, durationMs: Date.now() - startedAt, ...(reason ? { reason } : {}) };
    entry.history.push(event);
    for (const subscriber of entry.subscribers) deliver(subscriber, event);
  };
  try {
    report('started');
    const { response: orderResponse, data: order } = await post<{
      stage?: string; error?: string; requestId?: string; orderNumber?: string; accessToken?: string; pricingHash?: string;
    }>(entry, '/api/checkout/create', { ...payload, checkoutToken: entry.checkoutToken, draft: true }, 15_000, entry.checkoutToken);
    assertCurrent(entry);
    if (!orderResponse.ok || !order.orderNumber || !order.accessToken) {
      failureReason = orderResponse.ok ? 'invalid_response' : `http_${orderResponse.status}`;
      const reference = order.requestId ? ` Referência: ${order.requestId}` : '';
      throw new OfferPaymentPreparationError(`${order.error ?? 'Não foi possível preparar o checkout.'}${reference}`);
    }
    report('ready');
    stage = 'intent';
    startedAt = Date.now();
    report('started');
    const { response: intentResponse, data: intent } = await post<{
      stage?: string; clientSecret?: string; publishableKey?: string; methods?: PaymentMethodCapability[];
    }>(entry, '/api/payments/create-intent', {
      orderNumber: order.orderNumber, accessToken: order.accessToken, trackingParameters: payload.trackingParameters ?? null,
    }, 20_000);
    assertCurrent(entry);
    if (!intentResponse.ok || !intent.clientSecret) {
      failureReason = intentResponse.ok ? 'invalid_response' : `http_${intentResponse.status}`;
      throw new OfferPaymentPreparationError('Não foi possível carregar o pagamento seguro. Tente novamente.', 'unavailable', 'PAYMENT_CONFIGURATION_ERROR');
    }
    report('ready');
    assertCurrent(entry);
    entry.settledAt = Date.now();
    entry.subscribers.clear();
    return {
      checkoutToken: entry.checkoutToken, orderNumber: order.orderNumber, accessToken: order.accessToken,
      pricingHash: order.pricingHash ?? null, clientSecret: intent.clientSecret,
      publishableKey: intent.publishableKey, methods: intent.methods ?? [],
    };
  } catch (error) {
    // An old rejection must neither evict the replacement nor emit its errors.
    assertCurrent(entry);
    report('error', failureReason ?? (error instanceof Error && /timeout/i.test(error.name) ? 'timeout' : 'network_or_sdk_error'));
    if (current === entry) current = null;
    entry.subscribers.clear();
    throw error instanceof OfferPaymentPreparationError ? error : new OfferPaymentPreparationError(
      'O pagamento demorou mais do que o esperado ou não conseguiu carregar. Tente novamente.',
    );
  }
}

export function acquirePreparedOfferPayment(
  payload: CheckoutOrderPayload,
  options: { onEvent?: Subscriber; forceRefresh?: boolean } = {},
): Promise<PreparedOfferPayment> {
  const signature = JSON.stringify(payload);
  if (current?.signature === signature && !options.forceRefresh
    && (current.settledAt === null || Date.now() - current.settledAt < READY_TTL_MS)) {
    const existing = current;
    subscribe(existing, options.onEvent);
    return existing.promise;
  }
  discardCurrent();
  const checkoutToken = checkoutTokenFor(payload, signature);
  // Snapshot before awaiting: callers can update a mutable cart immediately.
  const snapshot = JSON.parse(signature) as CheckoutOrderPayload;
  let entry: PreparationEntry;
  const promise = Promise.resolve().then(() => prepare(entry, snapshot));
  entry = { signature, checkoutToken, controller: new AbortController(), promise, settledAt: null, history: [], subscribers: new Set() };
  current = entry;
  subscribe(entry, options.onEvent);
  return promise;
}

export function invalidatePreparedOfferPayment(payload: CheckoutOrderPayload): void {
  if (current?.signature === JSON.stringify(payload)) discardCurrent();
}

export function resetPreparedOfferPayment(): void {
  discardCurrent();
  sessionRecord = null;
  sessionLoaded = true;
  try { sessionStorage.removeItem(SESSION_KEY); } catch { /* The in-memory reset still applies. */ }
}
