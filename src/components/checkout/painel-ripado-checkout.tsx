'use client';

import { calculatePromoDiscount } from '@/lib/constants';
import { shippingPrice } from '@/lib/shipping';
import { panelDeliveryWindowLabel } from '@/lib/offers/panel-delivery';
import { DispatchNotice } from '@/components/offers/nuralta/campaign';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { StripeElements, StripePaymentElementOptions } from '@stripe/stripe-js';
import { ArrowRight, CheckCircle2, ChevronDown, Lock, LoaderCircle, MessageCircle, RotateCcw, ShieldCheck, ShoppingBag } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { useCart } from '@/lib/cart-store';
import { nuraltaCartImage } from '@/lib/catalog/nuralta-media';
import { offerTrackingParameters } from '@/lib/offers/attribution';
import { trackOfferEvent } from '@/lib/offers/analytics';
import { buildPanelCheckoutPayload, CHECKOUT_DRAFT_KEY, PANEL_CHECKOUT_COUNTRY } from '@/lib/offers/panel-checkout-payload';
import { NURALTA_OFFER_ALIAS, panelOfferPath, type PanelOfferSlug } from '@/lib/offers/route-policy';
import { translate } from '@/lib/i18n';
import { usePaymentSession } from '@/hooks/use-payment-session';
import { formatPrice, toNumber, money } from '@/lib/format';
import { PaymentElement } from '@/components/payments/payment-element';
import { PaymentLoadingSkeleton } from '@/components/payments/payment-loading-skeleton';
import { ExpressCheckout } from '@/components/payments/express-checkout';
import {
  PROMO_CODES,
} from '@/lib/constants';

const OFFER_COPY: Record<string, string> = {
  'checkout.title': 'Finalize a sua encomenda.',
  'checkout.payNote': 'Os dados de pagamento são tratados de forma segura pelos nossos parceiros.',
  'checkout.each': 'por unidade',
  'checkout.city': 'Localidade',
  'checkout.emptyTitle': 'O seu carrinho está vazio',
  'checkout.emptyDesc': 'Adicione um produto antes de avançar para o pagamento.',
};
const t = (key: string, vars?: Record<string, string | number>) => {
  const copy = OFFER_COPY[key];
  if (!copy) return translate('pt', key, vars);
  return Object.entries(vars ?? {}).reduce(
    (text, [name, value]) => text.split(`{${name}}`).join(String(value)),
    copy,
  );
};
const DELIVERY_FIELDS = ['firstName', 'email', 'address', 'city', 'postalCode'] as const;
const DELIVERY_REQUIRED_MESSAGES: Record<typeof DELIVERY_FIELDS[number], string> = {
  firstName: 'Preencha o seu nome completo.',
  email: 'Preencha o seu e-mail.',
  address: 'Preencha a morada de entrega.',
  city: 'Preencha a localidade de entrega.',
  postalCode: 'Preencha o código postal de entrega.',
};
function checkoutLineLabel(line: { slug: string; name: string; quantity: number; variantLabel?: string | null }) {
  const isPanel = line.slug.includes('painel-ripado') || line.name.startsWith('Painel Ripado');
  const isInstallationKit = line.slug === 'nuralta-kit-instalacao-completo';
  const productName = isPanel ? 'Ripado' : isInstallationKit ? 'Kit de instalação' : line.name;
  const variantParts = isInstallationKit ? [] : line.variantLabel?.split(' · ').map((part) => part.trim()).filter(Boolean) ?? [];
  return [`${line.quantity}× ${productName}`, ...variantParts].join(' · ');
}
function deliveryFieldError(name: string, value: string): string {
  if (!value.trim()) return DELIVERY_REQUIRED_MESSAGES[name as keyof typeof DELIVERY_REQUIRED_MESSAGES] ?? '';
  if (name === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
    return 'Introduza um endereço de e-mail válido.';
  }
  if (name === 'postalCode' && !/^\d{4}-\d{3}$/.test(value.trim())) return 'Introduza um código postal válido (0000-000).';
  return '';
}

const PAYMENT_ELEMENT_OPTIONS: StripePaymentElementOptions = {
  layout: {
    type: 'accordion',
    defaultCollapsed: false,
    radios: true,
    spacedAccordionItems: true,
    visibleAccordionItemsCount: 0,
  },
  // Preference only: Stripe still determines eligibility for this PaymentIntent.
  paymentMethodOrder: ['mb_way', 'card', 'multibanco'],
  wallets: { link: 'never' },
  // Contact details are collected above and supplied by confirmPayment.
  fields: { billingDetails: { email: 'never', name: 'never' } },
};
const CHECKOUT_CARD_CLASS = 'rounded-2xl border border-[#dedbd3] bg-white shadow-[0_3px_16px_rgba(32,26,23,.04)]';
const CHECKOUT_LABEL_CLASS = 'text-[14px] font-medium leading-5 text-[#27272a]';
const CHECKOUT_FIELD_CLASS = 'mt-2 h-[50px] rounded-[16px] border-[#85858e] bg-[#fafafa] px-4 text-[16px] font-normal leading-[24px] text-[#27272a] shadow-none placeholder:text-[#676770] focus-visible:border-[#201a17] focus-visible:ring-[#201a17]/25 md:text-[16px]';

export default function CheckoutPage({ offerSlug = NURALTA_OFFER_ALIAS }: { offerSlug?: PanelOfferSlug }) {
  const router = useRouter();
  const offerPath = panelOfferPath(offerSlug);
  const checkoutPath = panelOfferPath(offerSlug, '/checkout');
  const cart = useCart();
  const [mounted, setMounted] = useState(false);
  const [draftHydrated, setDraftHydrated] = useState(false);
  const [trackingParameters, setTrackingParameters] = useState<Record<string, string | null> | null>(null);

  const [form, setForm] = useState({
    email: '',
    firstName: '',
    address: '',
    address2: '',
    city: '',
    postalCode: '',
    country: PANEL_CHECKOUT_COUNTRY,
  });
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof typeof form, string>>>({});
  const deliverySectionRef = useRef<HTMLElement>(null);
  const paymentHeadingRef = useRef<HTMLHeadingElement>(null);
  const [reviewedDeliveryKey, setReviewedDeliveryKey] = useState<string | null>(null);
  const deliveryReviewed = reviewedDeliveryKey === JSON.stringify(form);
  const [paySubmitting, setPaySubmitting] = useState(false);
  const paySubmittingRef = useRef(false);
  const [paymentElementState, setPaymentElementState] = useState<{ elements: StripeElements; status: 'loading' | 'ready' | 'error'; complete: boolean; method?: string } | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const paymentErrorRef = useRef<HTMLDivElement>(null);
  const paymentProgress = useRef<{ elements: StripeElements; method: string; complete: boolean } | null>(null);
  const elementStartedAt = useRef(0);
  const [shippingReadyKey, setShippingReadyKey] = useState<string | null>(null);

  // Restore the offer checkout draft after hydration.
  useEffect(() => {
    document.documentElement.lang = 'pt-PT';
    try {
      const raw = window.localStorage.getItem(CHECKOUT_DRAFT_KEY);
      if (raw) {
        const { marketingOptIn: _legacyMarketingOptIn, termsAccepted: _legacyTermsAccepted, ...saved } = JSON.parse(raw) as Partial<typeof form> & { marketingOptIn?: boolean; termsAccepted?: boolean };
        // Draft restoration is a one-time client hydration step from localStorage.
        setForm((current) => ({ ...current, ...saved, country: PANEL_CHECKOUT_COUNTRY }));
      }
    } catch {
      // A blocked or malformed local draft must never prevent checkout.
    }
    setTrackingParameters(offerTrackingParameters(offerSlug));
    setDraftHydrated(true);
    setMounted(true);
    trackOfferEvent('checkout_experience_view', { offerSlug, version: 'guided_v2' });
  }, []);

  useEffect(() => {
    if (!draftHydrated) return;
    try {
      window.localStorage.setItem(CHECKOUT_DRAFT_KEY, JSON.stringify(form));
    } catch {
      // Persistence is best effort; checkout remains fully functional.
    }
  }, [draftHydrated, form]);

  const displayLines = mounted ? cart.lines : [];
  const subtotal = mounted ? toNumber(cart.subtotal().toFixed(2)) : 0;
  const promo = mounted && cart.promoCode ? PROMO_CODES[cart.promoCode] : null;
  const discount = calculatePromoDiscount(displayLines, promo);
  const shipping = shippingPrice(form.country, subtotal - discount, 'standard');
  const total = Math.max(0, subtotal - discount + shipping);
  const set = (key: keyof typeof form, value: string) => {
    if (['address', 'city', 'postalCode', 'country'].includes(key) && value.trim() !== form[key].trim()) setShippingReadyKey(null);
    setForm((f) => ({ ...f, [key]: value }));
  };
  const deliveryAddressComplete = ['address', 'city', 'postalCode'].every(
    (name) => !deliveryFieldError(name, form[name as keyof typeof form]),
  );
  const shippingAddressKey = JSON.stringify([form.country, form.address.trim(), form.city.trim(), form.postalCode.trim()]);
  const shippingQuoteStatus = !deliveryAddressComplete ? 'idle' : shippingReadyKey === shippingAddressKey ? 'ready' : 'loading';

  // Preserve the delivery reveal after address entry. Pricing remains local;
  // this delay does not represent a carrier API request.
  useEffect(() => {
    if (!deliveryAddressComplete) return;
    const timer = window.setTimeout(() => setShippingReadyKey(shippingAddressKey), 1000);
    return () => window.clearTimeout(timer);
  }, [deliveryAddressComplete, shippingAddressKey]);

  // Real payment session
  // The draft can prepare payment before contact and delivery are filled in.
  const detailsValid = DELIVERY_FIELDS.every((name) => !deliveryFieldError(name, form[name]));
  useEffect(() => {
    if (draftHydrated) trackOfferEvent('checkout_delivery_status', { offerSlug, status: detailsValid ? 'valid' : 'incomplete' });
  }, [draftHydrated, detailsValid, offerSlug]);

  const payload = useMemo(
    () => draftHydrated && cart.lines.length > 0
      ? buildPanelCheckoutPayload(cart.lines, cart.promoCode, form.country, trackingParameters)
      : null,
    [
      cart.lines,
      draftHydrated,
      cart.promoCode,
      form.country,
      trackingParameters,
    ],
  );

  const signature = useMemo(
    () => (payload ? JSON.stringify(payload) : 'invalid'),
    [payload],
  );

  const finishOrder = (orderNumber: string, accessToken: string) => {
    try { window.localStorage.removeItem(CHECKOUT_DRAFT_KEY); } catch { /* best effort */ }
    saveOrderReference(orderNumber, accessToken);
    router.push(`${checkoutPath}/sucesso?order=${encodeURIComponent(orderNumber)}&token=${encodeURIComponent(accessToken)}`);
  };

  const session = usePaymentSession({
    payload,
    signature,
    onComplete: finishOrder,
    locale: 'pt',
    returnPath: `${checkoutPath}/sucesso`,
    prepareDelayMs: 0,
    prepareEarly: true,
    onPreparationEvent: ({ stage, status, durationMs, reason }) => {
      trackOfferEvent('checkout_payment_loading', { offerSlug, stage, status, duration_ms: durationMs, reason });
      if (stage === 'stripe' && status === 'ready') {
        elementStartedAt.current = Date.now();
        trackOfferEvent('checkout_payment_loading', { offerSlug, stage: 'element', status: 'started', duration_ms: 0 });
      }
    },
  });
  // Readiness means the iframe can validate input, not that every field is filled.
  const paymentReady = session.elements !== null && paymentElementState?.elements === session.elements && paymentElementState.status === 'ready';
  const paymentLoadFailed = session.elements !== null && paymentElementState?.elements === session.elements && paymentElementState.status === 'error';
  const paymentMethod = paymentElementState?.elements === session.elements ? paymentElementState?.method : undefined;
  const paymentHelp = paymentMethod === 'mb_way'
    ? 'Depois de carregar em Pagar, confirme o pedido na aplicação MB WAY do seu telemóvel.'
    : paymentMethod === 'multibanco'
      ? 'Vamos gerar uma entidade e referência. A encomenda só fica paga depois de efetuar o pagamento no Multibanco ou no seu banco.'
      : paymentMethod === 'card'
        ? 'Introduza os dados do cartão. O seu banco pode pedir uma confirmação de segurança.'
        : 'Escolha uma opção e preencha os dados de pagamento abaixo.';

  const showPaymentError = (message: string, focus = true) => {
    setPaymentError(message);
    if (focus) window.requestAnimationFrame(() => paymentErrorRef.current?.focus());
  };

  const validateField = (name: keyof typeof form, input: HTMLInputElement) => {
    const message = deliveryFieldError(name, input.value) ||
      (input.validity.typeMismatch ? 'Introduza um endereço de e-mail válido.' : '');
    setFieldErrors((current) => ({ ...current, [name]: message }));
    if (message && fieldErrors[name] !== message) trackOfferEvent('checkout_field_error', { offerSlug, field: name, reason: input.value.trim() ? 'invalid' : 'required' });
  };

  const reviewDeliveryDetails = () => {
    const errors: Partial<Record<keyof typeof form, string>> = {};
    const delivery = { ...form };
    let firstInvalid: HTMLInputElement | null = null;
    for (const name of DELIVERY_FIELDS) {
      const input = deliverySectionRef.current?.querySelector<HTMLInputElement>(`#co-${name}`);
      const message = deliveryFieldError(name, input?.value ?? form[name]) ||
        (input?.validity.typeMismatch ? 'Introduza um endereço de e-mail válido.' : '');
      errors[name] = message;
      delivery[name] = (input?.value ?? form[name]).trim();
      if (message) trackOfferEvent('checkout_field_error', { offerSlug, field: name, reason: delivery[name] ? 'invalid' : 'required' });
      if (message && input && !firstInvalid) firstInvalid = input;
    }
    setFieldErrors(errors);
    if (firstInvalid) {
      setReviewedDeliveryKey(null);
      const input = firstInvalid;
      // Let the inline error render before focusing its associated input.
      window.requestAnimationFrame(() => {
        if (!input.isConnected) return;
        input.focus({ preventScroll: true });
        input.scrollIntoView({
          behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
          block: 'center',
        });
      });
    }
    if (Object.values(errors).some(Boolean)) return null;
    // Some autofill providers update the DOM before React receives a change event.
    if (DELIVERY_FIELDS.some((name) => delivery[name] !== form[name])) setForm(delivery);
    return delivery;
  };

  const continueToPayment = () => {
    if (paySubmittingRef.current || session.phase === 'confirming') return;
    const delivery = reviewDeliveryDetails();
    if (!delivery) return;
    setReviewedDeliveryKey(JSON.stringify(delivery));
    trackOfferEvent('checkout_delivery_continue', { offerSlug, version: 'guided_v2' });
    window.requestAnimationFrame(() => {
      paymentHeadingRef.current?.focus({ preventScroll: true });
      paymentHeadingRef.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    });
  };

  const onPay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (paySubmittingRef.current || session.phase === 'confirming') return;
    setPaymentError(null);
    if (cart.lines.length === 0) {
      trackOfferEvent('checkout_blocked', { offerSlug, stage: 'empty_cart' });
      toast({ title: t('checkout.toastEmpty'), variant: 'destructive' });
      return;
    }
    const delivery = reviewDeliveryDetails();
    if (!delivery) {
      trackOfferEvent('checkout_blocked', { offerSlug, stage: 'delivery_details' });
      return;
    }
    if (session.phase !== 'ready' || !session.elements || !paymentReady) {
      trackOfferEvent('checkout_blocked', { offerSlug, stage: 'payment_not_ready' });
      return;
    }
    paySubmittingRef.current = true;
    setPaySubmitting(true);
    try {
      // Stripe validates the selected payment method before we create a
      // pending sale in UTMify. An incomplete card or MB WAY form stops here.
      const { error } = await session.elements.submit();
      if (error) {
        trackOfferEvent('checkout_blocked', { offerSlug, stage: 'payment_details', reason: error.type });
        showPaymentError(error.message ?? 'Verifique os dados de pagamento indicados acima.', false);
        return;
      }

      const synced = await session.syncOrder({
        ...payload!,
        email: delivery.email,
        firstName: delivery.firstName,
        lastName: delivery.firstName,
        address: delivery.address,
        address2: delivery.address2.trim() || null,
        city: delivery.city,
        postalCode: delivery.postalCode,
        phone: null,
        notes: null,
        marketingConsent: false,
      });
      if (!synced.ok) {
        trackOfferEvent('checkout_payment_error', { offerSlug, stage: 'save_delivery' });
        showPaymentError(synced.errorMessage ?? 'Não foi possível guardar a morada. Os seus dados foram mantidos; tente novamente.');
        return;
      }

      trackOfferEvent('checkout_payment_attempt', { offerSlug, stage: 'confirm', method: paymentMethod ?? 'unknown' });
      const result = await session.confirmPayment();
      trackOfferEvent('checkout_payment_result', { offerSlug, status: result.ok ? 'submitted' : 'error', method: paymentMethod ?? 'unknown' });
      if (!result.ok) {
        trackOfferEvent('checkout_payment_error', { offerSlug, stage: 'confirm', reason: result.errorCode ?? 'unknown' });
        const message =
          result.errorCode === 'PAYMENT_CANCELLED'
            ? t('checkout.errorCancelled')
            : t('checkout.errorPayment');
        showPaymentError(result.errorMessage ?? message);
      }
      // On success confirmPayment either redirects (3DS / async methods)
      // or calls onComplete → success page (server-verified).
    } catch {
      trackOfferEvent('checkout_payment_error', { offerSlug, stage: 'unexpected' });
      showPaymentError(t('checkout.errorPayment'));
    } finally {
      paySubmittingRef.current = false;
      setPaySubmitting(false);
    }
  };

  if (mounted && cart.lines.length === 0) {
    return (
      <div className="container-ecom flex min-h-[55vh] flex-col items-center justify-center py-16 text-center font-sans">
        <ShoppingBag className="h-10 w-10 text-muted-foreground" strokeWidth={1.25} />
        <h1 className="mt-5 text-[28px] font-semibold leading-tight">{t('checkout.emptyTitle')}</h1>
        <p className="mt-2 text-[14px] text-muted-foreground">{t('checkout.emptyDesc')}</p>
        <Link href={offerPath} className="mt-6 inline-flex h-11 items-center rounded-md bg-primary px-7 text-[14px] font-semibold text-primary-foreground">
          Voltar à oferta
        </Link>
      </div>
    );
  }

  const field = (
    name: keyof typeof form,
    label: string,
    props: React.InputHTMLAttributes<HTMLInputElement> = {},
    half = false
  ) => (
    <div className={half ? 'min-w-0' : 'min-w-0 sm:col-span-2'}>
      <Label htmlFor={`co-${name}`} className={CHECKOUT_LABEL_CLASS}>
        {label}
      </Label>
      <div className="relative">
        <Input
          id={`co-${name}`}
          name={name}
          required={props.required !== false}
          value={String(form[name] ?? '')}
          onChange={(e) => {
            set(name, e.target.value);
            if (fieldErrors[name]) validateField(name, e.currentTarget);
          }}
          className={`${CHECKOUT_FIELD_CLASS}${fieldErrors[name] ? ' border-[#a32924]' : ''}`}
          {...props}
          aria-invalid={Boolean(fieldErrors[name])}
          aria-describedby={[fieldErrors[name] ? `co-${name}-error` : '', name === 'email' ? 'co-email-help' : ''].filter(Boolean).join(' ') || undefined}
          onBlur={(event) => {
            validateField(name, event.currentTarget);
            props.onBlur?.(event);
          }}
        />
      </div>
      {fieldErrors[name] && <p id={`co-${name}-error`} className="mt-1 text-sm text-[#a32924]" aria-live="polite">{fieldErrors[name]}</p>}
      {name === 'email' && <p id="co-email-help" className="mt-2 text-sm leading-5 text-[#626057]">Enviaremos as informações sobre a sua encomenda para este e-mail.</p>}
    </div>
  );

  const payDisabled =
    paySubmitting ||
    session.phase !== 'ready' || !paymentReady;

  return (
    <div className="mx-auto w-full max-w-[1120px] px-4 py-6 font-sans text-[#201a17] sm:px-6 sm:py-10">
      <header className="mb-6 sm:mb-8">
        <p className="mb-3 flex items-center gap-2 text-sm font-medium text-[#4b5d42]"><ShieldCheck aria-hidden className="h-4 w-4" /> Compra segura · Sem criar conta</p>
        <h1 className="text-[30px] font-semibold leading-[1.15] tracking-tight sm:text-[38px]">{t('checkout.title')}</h1>
        <p className="mt-3 max-w-xl text-base leading-6 text-[#626057]">Confirme os dados de entrega e escolha como prefere pagar.</p>
        <ol aria-label="Etapas da encomenda" className="mt-6 flex max-w-md items-center gap-3 text-sm font-medium">
          <li aria-current={!deliveryReviewed ? 'step' : undefined} className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-[#344731] text-white">{deliveryReviewed ? <CheckCircle2 aria-label="Preenchida" className="h-4 w-4" /> : '1'}</span> Entrega
          </li>
          <li aria-hidden className="h-px min-w-6 flex-1 bg-[#c9cec2]" />
          <li aria-current={deliveryReviewed ? 'step' : undefined} className="flex items-center gap-2">
            <span className={'grid h-8 w-8 place-items-center rounded-full border ' + (deliveryReviewed ? 'border-[#344731] bg-[#344731] text-white' : 'border-[#b1b4aa] text-[#626057]')}>2</span> Pagamento
          </li>
        </ol>
      </header>
      <form onSubmit={onPay} noValidate className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)] lg:gap-x-8">
        <aside aria-label="Resumo da encomenda" className="min-w-0 lg:sticky lg:top-6 lg:col-start-2 lg:row-start-1">
          <div className={CHECKOUT_CARD_CLASS + ' overflow-hidden'}>
            <div className="flex items-center justify-between gap-3 border-b border-[#dedbd3] bg-[#f4f3ed] px-4 py-3 sm:px-5">
              <h2 className="text-base font-semibold">A sua escolha</h2>
              <Link href={offerPath + '?carrinho=aberto'} className="inline-flex min-h-11 items-center rounded px-1 text-sm font-medium underline underline-offset-4 focus-visible:outline-2">Editar carrinho</Link>
            </div>
            <div className="p-4 sm:p-5">
              <ul className="space-y-4">
                {displayLines.map((line) => (
                  <li key={line.slug + '-' + (line.variantId ?? '')} className="flex items-start gap-3">
                    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-[#dedbd3] bg-[#f4f3ed]">
                      <Image src={nuraltaCartImage(line.slug, line.image)} alt={line.name} fill sizes="80px" className="object-cover" />
                    </div>
                    <div className="min-w-0 flex-1 py-0.5">
                      <p className="break-words text-sm font-semibold leading-5">{checkoutLineLabel(line)}</p>
                      <p className="mt-2 text-base font-semibold tabular-nums">{formatPrice(toNumber(line.price) * line.quantity)}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <details className="group mt-4 border-t border-[#dedbd3]">
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 text-sm text-[#626057] [&::-webkit-details-marker]:hidden">
                  Ver detalhes do valor <ChevronDown aria-hidden className="h-4 w-4 transition-transform group-open:rotate-180" />
                </summary>
                <dl className="space-y-3 pb-3 text-sm">
                  <div className="flex justify-between gap-3"><dt>Subtotal</dt><dd>{formatPrice(subtotal)}</dd></div>
                  {discount > 0 && <div className="flex justify-between gap-3 text-[#344731]"><dt>Desconto ({cart.promoCode})</dt><dd>−{formatPrice(discount)}</dd></div>}
                  <div className="flex justify-between gap-3"><dt>IVA</dt><dd>Incluído</dd></div>
                </dl>
              </details>
              {shippingQuoteStatus !== 'ready' && <p className="mb-4 text-sm leading-5 text-[#626057]">Portes: {shippingQuoteStatus === 'loading' ? 'a calcular…' : 'a calcular após preencher a morada'}.</p>}
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#dedbd3] pt-4">
                <span className="text-base font-semibold">Total da encomenda</span>
                <strong className="text-[26px] font-semibold tracking-tight tabular-nums">{formatPrice(money(total))}</strong>
              </div>
              <p className="mt-1 text-sm text-[#626057]">IVA incluído</p>
              <div className="mt-4 border-t border-[#dedbd3] pt-4"><DispatchNotice /></div>
            </div>
          </div>
          <div className="mt-4 hidden rounded-2xl border border-[#dedbd3] p-5 lg:block">
            <h3 className="text-base font-semibold">Compre com tudo esclarecido.</h3>
            <p className="mt-2 text-sm leading-6 text-[#626057]">Consulte as condições ou fale com a nossa equipa antes de concluir.</p>
            <Link href={panelOfferPath(offerSlug, '/informacao/contacto')} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-semibold underline underline-offset-4"><MessageCircle aria-hidden className="h-4 w-4" /> Apoio ao cliente <span className="sr-only">(abre num novo separador)</span></Link>
          </div>
        </aside>

        {/* Delivery and payment follow the summary in reading order. */}
        <div className="min-w-0 space-y-5 lg:col-start-1 lg:row-start-1">
          <section ref={deliverySectionRef} aria-labelledby="co-delivery-title" className={`${CHECKOUT_CARD_CLASS} p-4 sm:p-6`}>
            <div className="flex items-center gap-3">
              <span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#edf1e9] text-sm font-semibold text-[#344731]">{deliveryReviewed ? <CheckCircle2 className="h-5 w-5" /> : '1'}</span>
              <div className="min-w-0">
                <h2 id="co-delivery-title" className="text-xl font-semibold leading-7">{deliveryReviewed ? 'A sua entrega' : 'Onde vamos entregar?'}</h2>
              </div>
              {deliveryReviewed && <button type="button" onClick={() => {
                setReviewedDeliveryKey(null);
                window.requestAnimationFrame(() => deliverySectionRef.current?.querySelector<HTMLInputElement>('#co-firstName')?.focus());
              }} className="ml-auto min-h-11 rounded px-2 text-sm font-semibold underline underline-offset-4 focus-visible:outline-2">Editar</button>}
            </div>
            {deliveryReviewed && <div className="rr-block rr-mask mt-4 space-y-1 break-words rounded-xl bg-[#f5f6f1] p-4 text-sm leading-6">
              <p className="font-semibold">{form.firstName}</p>
              <p>{form.email}</p>
              <p>{form.address}{form.address2 ? `, ${form.address2}` : ''}</p>
              <p>{form.postalCode} · {form.city} · Portugal</p>
            </div>}
            <div hidden={deliveryReviewed}>
            <p className="mt-3 text-sm leading-5 text-[#626057]">Preencha os dados necessários para entregar a sua encomenda. As informações adicionais da morada são opcionais.</p>
            <div className="mt-5 grid grid-cols-1 gap-x-3 gap-y-5 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
              {field('firstName', 'Nome completo', { autoComplete: 'name', placeholder: 'O seu nome' })}
              {field('email', 'E-mail', {
                type: 'email',
                autoComplete: 'email',
                placeholder: 'o.seu.email@exemplo.com',
              })}
              {field('address', t('checkout.address'), { autoComplete: 'address-line1', placeholder: 'Rua e número' })}
              <details open={Boolean(form.address2) || undefined} className="sm:col-span-2">
                <summary className="flex min-h-11 cursor-pointer items-center text-sm font-medium underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2">Adicionar andar, porta ou outras indicações (opcional)</summary>
                {field('address2', 'Informações adicionais da morada (opcional)', { autoComplete: 'address-line2', placeholder: 'Andar, porta ou ponto de referência', required: false })}
              </details>
              {field('city', t('checkout.city'), { autoComplete: 'address-level2', placeholder: 'Lisboa' }, true)}
              <div className="min-w-0">
                <Label htmlFor="co-postalCode" className={CHECKOUT_LABEL_CLASS}>{t('checkout.postal')}</Label>
                <Input
                  id="co-postalCode"
                  name="postalCode"
                  required
                  autoComplete="postal-code"
                  inputMode="numeric"
                  maxLength={8}
                  placeholder="1000-001"
                  value={form.postalCode}
                  onChange={(event) => {
                    const digits = event.target.value.replace(/\D/g, '').slice(0, 7);
                    const postalCode = digits.length > 4 ? `${digits.slice(0, 4)}-${digits.slice(4)}` : digits;
                    set('postalCode', postalCode);
                    if (fieldErrors.postalCode) setFieldErrors((current) => ({ ...current, postalCode: deliveryFieldError('postalCode', postalCode) }));
                  }}
                  onBlur={(event) => {
                    validateField('postalCode', event.currentTarget);
                  }}
                  aria-invalid={Boolean(fieldErrors.postalCode)}
                  aria-describedby={fieldErrors.postalCode ? 'co-postalCode-error' : undefined}
                  className={`${CHECKOUT_FIELD_CLASS}${fieldErrors.postalCode ? ' border-[#a32924]' : ''}`}
                />
                {fieldErrors.postalCode && <p id="co-postalCode-error" className="mt-1 text-sm text-[#a32924]" aria-live="polite">{fieldErrors.postalCode}</p>}
              </div>
            </div>
            </div>
              {shippingQuoteStatus === 'loading' && (
                <div role="status" className="mt-2 flex min-h-10 items-center gap-2 rounded-xl border border-[#dedfe3] bg-[#fbfbfc] px-3 py-3 text-sm text-[#5c5049] sm:col-span-2">
                  <LoaderCircle aria-hidden className="h-4 w-4 shrink-0 animate-spin" />
                  A calcular os portes para Portugal…
                </div>
              )}
              {shippingQuoteStatus === 'ready' && <div role="status" className="mt-2 flex min-h-10 flex-wrap items-center gap-2 rounded-xl border border-[#dedfe3] bg-[#fbfbfc] px-3 py-3 text-sm text-[#5c5049] sm:col-span-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-[#65755a]" aria-hidden />
                <span className="font-medium">{shipping === 0 ? 'Entrega grátis por' : 'Entrega por'}</span>
                <Image src="/pt/images/logo-ctt-express.svg" alt="CTT Express" width={82} height={27} className="h-auto w-[76px]" />
                {shipping > 0 && <span className="font-medium">· {formatPrice(shipping)}</span>}
                <p className="basis-full text-sm font-medium leading-5 text-[#405236]">{panelDeliveryWindowLabel()}</p>
                <p className="basis-full text-xs leading-5 text-[#6f6259]">1 a 4 dias úteis, para pagamentos confirmados hoje.</p>
              </div>}
            {!deliveryReviewed && <button type="button" onClick={continueToPayment} disabled={paySubmitting || session.phase === 'confirming'} className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#344731] px-4 py-3 text-base font-semibold text-white hover:bg-[#253523] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#344731] disabled:opacity-60">
              Continuar para o pagamento <ArrowRight aria-hidden className="h-5 w-5" />
            </button>}
          </section>

          {/* Payment — real Stripe Elements flow */}
          <section aria-labelledby="co-payment" className={`${CHECKOUT_CARD_CLASS} overflow-hidden border-[#b4bfaa] p-4 sm:p-6`}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="co-payment" ref={paymentHeadingRef} tabIndex={-1} className="flex scroll-mt-6 items-center gap-3 rounded text-xl font-semibold leading-7 focus:outline-2 focus:outline-offset-4 focus:outline-[#344731]">
                <span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#edf1e9] text-sm font-semibold text-[#344731]">2</span>
                Como prefere pagar?
              </h2>
              <span className="flex items-center gap-1.5 text-sm text-[#4b5d42]"><Lock aria-hidden className="h-3.5 w-3.5" /> Pagamento seguro</span>
            </div>
            <p className="mt-3 text-sm leading-6 text-[#626057]">Escolha uma das opções disponíveis. Os dados de pagamento são introduzidos num formulário protegido.</p>

            {(session.phase === 'error' || session.phase === 'unavailable') && (
              <div role="alert" className="mt-4 rounded-xl border border-terracotta/30 bg-terracotta/5 px-4 py-3">
                <p className="min-h-11 text-sm leading-relaxed text-muted-foreground">
                  {session.errorMessage ?? t('checkout.errorPayment')}
                </p>
                <button
                  type="button"
                  onClick={session.retry}
                  className="mt-2 min-h-11 text-sm font-semibold text-olive underline underline-offset-2"
                >
                  {t('checkout.paymentRetry')}
                </button>
                <button type="button" onClick={() => window.location.reload()} className="ml-4 min-h-11 text-sm underline underline-offset-2">
                  Recarregar página
                </button>
              </div>
            )}

            {!session.elements && (session.phase === 'preparing' || session.phase === 'idle') && (
              <PaymentLoadingSkeleton className="mt-4" label="A carregar as opções de pagamento seguro…" />
            )}

            {session.elements && (
              <>
                <ExpressCheckout
                  stripe={session.stripe}
                  elements={session.elements}
                  className="mt-5"
                  onBeforeConfirm={async () => {
                    if (paySubmittingRef.current || session.phase === 'confirming') throw new Error('O pagamento já está a ser processado.');
                    const delivery = reviewDeliveryDetails();
                    if (!delivery || !payload) {
                      trackOfferEvent('checkout_blocked', { offerSlug, stage: 'delivery_details', method: 'express' });
                      throw new Error('Preencha os dados de entrega para continuar.');
                    }
                    paySubmittingRef.current = true;
                    setPaySubmitting(true);
                    setPaymentError(null);
                    try {
                      const synced = await session.syncOrder({
                        ...payload,
                        email: delivery.email,
                        firstName: delivery.firstName,
                        lastName: delivery.firstName,
                        address: delivery.address,
                        address2: delivery.address2.trim() || null,
                        city: delivery.city,
                        postalCode: delivery.postalCode,
                      });
                      if (!synced.ok) throw new Error(synced.errorMessage ?? 'Não foi possível atualizar a encomenda.');
                    } catch (error) {
                      paySubmittingRef.current = false;
                      setPaySubmitting(false);
                      trackOfferEvent('checkout_payment_error', { offerSlug, stage: 'save_delivery', method: 'express' });
                      showPaymentError('Não foi possível guardar os dados de entrega. Tente novamente.');
                      throw error;
                    }
                  }}
                  onConfirm={async () => {
                    try {
                      trackOfferEvent('checkout_payment_attempt', { offerSlug, stage: 'confirm', method: 'express' });
                      const result = await session.confirmPayment();
                      trackOfferEvent('checkout_payment_result', { offerSlug, status: result.ok ? 'submitted' : 'error', method: 'express' });
                      if (!result.ok) throw new Error(result.errorMessage ?? t('checkout.errorPayment'));
                    } catch (error) {
                      trackOfferEvent('checkout_payment_error', { offerSlug, stage: 'confirm', method: 'express' });
                      showPaymentError(error instanceof Error ? error.message : t('checkout.errorPayment'));
                      throw error;
                    } finally {
                      paySubmittingRef.current = false;
                      setPaySubmitting(false);
                    }
                  }}
                />
                <PaymentElement
                  elements={session.elements}
                  options={PAYMENT_ELEMENT_OPTIONS}
                  className="mt-5"
                  ariaLabel="Dados de pagamento seguros"
                  loadingLabel="A carregar o pagamento seguro…"
                  onReady={() => {
                    setPaymentElementState((current) => ({ elements: session.elements!, status: 'ready', complete: current?.elements === session.elements ? current.complete : false, method: current?.elements === session.elements ? current.method : undefined }));
                    trackOfferEvent('checkout_payment_loading', { offerSlug, stage: 'element', status: 'ready', duration_ms: Date.now() - elementStartedAt.current });
                  }}
                  onLoadError={(reason) => {
                    setPaymentElementState({ elements: session.elements!, status: 'error', complete: false });
                    trackOfferEvent('checkout_payment_loading', { offerSlug, stage: 'element', status: 'error', duration_ms: Date.now() - elementStartedAt.current, reason });
                  }}
                  onChange={(event) => {
                    // Only normalized method/completeness are sent; never field contents.
                    const method = ['card', 'mb_way', 'multibanco'].includes(event.value?.type ?? '') ? event.value!.type : 'other';
                    const complete = event.complete === true;
                    const previous = paymentProgress.current;
                    if (previous?.elements !== session.elements || previous.method !== method) trackOfferEvent('checkout_payment_method', { offerSlug, method });
                    if (previous?.elements !== session.elements || previous.method !== method || previous.complete !== complete) trackOfferEvent('checkout_payment_details', { offerSlug, method, status: complete ? 'complete' : 'incomplete' });
                    paymentProgress.current = { elements: session.elements!, method, complete };
                    setPaymentElementState((current) => ({ elements: session.elements!, status: current?.elements === session.elements ? current.status : 'loading', complete, method }));
                  }}
                  onRetry={session.retry}
                />
              </>
            )}

            <p id="co-payment-help" className="mt-4 rounded-xl bg-[#f4f6f0] p-3 text-sm leading-6 text-[#344731]" aria-live="polite">{paymentHelp}</p>
            {paymentError && (
              <div id="co-payment-error" ref={paymentErrorRef} tabIndex={-1} role="alert" className="mt-4 rounded-xl border border-[#a32924] bg-[#fff6f5] p-4 text-sm leading-6 text-[#a32924] focus:outline-2 focus:outline-offset-2">
                <p className="font-semibold">Não foi possível concluir o pagamento</p>
                <p>{paymentError}</p>
                <p className="mt-1">Os seus dados de entrega foram mantidos.</p>
              </div>
            )}
            <div className="mt-6 flex flex-wrap items-end justify-between gap-2 border-t border-[#dedbd3] pt-5">
              <div><p className="text-base font-semibold">Total a pagar</p><p className="mt-1 text-sm text-[#626057]">Pagamento único · IVA incluído</p></div>
              <p className="text-[28px] font-semibold tracking-tight tabular-nums">{formatPrice(money(total))}</p>
            </div>
            <button
              type="submit"
              disabled={payDisabled}
              aria-describedby={paymentError ? 'co-payment-error co-payment-help' : 'co-payment-help'}
              aria-busy={paySubmitting || session.phase === 'confirming'}
              className="mt-4 flex min-h-[50px] w-full items-center justify-center gap-2 rounded-xl bg-[#344731] px-4 py-4 text-[16px] font-semibold text-white transition-colors hover:bg-[#253523] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#344731] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {paySubmitting || session.phase === 'confirming' ? (
                <><LoaderCircle aria-hidden className="h-4 w-4 animate-spin" /> {t('checkout.processing')}</>
              ) : session.phase === 'error' || session.phase === 'unavailable' || paymentLoadFailed ? (
                'Pagamento indisponível — tente novamente acima'
              ) : session.phase === 'ready' && paymentReady ? (
                <><Lock aria-hidden className="h-4 w-4 shrink-0" strokeWidth={2} /> {paymentMethod === 'multibanco' ? 'Gerar referência' : 'Confirmar e pagar'} · {formatPrice(money(total))}</>
              ) : (
                <><LoaderCircle aria-hidden className="h-4 w-4 animate-spin" /> {t('checkout.paymentInitializing')}</>
              )}
            </button>
            <p className="mt-3 flex items-start justify-center gap-2 text-sm leading-5 text-muted-foreground">
              <ShieldCheck aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-olive" strokeWidth={1.5} />
              {t('checkout.payNote')}
            </p>
            <div className="mt-5 border-t border-[#dedbd3] pt-4">
              <p className="text-sm font-semibold">Alguma dúvida antes de concluir?</p>
              <div className="mt-1 flex flex-wrap gap-x-5">
                <Link href={panelOfferPath(offerSlug, '/informacao/contacto')} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded text-sm text-[#344731] underline underline-offset-4 focus-visible:outline-2"><MessageCircle aria-hidden className="h-4 w-4" /> Falar com o apoio<span className="sr-only"> (abre num novo separador)</span></Link>
                <Link href={panelOfferPath(offerSlug, '/informacao/trocas-e-devolucoes')} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded text-sm text-[#344731] underline underline-offset-4 focus-visible:outline-2"><RotateCcw aria-hidden className="h-4 w-4" /> Trocas e devoluções<span className="sr-only"> (abre num novo separador)</span></Link>
              </div>
            </div>
          </section>
          <section aria-labelledby="co-questions" className="px-1">
            <h2 id="co-questions" className="mb-2 text-base font-semibold">Antes de finalizar</h2>
            <details className="group border-b border-[#dedbd3] py-1">
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium [&::-webkit-details-marker]:hidden">Posso alterar a cor, a medida ou a quantidade?<ChevronDown aria-hidden className="h-4 w-4 shrink-0 group-open:rotate-180" /></summary>
              <p className="pb-4 text-sm leading-6 text-[#626057]">Sim. Use <Link href={offerPath + '?carrinho=aberto'} className="font-medium underline underline-offset-4">Editar carrinho</Link> para rever a sua escolha antes de pagar.</p>
            </details>
            <details className="group border-b border-[#dedbd3] py-1">
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium [&::-webkit-details-marker]:hidden">E se precisar de ajuda com a encomenda?<ChevronDown aria-hidden className="h-4 w-4 shrink-0 group-open:rotate-180" /></summary>
              <p className="pb-4 text-sm leading-6 text-[#626057]">Contacte o apoio ao cliente indicando o número da encomenda. Para trocas, devoluções ou artigos danificados, consulte as condições e os procedimentos na nossa política.</p>
            </details>
          </section>
        </div>

      </form>
    </div>
  );
}

/** Persist (orderNumber, token) so this browser can find the order
 *  later without any email-only lookup. */
function saveOrderReference(orderNumber: string, accessToken: string) {
  try {
    sessionStorage.setItem('ecom-last-order', JSON.stringify({ orderNumber, accessToken }));
    const raw = localStorage.getItem('ecom-orders');
    const list: { orderNumber: string; accessToken: string; createdAt: string }[] = raw ? JSON.parse(raw) : [];
    const next = [
      { orderNumber, accessToken, createdAt: new Date().toISOString() },
      ...list.filter((o) => o.orderNumber !== orderNumber),
    ].slice(0, 20);
    localStorage.setItem('ecom-orders', JSON.stringify(next));
  } catch {
    // storage unavailable — the success URL still carries both values
  }
}
