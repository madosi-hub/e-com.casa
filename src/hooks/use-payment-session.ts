'use client';

// usePaymentSession — checkout ↔ order ↔ PaymentIntent glue
// Client orchestration of the real payment flow:
// 1. cart valid → POST /api/checkout/create  (server-repriced
// PENDING_PAYMENT order, idempotent per checkout session)
// 2. POST /api/payments/create-intent  (XPayments client_secret)
// 3. Stripe Elements mount (Payment + Express Checkout)
// 4. confirmPayment → return_url (success page verifies server-side)
// The browser NEVER sees xp_* keys — only the publishable key.

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Stripe, StripeElements } from '@stripe/stripe-js';
import { getStripe, ELEMENTS_APPEARANCE } from '@/lib/payments/stripe-elements';
import type { PaymentErrorCode, PaymentMethodCapability } from '@/lib/payments/payment-types';

export type PaymentSessionPhase = 'idle' | 'preparing' | 'ready' | 'confirming' | 'unavailable' | 'error';

export interface CheckoutOrderPayload {
  email: string;
  firstName: string;
  lastName: string;
  address: string;
  address2?: string | null;
  city: string;
  postalCode: string;
  country: string;
  phone?: string | null;
  shippingMethod: string;
  promoCode?: string | null;
  giftWrap: boolean;
  notes?: string | null;
  marketingConsent: boolean;
  items: { slug: string; quantity: number; variantId?: string | null }[];
  trackingParameters?: {
    src?: string | null;
    sck?: string | null;
    utm_source?: string | null;
    utm_medium?: string | null;
    utm_campaign?: string | null;
    utm_content?: string | null;
    utm_term?: string | null;
  } | null;
}

interface SessionState {
  signature: string | null;
  orderNumber: string | null;
  accessToken: string | null;
  stripe: Stripe | null;
  elements: StripeElements | null;
  methods: PaymentMethodCapability[];
  errorMessage: string | null;
  errorCode: PaymentErrorCode | null;
}

const CHECKOUT_TOKEN_KEY = 'ecom-checkout-token';

function getCheckoutToken(): string {
  try {
    let token = sessionStorage.getItem(CHECKOUT_TOKEN_KEY);
    if (!token) {
      token =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `ct-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      sessionStorage.setItem(CHECKOUT_TOKEN_KEY, token);
    }
    return token;
  } catch {
    return `ct-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

async function postWithSafeCheckoutRetry<T extends { stage?: string }>(
  path: string,
  payload: unknown,
  signal?: AbortSignal,
  idempotencyKey?: string,
): Promise<{ response: Response; data: T }> {
  const body = JSON.stringify(payload);
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;

  for (let attempt = 0; ; attempt++) {
    const response = await fetch(path, { method: 'POST', headers, signal, body });
    const data = await response.json() as T;
    // The order token makes create/update idempotent. Both stages below finish
    // before the payment provider is called, so the identical request is safe.
    const safeToRetry = data.stage === 'load_order' ||
      (path === '/api/checkout/create' && data.stage === 'persist_order');
    if (response.status < 500 || !safeToRetry || attempt === 1) {
      return { response, data };
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
}

export function resetCheckoutToken() {
  try {
    sessionStorage.removeItem(CHECKOUT_TOKEN_KEY);
  } catch {
    // storage unavailable — token is per-request then
  }
}

export interface UsePaymentSessionOptions {
  /** Full order payload (already validated client-side). */
  payload: CheckoutOrderPayload | null;
  /** Changes whenever anything affecting price/content changes. */
  signature: string;
  /** Called after the payment result is known-good → navigate. */
  onComplete: (orderNumber: string, accessToken: string) => void;
  /** Stripe Elements locale. Offer checkouts can pin their campaign language. */
  locale?: 'auto' | 'pt';
  /** Relative return path used after gateway authentication. */
  returnPath?: string;
  /** Contact-based checkouts debounce typing; stable cart drafts can start immediately. */
  prepareDelayMs?: number;
  onPreparationEvent?: (event: PaymentPreparationEvent) => void;
}

export interface PaymentPreparationEvent {
  stage: 'order' | 'intent' | 'stripe';
  status: 'started' | 'ready' | 'error';
  durationMs: number;
  reason?: string;
}

export function usePaymentSession({
  payload,
  signature,
  onComplete,
  locale = 'auto',
  returnPath = '/checkout/success',
  prepareDelayMs = 650,
  onPreparationEvent,
}: UsePaymentSessionOptions) {
  const [phase, setPhase] = useState<PaymentSessionPhase>('idle');
  const [state, setState] = useState<SessionState>({
    signature: null,
    orderNumber: null,
    accessToken: null,
    stripe: null,
    elements: null,
    methods: [],
    errorMessage: null,
    errorCode: null,
  });
  const inflight = useRef<AbortController | null>(null);
  const signatureRef = useRef(signature);
  const preparedSignature = useRef<string | null>(null);
  const preparedPricingHash = useRef<string | null>(null);
  const confirmedContact = useRef<CheckoutOrderPayload | null>(null);
  const onCompleteRef = useRef(onComplete);
  const onPreparationEventRef = useRef(onPreparationEvent);
  const stateRef = useRef(state);
  useEffect(() => {
    onCompleteRef.current = onComplete;
    onPreparationEventRef.current = onPreparationEvent;
    stateRef.current = state;
  }, [onComplete, onPreparationEvent, state]);

  const ensure = useCallback(async () => {
    if (!payload) return;
    inflight.current?.abort();
    const controller = new AbortController();
    inflight.current = controller;
    preparedSignature.current = null;
    confirmedContact.current = null;
    setPhase('preparing');
    setState((s) => ({ ...s, signature: null, stripe: null, elements: null, errorMessage: null, errorCode: null }));
    let stage: PaymentPreparationEvent['stage'] = 'order';
    let stageStarted = Date.now();
    const report = (status: PaymentPreparationEvent['status'], reason?: string) => {
      // Diagnostics must never block payment or include contact/payment data.
      try { onPreparationEventRef.current?.({ stage, status, durationMs: Date.now() - stageStarted, reason }); } catch { /* best effort */ }
    };
    const startStage = (next: PaymentPreparationEvent['stage']) => {
      stage = next;
      stageStarted = Date.now();
      report('started');
    };
    startStage('order');

    try {
      // 1. Create/update the PENDING_PAYMENT order (server-repriced)
      const checkoutToken = getCheckoutToken();
      const { response: orderRes, data: orderData } = await postWithSafeCheckoutRetry<{
        error?: string; requestId?: string; stage?: string; orderNumber?: string; accessToken?: string; pricingHash?: string;
      }>(
        '/api/checkout/create',
        { ...payload, checkoutToken, draft: true },
        AbortSignal.any([controller.signal, AbortSignal.timeout(15_000)]),
        checkoutToken,
      );
      if (controller.signal.aborted) return;
      if (!orderRes.ok || !orderData.orderNumber || !orderData.accessToken) {
        report('error', orderRes.ok ? 'invalid_response' : `http_${orderRes.status}`);
        setPhase('error');
        const reference = orderData.requestId ? ` Referência: ${orderData.requestId}` : '';
        setState((s) => ({ ...s, errorMessage: `${orderData.error ?? 'Não foi possível preparar o checkout.'}${reference}`, errorCode: 'TEMPORARY_PAYMENT_ERROR' }));
        return;
      }
      report('ready');
      const { orderNumber, accessToken } = orderData as { orderNumber: string; accessToken: string };

      // 2. Create (or reuse) the XPayments PaymentIntent
      startStage('intent');
      const { response: intentRes, data: intentData } = await postWithSafeCheckoutRetry<{
        error?: string; stage?: string; clientSecret?: string; publishableKey?: string;
        methods?: PaymentMethodCapability[];
      }>(
        '/api/payments/create-intent',
        { orderNumber, accessToken, trackingParameters: payload.trackingParameters ?? null },
        AbortSignal.any([controller.signal, AbortSignal.timeout(20_000)]),
      );
      if (controller.signal.aborted) return;
      if (!intentRes.ok || !intentData.clientSecret) {
        report('error', intentRes.ok ? 'invalid_response' : `http_${intentRes.status}`);
        setPhase('unavailable');
        setState((s) => ({
          ...s,
          errorMessage: 'Não foi possível carregar o pagamento seguro. Tente novamente.',
          errorCode: 'PAYMENT_CONFIGURATION_ERROR',
        }));
        return;
      }
      report('ready');
      startStage('stripe');

      // 3. Initialise Stripe + Elements (publishable key only).
      // Primary source is the server response so deployments cannot drift
      // between server and client env names. NEXT_PUBLIC fallback exists for
      // resilience and is safe because pk_* is explicitly browser-visible.
      const publishableKey =
        intentData.publishableKey ??
        process.env.NEXT_PUBLIC_XPAYMENTS_STRIPE_PUBLISHABLE_KEY ??
        '';
      if (!publishableKey) {
        report('error', 'missing_publishable_key');
        setPhase('unavailable');
        setState((s) => ({ ...s, errorCode: 'PAYMENT_CONFIGURATION_ERROR', errorMessage: 'Não foi possível carregar o pagamento seguro. Tente novamente.' }));
        return;
      }

      const stripe = await getStripe(publishableKey);
      if (controller.signal.aborted) return;
      if (!stripe) {
        report('error', 'sdk_unavailable');
        setPhase('unavailable');
        setState((s) => ({ ...s, errorCode: 'PAYMENT_CONFIGURATION_ERROR', errorMessage: 'Não foi possível carregar o pagamento seguro. Tente novamente.' }));
        return;
      }
      const elements = stripe.elements({
        clientSecret: intentData.clientSecret,
        appearance: ELEMENTS_APPEARANCE,
        loader: 'auto',
        locale,
      });

      preparedSignature.current = signature;
      preparedPricingHash.current = orderData.pricingHash ?? null;
      confirmedContact.current = null;
      setState({
        signature,
        orderNumber,
        accessToken,
        stripe,
        elements,
        methods: intentData.methods ?? [],
        errorMessage: null,
        errorCode: null,
      });
      report('ready');
      setPhase('ready');
    } catch (error) {
      if (controller.signal.aborted) return;
      report('error', error instanceof Error && /timeout/i.test(error.name) ? 'timeout' : 'network_or_sdk_error');
      setPhase('error');
      setState((s) => ({ ...s, errorMessage: 'O pagamento demorou mais do que o esperado ou não conseguiu carregar. Tente novamente.', errorCode: 'TEMPORARY_PAYMENT_ERROR' }));
    }
  }, [payload, locale, signature]);

  const hasPayload = payload !== null;
  // Cancel immediately on change/unmount, including while Stripe.js is loading.
  useEffect(() => {
    if (!hasPayload) {
      inflight.current?.abort();
      const reset = setTimeout(() => {
        setPhase('idle');
        setState((s) => ({ ...s, signature: null, stripe: null, elements: null }));
      }, 0);
      return () => clearTimeout(reset);
    }
    const changed = signatureRef.current !== signature;
    signatureRef.current = signature;
    const timer = !changed && stateRef.current.signature === signature && stateRef.current.elements
      ? null : setTimeout(() => void ensure(), prepareDelayMs);
    return () => {
      if (timer !== null) clearTimeout(timer);
      inflight.current?.abort();
    };
  }, [signature, hasPayload, ensure, prepareDelayMs]);

  const syncOrder = useCallback(async (nextPayload: CheckoutOrderPayload): Promise<{ ok: boolean; errorMessage?: string }> => {
    if (!state.orderNumber || preparedSignature.current !== signature) return { ok: false, errorMessage: 'Aguarde a atualização do pagamento.' };
    try {
      const checkoutToken = getCheckoutToken();
      const { response, data } = await postWithSafeCheckoutRetry<{ error?: string; stage?: string; orderNumber?: string; pricingHash?: string }>(
        '/api/checkout/create', { ...nextPayload, checkoutToken, draft: false }, AbortSignal.timeout(15_000), checkoutToken,
      );
      if (!response.ok) return { ok: false, errorMessage: data.error ?? 'Não foi possível guardar os dados de entrega.' };
      if (preparedSignature.current !== signature) return { ok: false, errorMessage: 'Aguarde a atualização do pagamento.' };
      if (data.orderNumber !== state.orderNumber || data.pricingHash !== preparedPricingHash.current) {
        return { ok: false, errorMessage: 'O checkout foi atualizado. Atualize o pagamento antes de continuar.' };
      }
      confirmedContact.current = nextPayload;
      return { ok: true };
    } catch { return { ok: false, errorMessage: 'Não foi possível guardar os dados de entrega.' }; }
  }, [state.orderNumber, signature]);

  const confirmPayment = useCallback(async (): Promise<{ ok: boolean; errorCode?: PaymentErrorCode; errorMessage?: string }> => {
    const { stripe, elements, orderNumber, accessToken } = state;
    if (!stripe || !elements || !orderNumber || !accessToken) {
      return { ok: false, errorCode: 'TEMPORARY_PAYMENT_ERROR', errorMessage: 'Payment is not ready yet.' };
    }
    if (preparedSignature.current !== signature) return { ok: false, errorMessage: 'Aguarde a atualização do pagamento.' };
    const contact = confirmedContact.current ?? payload;
    if (!contact) return { ok: false, errorMessage: 'Preencha os dados de contacto e entrega.' };
    if (!confirmedContact.current) {
      const synced = await syncOrder(contact);
      if (!synced.ok) return { ok: false, errorMessage: synced.errorMessage };
    }
    setPhase('confirming');
    const returnUrl = new URL(returnPath, window.location.origin);
    returnUrl.searchParams.set('order', orderNumber);
    returnUrl.searchParams.set('token', accessToken);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: { return_url: returnUrl.toString(), payment_method_data: { billing_details: { email: contact.email, name: `${contact.firstName} ${contact.lastName}`.trim() } } },
        redirect: 'if_required',
      });

      if (error) {
        setPhase('ready');
        // Stripe-validated field errors surface inside the element; other
        // errors map to a safe customer message.
        if (error.type === 'validation_error') {
          return { ok: false, errorCode: 'PAYMENT_REQUIRES_ACTION', errorMessage: error.message ?? undefined };
        }
        const code: PaymentErrorCode =
          error.decline_code === 'canceled' || /cancel/i.test(error.message ?? '')
            ? 'PAYMENT_CANCELLED'
            : 'PAYMENT_FAILED';
        return { ok: false, errorCode: code, errorMessage: error.message ?? undefined };
      }

      // Succeeded/processing in the browser still navigates to the status
      // page. The server then retrieves the same intent from XPayments and
      // reconciles the authoritative DB state before showing confirmation.
      if (paymentIntent && (paymentIntent.status === 'succeeded' || paymentIntent.status === 'processing')) {
        onCompleteRef.current(orderNumber, accessToken);
        return { ok: true };
      }
      // requires_action etc. → redirect already scheduled by Stripe
      return { ok: true };
    } catch {
      setPhase('ready');
      return { ok: false, errorCode: 'TEMPORARY_PAYMENT_ERROR', errorMessage: 'Não foi possível confirmar o pagamento. Verifique o estado da encomenda antes de tentar novamente.' };
    }
  }, [state, returnPath, payload, signature, syncOrder]);


  return {
    phase: phase === 'ready' && state.signature !== signature ? 'preparing' as const : phase,
    stripe: state.signature === signature && hasPayload ? state.stripe : null,
    elements: state.signature === signature && hasPayload ? state.elements : null,
    methods: state.methods,
    orderNumber: state.orderNumber,
    errorMessage: state.errorMessage,
    errorCode: state.errorCode,
    syncOrder,
    confirmPayment,
    retry: () => {
      setPhase('idle');
      void ensure();
    },
  };
}
