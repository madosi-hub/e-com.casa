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
}

interface SessionState {
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
}

export function usePaymentSession({ payload, signature, onComplete }: UsePaymentSessionOptions) {
  const [phase, setPhase] = useState<PaymentSessionPhase>('idle');
  const [state, setState] = useState<SessionState>({
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
  const onCompleteRef = useRef(onComplete);
  const stateRef = useRef(state);
  useEffect(() => {
    onCompleteRef.current = onComplete;
    stateRef.current = state;
  }, [onComplete, state]);

  const ensure = useCallback(async () => {
    if (!payload) return;
    inflight.current?.abort();
    const controller = new AbortController();
    inflight.current = controller;
    setPhase('preparing');
    setState((s) => ({ ...s, errorMessage: null, errorCode: null }));

    try {
      // 1. Create/update the PENDING_PAYMENT order (server-repriced)
      const orderRes = await fetch('/api/checkout/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': getCheckoutToken(),
        },
        signal: controller.signal,
        body: JSON.stringify({ ...payload, checkoutToken: getCheckoutToken() }),
      });
      const orderData = await orderRes.json();
      if (!orderRes.ok) {
        setPhase('error');
        setState((s) => ({ ...s, errorMessage: orderData.error ?? 'Checkout failed', errorCode: 'TEMPORARY_PAYMENT_ERROR' }));
        return;
      }
      const { orderNumber, accessToken } = orderData as { orderNumber: string; accessToken: string };

      // 2. Create (or reuse) the XPayments PaymentIntent
      const intentRes = await fetch('/api/payments/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({ orderNumber, accessToken }),
      });
      const intentData = await intentRes.json();
      if (!intentRes.ok || !intentData.clientSecret) {
        setPhase('unavailable');
        setState((s) => ({
          ...s,
          errorMessage: intentData.error ?? 'Online payments are temporarily unavailable.',
          errorCode: 'PAYMENT_CONFIGURATION_ERROR',
        }));
        return;
      }

      // 3. Initialise Stripe + Elements (publishable key only).
      // Primary source is the server response so deployments cannot drift
      // between server and client env names. NEXT_PUBLIC fallback exists for
      // resilience and is safe because pk_* is explicitly browser-visible.
      const publishableKey =
        intentData.publishableKey ??
        process.env.NEXT_PUBLIC_XPAYMENTS_STRIPE_PUBLISHABLE_KEY ??
        '';
      if (!publishableKey) {
        setPhase('unavailable');
        setState((s) => ({ ...s, errorCode: 'PAYMENT_CONFIGURATION_ERROR', errorMessage: 'Payment could not be initialised.' }));
        return;
      }

      const stripe = await getStripe(publishableKey);
      if (!stripe) {
        setPhase('unavailable');
        setState((s) => ({ ...s, errorCode: 'PAYMENT_CONFIGURATION_ERROR', errorMessage: 'Payment could not be initialised.' }));
        return;
      }
      const elements = stripe.elements({
        clientSecret: intentData.clientSecret,
        appearance: ELEMENTS_APPEARANCE,
        loader: 'auto',
      });

      setState({
        orderNumber,
        accessToken,
        stripe,
        elements,
        methods: intentData.methods ?? [],
        errorMessage: null,
        errorCode: null,
      });
      setPhase('ready');
    } catch (error) {
      if (controller.signal.aborted) return;
      setPhase('error');
      setState((s) => ({ ...s, errorMessage: 'We could not start the payment. Please try again.', errorCode: 'TEMPORARY_PAYMENT_ERROR' }));
    }
  }, [payload]);

  // Re-ensure whenever the order signature changes and the payload is valid
  useEffect(() => {
    if (!payload) {
      const reset = setTimeout(() => setPhase('idle'), 0);
      return () => clearTimeout(reset);
    }
    const changed = signatureRef.current !== signature;
    signatureRef.current = signature;
    if (!changed && stateRef.current.elements) return;
    const timer = setTimeout(() => void ensure(), 650); // debounce bursts of typing
    return () => clearTimeout(timer);
  }, [signature, payload !== null]);

  const confirmPayment = useCallback(async (): Promise<{ ok: boolean; errorCode?: PaymentErrorCode; errorMessage?: string }> => {
    const { stripe, elements, orderNumber, accessToken } = state;
    if (!stripe || !elements || !orderNumber || !accessToken) {
      return { ok: false, errorCode: 'TEMPORARY_PAYMENT_ERROR', errorMessage: 'Payment is not ready yet.' };
    }
    setPhase('confirming');
    const returnUrl = `${window.location.origin}/checkout/success?order=${encodeURIComponent(orderNumber)}&token=${encodeURIComponent(accessToken)}`;

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: returnUrl },
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
  }, [state]);

  return {
    phase,
    stripe: state.stripe,
    elements: state.elements,
    methods: state.methods,
    orderNumber: state.orderNumber,
    errorMessage: state.errorMessage,
    errorCode: state.errorCode,
    confirmPayment,
    retry: () => {
      setPhase('idle');
      void ensure();
    },
  };
}
