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
import { multibancoReference, paymentErrorDetails, paymentFailureMessage, type PaymentActionResult } from '@/lib/payments/client-payment-errors';
import {
  acquirePreparedOfferPayment,
  invalidatePreparedOfferPayment,
  OfferPaymentPreparationError,
  resetPreparedOfferPayment,
} from '@/lib/payments/offer-payment-preparation';

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
  checkoutToken: string | null;
  orderNumber: string | null;
  accessToken: string | null;
  stripe: Stripe | null;
  elements: StripeElements | null;
  methods: PaymentMethodCapability[];
  errorMessage: string | null;
  errorCode: PaymentErrorCode | null;
}

const CHECKOUT_TOKEN_KEY = 'ecom-checkout-token';
let fallbackCheckoutToken: string | null = null;

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
    return fallbackCheckoutToken ??= `ct-${Date.now()}-${Math.random().toString(36).slice(2)}`;
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
  fallbackCheckoutToken = null;
  resetPreparedOfferPayment();
  try {
    sessionStorage.removeItem(CHECKOUT_TOKEN_KEY);
  } catch {
    // Storage is best effort; the in-memory token has already been cleared.
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
  /** Reuse preparation begun in the offer cart, including a request still in flight. */
  prepareEarly?: boolean;
  onPreparationEvent?: (event: PaymentPreparationEvent) => void;
}

export interface PaymentPreparationEvent {
  stage: 'order' | 'intent' | 'stripe' | 'session';
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
  prepareEarly = false,
  onPreparationEvent,
}: UsePaymentSessionOptions) {
  const [phase, setPhase] = useState<PaymentSessionPhase>('idle');
  const [state, setState] = useState<SessionState>({
    signature: null,
    checkoutToken: null,
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

  const ensure = useCallback(async (forceRefresh = false) => {
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

    try {
      let checkoutToken: string;
      let orderData: { orderNumber: string; accessToken: string; pricingHash?: string | null };
      let intentData: { clientSecret: string; publishableKey?: string; methods?: PaymentMethodCapability[] };
      if (prepareEarly) {
        // Unlike provider timings replayed from the cart, this measures how
        // long the shopper actually waits for the session in the checkout.
        startStage('session');
        // The shared request survives cart → checkout navigation. This hook's
        // controller only prevents an obsolete consumer from mounting Elements.
        const prepared = await acquirePreparedOfferPayment(payload, {
          forceRefresh,
          onEvent: (event) => {
            if (controller.signal.aborted) return;
            try { onPreparationEventRef.current?.(event); } catch { /* best effort */ }
          },
        });
        if (controller.signal.aborted) return;
        report('ready');
        checkoutToken = prepared.checkoutToken;
        orderData = prepared;
        intentData = prepared;
      } else {
        startStage('order');
        // 1. Create/update the PENDING_PAYMENT order (server-repriced)
        checkoutToken = getCheckoutToken();
        const { response: orderRes, data: orderResult } = await postWithSafeCheckoutRetry<{
          error?: string; requestId?: string; stage?: string; orderNumber?: string; accessToken?: string; pricingHash?: string;
        }>(
          '/api/checkout/create',
          { ...payload, checkoutToken, draft: true },
          AbortSignal.any([controller.signal, AbortSignal.timeout(15_000)]),
          checkoutToken,
        );
        if (controller.signal.aborted) return;
        if (!orderRes.ok || !orderResult.orderNumber || !orderResult.accessToken) {
          report('error', orderRes.ok ? 'invalid_response' : `http_${orderRes.status}`);
          setPhase('error');
          const reference = orderResult.requestId ? ` Referência: ${orderResult.requestId}` : '';
          setState((s) => ({ ...s, errorMessage: `${orderResult.error ?? 'Não foi possível preparar o checkout.'}${reference}`, errorCode: 'TEMPORARY_PAYMENT_ERROR' }));
          return;
        }
        report('ready');
        orderData = { orderNumber: orderResult.orderNumber, accessToken: orderResult.accessToken, pricingHash: orderResult.pricingHash };
        const { orderNumber, accessToken } = orderData;

        // 2. Create (or reuse) the XPayments PaymentIntent
        startStage('intent');
        const { response: intentRes, data: intentResult } = await postWithSafeCheckoutRetry<{
          error?: string; stage?: string; clientSecret?: string; publishableKey?: string;
          methods?: PaymentMethodCapability[];
        }>(
          '/api/payments/create-intent',
          { orderNumber, accessToken, trackingParameters: payload.trackingParameters ?? null },
          AbortSignal.any([controller.signal, AbortSignal.timeout(20_000)]),
        );
        if (controller.signal.aborted) return;
        if (!intentRes.ok || !intentResult.clientSecret) {
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
        intentData = { ...intentResult, clientSecret: intentResult.clientSecret };
      }
      const { orderNumber, accessToken } = orderData;
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
        checkoutToken,
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
      if (error instanceof OfferPaymentPreparationError) {
        report('error', 'preparation_failed');
        setPhase(error.phase);
        setState((s) => ({ ...s, errorMessage: error.message, errorCode: error.errorCode }));
        return;
      }
      report('error', error instanceof Error && /timeout/i.test(error.name) ? 'timeout' : 'network_or_sdk_error');
      setPhase('error');
      setState((s) => ({ ...s, errorMessage: 'O pagamento demorou mais do que o esperado ou não conseguiu carregar. Tente novamente.', errorCode: 'TEMPORARY_PAYMENT_ERROR' }));
    }
  }, [payload, locale, signature, prepareEarly]);

  const hasPayload = payload !== null;
  // Only a changed checkout or unmount invalidates an active save/confirmation.
  // Equivalent payload objects may rerender while an API request is pending.
  useEffect(() => () => { inflight.current?.abort(); }, [signature, hasPayload, locale, prepareEarly]);
  // Detach this consumer on change/unmount, including while Stripe.js is loading.
  // Shared offer preparation belongs to the cache and survives navigation.
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
    const alreadyPrepared = !changed && stateRef.current.signature === signature && stateRef.current.elements;
    // A new payload object can describe the same settled cart. Its previous
    // effect cleanup detached the consumer; retain the prepared payment and
    // renew only that local lifetime, without another request or Elements mount.
    if (alreadyPrepared && inflight.current?.signal.aborted) inflight.current = new AbortController();
    const timer = alreadyPrepared ? null : setTimeout(() => void ensure(), prepareDelayMs);
    return () => {
      if (timer !== null) clearTimeout(timer);
    };
  }, [signature, hasPayload, ensure, prepareDelayMs]);

  const syncOrder = useCallback(async (nextPayload: CheckoutOrderPayload, expected?: { amountMinor: number; currency: string }): Promise<PaymentActionResult> => {
    const preparation = inflight.current;
    const isCurrent = () => preparation !== null && !preparation.signal.aborted &&
      inflight.current === preparation && state.elements !== null &&
      stateRef.current.elements === state.elements && state.signature === signature &&
      signatureRef.current === signature && preparedSignature.current === signature;
    if (!state.orderNumber || !state.checkoutToken || !isCurrent()) return { ok: false, reason: 'session_changed', errorMessage: 'Aguarde a atualização do pagamento.' };
    try {
      // Saving delivery must update the very draft used for this payment.
      const checkoutToken = state.checkoutToken;
      const { response, data } = await postWithSafeCheckoutRetry<{ error?: string; stage?: string; orderNumber?: string; pricingHash?: string; totals?: { total: string; currency: string } }>(
        '/api/checkout/create', { ...nextPayload, checkoutToken, draft: false }, AbortSignal.timeout(15_000), checkoutToken,
      );
      if (!isCurrent()) return { ok: false, reason: 'session_changed', errorMessage: 'Aguarde a atualização do pagamento.' };
      if (!response.ok) return {
        ok: false, reason: 'delivery_request_failed', httpStatus: response.status,
        errorMessage: response.status === 429
          ? 'Aguarde um momento antes de tentar novamente. Os seus dados foram mantidos.'
          : response.status === 409
            ? 'O estado desta encomenda mudou. Consulte o estado do pagamento antes de tentar novamente.'
            : 'Não foi possível guardar a morada. Os seus dados foram mantidos; tente novamente.',
      };
      // PT offer prices are shown in EUR. The hash protects the prepared intent;
      // this separate comparison protects the amount the shopper actually saw.
      const displayedAmountChanged = expected && (
        !Number.isSafeInteger(expected.amountMinor) || expected.currency !== 'EUR' ||
        data.totals?.currency !== expected.currency ||
        !Number.isFinite(Number(data.totals?.total)) ||
        Math.round(Number(data.totals?.total) * 100) !== expected.amountMinor
      );
      if (data.orderNumber !== state.orderNumber || data.pricingHash !== preparedPricingHash.current || displayedAmountChanged) {
        const errorMessage = displayedAmountChanged
          ? 'O preço da encomenda foi atualizado. Recarregue a página e confirme o novo total antes de pagar.'
          : 'O checkout foi atualizado. Atualize o pagamento antes de continuar.';
        if (prepareEarly && payload) invalidatePreparedOfferPayment(payload);
        preparedSignature.current = null;
        confirmedContact.current = null;
        preparation?.abort();
        setPhase('error');
        setState((s) => ({ ...s, signature: null, stripe: null, elements: null, errorMessage, errorCode: 'TEMPORARY_PAYMENT_ERROR' }));
        return { ok: false, reason: displayedAmountChanged ? 'displayed_amount_changed' : 'pricing_changed', errorMessage };
      }
      confirmedContact.current = nextPayload;
      return { ok: true };
    } catch (error) { return { ok: false, reason: error instanceof Error && /timeout/i.test(error.name) ? 'delivery_timeout' : 'delivery_network_error', errorMessage: 'Não foi possível guardar os dados de entrega. Os seus dados foram mantidos; tente novamente.' }; }
  }, [state, signature, prepareEarly, payload]);

  const confirmPayment = useCallback(async (method?: string): Promise<PaymentActionResult> => {
    const { stripe, elements, orderNumber, accessToken } = state;
    const preparation = inflight.current;
    const isCurrent = () => preparation !== null && !preparation.signal.aborted &&
      inflight.current === preparation && stateRef.current.elements === elements &&
      state.signature === signature && signatureRef.current === signature && preparedSignature.current === signature;
    if (!stripe || !elements || !orderNumber || !accessToken) {
      return { ok: false, reason: 'payment_not_ready', errorCode: 'TEMPORARY_PAYMENT_ERROR', errorMessage: 'Aguarde o carregamento do pagamento.' };
    }
    if (!isCurrent()) return { ok: false, errorMessage: 'Aguarde a atualização do pagamento.' };
    const contact = confirmedContact.current ?? payload;
    if (!contact) return { ok: false, errorMessage: 'Preencha os dados de contacto e entrega.' };
    if (!confirmedContact.current) {
      const synced = await syncOrder(contact);
      if (!synced.ok) return synced;
    }
    if (!isCurrent()) return { ok: false, errorMessage: 'Aguarde a atualização do pagamento.' };
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
      if (!isCurrent()) return { ok: false, reason: 'session_changed', errorMessage: 'O checkout mudou. Verifique o estado da encomenda antes de tentar novamente.' };

      if (error) {
        setPhase('ready');
        // Stripe-validated field errors surface inside the element; other
        // errors map to a safe customer message.
        if (error.type === 'validation_error') {
          return { ok: false, errorCode: 'PAYMENT_REQUIRES_ACTION', ...paymentErrorDetails(error), errorMessage: error.message ?? 'Verifique os dados de pagamento indicados acima.' };
        }
        const code: PaymentErrorCode =
          error.decline_code === 'canceled' || /cancel/i.test(error.message ?? '')
            ? 'PAYMENT_CANCELLED'
            : 'PAYMENT_FAILED';
        return { ok: false, errorCode: code, ...paymentErrorDetails(error), errorMessage: paymentFailureMessage(error, method) };
      }

      // Succeeded/processing in the browser still navigates to the status
      // page. The server then retrieves the same intent from XPayments and
      // reconciles the authoritative DB state before showing confirmation.
      if (paymentIntent && (paymentIntent.status === 'succeeded' || paymentIntent.status === 'processing')) {
        onCompleteRef.current(orderNumber, accessToken);
        return { ok: true };
      }
      // Voucher methods may return after showing instructions without a redirect.
      // A pending reference is not a paid order and must not leave the UI spinning.
      setPhase('ready');
      if (method === 'multibanco' && paymentIntent?.status === 'requires_action') {
        return { ok: true, paymentStatus: 'requires_action', multibanco: multibancoReference(paymentIntent.next_action) };
      }
      return { ok: false, errorCode: 'PAYMENT_REQUIRES_ACTION', reason: 'payment_not_completed', errorMessage: 'O pagamento ainda não foi concluído. Siga as instruções do meio de pagamento selecionado.' };
    } catch {
      if (!isCurrent()) return { ok: false, reason: 'session_changed', errorMessage: 'O checkout mudou. Verifique o estado da encomenda antes de tentar novamente.' };
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
    statusPath: state.orderNumber && state.accessToken
      ? `${returnPath}?order=${encodeURIComponent(state.orderNumber)}&token=${encodeURIComponent(state.accessToken)}`
      : null,
    errorMessage: state.errorMessage,
    errorCode: state.errorCode,
    syncOrder,
    confirmPayment,
    retry: () => {
      setPhase('idle');
      void ensure(true);
    },
  };
}
