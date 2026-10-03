'use client';

import { calculatePromoDiscount } from '@/lib/constants';
import { shippingPrice } from '@/lib/shipping';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { StripeElements, StripePaymentElementOptions } from '@stripe/stripe-js';
import { CheckCircle2, ChevronDown, Lock, LoaderCircle, ShieldCheck, ShoppingBag } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
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
  'checkout.title': 'Concluir encomenda',
  'checkout.payNote': 'Os dados de pagamento são tratados de forma segura pelos nossos parceiros.',
  'checkout.each': 'por unidade',
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

function addBusinessDays(start: Date, days: number): Date {
  const result = new Date(start);
  let remaining = days;
  while (remaining > 0) {
    result.setDate(result.getDate() + 1);
    if (result.getDay() !== 0 && result.getDay() !== 6) remaining -= 1;
  }
  return result;
}

function deliveryWindowLabel(): string {
  const start = addBusinessDays(new Date(), 6);
  const end = addBusinessDays(new Date(), 10);
  const month = new Intl.DateTimeFormat('pt-PT', { month: 'long' }).format(end);
  if (new Intl.DateTimeFormat('pt-PT', { month: 'long' }).format(start) === month) return `Entrega prevista entre ${start.getDate()} e ${end.getDate()} de ${month}`;
  const fmt = (date: Date) => new Intl.DateTimeFormat('pt-PT', { day: 'numeric', month: 'long' }).format(date);
  return `Entrega prevista entre ${fmt(start)} e ${fmt(end)}`;
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
const CHECKOUT_CARD_CLASS = 'rounded-[24px] border border-[#e4e4e7] bg-white shadow-[0_1px_3px_rgba(24,24,27,.12)]';
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
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setForm((current) => ({ ...current, ...saved, country: PANEL_CHECKOUT_COUNTRY }));
      }
    } catch {
      // A blocked or malformed local draft must never prevent checkout.
    }
    setTrackingParameters(offerTrackingParameters(offerSlug));
    setDraftHydrated(true);
    setMounted(true);
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
    const timer = window.setTimeout(() => setShippingReadyKey(shippingAddressKey), 350);
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
          aria-describedby={fieldErrors[name] ? `co-${name}-error` : undefined}
          onBlur={(event) => {
            validateField(name, event.currentTarget);
            props.onBlur?.(event);
          }}
        />
      </div>
      {fieldErrors[name] && <p id={`co-${name}-error`} className="mt-1 text-sm text-[#a32924]" aria-live="polite">{fieldErrors[name]}</p>}
    </div>
  );

  const payDisabled =
    paySubmitting ||
    session.phase !== 'ready' || !paymentReady;

  return (
    <div className="mx-auto w-full max-w-[1180px] px-4 py-5 font-sans text-[#18181b] sm:px-6 sm:py-7 lg:py-9">
      <div className="mx-auto w-full max-w-[760px]">
        <h1 className="text-[28px] font-semibold leading-tight sm:text-[30px]">{t('checkout.title')}</h1>
        <p className="mt-1.5 text-[15px] leading-6 text-[#70707a]">Confirme os seus dados e conclua a encomenda em segurança.</p>
      </div>

      <form onSubmit={onPay} noValidate className="mx-auto mt-5 grid w-full max-w-[760px] items-start gap-4">
        {/* Order summary stays above the form and can be collapsed. */}
        <aside aria-label={t('checkout.summary')} >
          <details open className={`${CHECKOUT_CARD_CLASS} group overflow-hidden`}>
            <summary className="cursor-pointer list-none px-4 py-4 [&::-webkit-details-marker]:hidden sm:px-5">
              <span className="flex items-center justify-between gap-3">
                <span className="text-[15px] font-semibold leading-5">Resumo da encomenda</span>
                <span className="flex shrink-0 items-center gap-3">
                  <strong className="text-[18px] font-semibold leading-tight">{formatPrice(money(total))}</strong>
                  <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
                </span>
              </span>
              {displayLines[0] && (
                <span className="mt-2 flex min-w-0 items-center text-[12px] leading-5 text-[#5c5049] group-open:hidden">
                  <span className="min-w-0 overflow-hidden whitespace-nowrap text-clip">{checkoutLineLabel(displayLines[0])}</span>
                  <span className="shrink-0 pl-0.5 font-medium text-olive underline underline-offset-2">… Ver mais</span>
                </span>
              )}
            </summary>
            <div className="border-t border-[#e2e2e5] px-4 pb-4 pt-3 sm:px-5">
            <ul className="mt-3 max-h-64 space-y-3 overflow-y-auto thin-scrollbar pr-1">
              {displayLines.map((l) => (
                <li key={`${l.slug}-${l.variantId ?? ''}`} className="flex gap-3">
                  <div className="relative h-14 w-14 shrink-0">
                    <div className="absolute inset-0 overflow-hidden rounded-lg border border-[#dedfe3]">
                      <Image src={nuraltaCartImage(l.slug, l.image)} alt={l.name} fill sizes="56px" className="object-cover" />
                    </div>
                    <span className="absolute right-1 top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-ink/90 px-1 text-[10.5px] font-medium text-cream shadow-sm">
                      {l.quantity}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-[14px] font-medium leading-5 text-[#18181b]">{checkoutLineLabel(l)}</p>
                  </div>
                  <p className="shrink-0 text-[14px] font-medium tabular-nums">{formatPrice(toNumber(l.price) * l.quantity)}</p>
                </li>
              ))}
            </ul>
            <Separator className="my-4" />
            <dl className="space-y-2.5 text-[14px]">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{t('cart.subtotal')}</dt>
                <dd className="font-medium">{formatPrice(subtotal)}</dd>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-olive">
                  <dt>{t('cart.discount')} ({cart.promoCode})</dt>
                  <dd>−{formatPrice(discount)}</dd>
                </div>
              )}
              <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Entrega</dt>
                  <dd className="text-right font-medium">A calcular após preencher a morada</dd>
                </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{t('checkout.vat')}</dt>
                <dd className="text-muted-foreground">{t('checkout.vatIncludedNote')}</dd>
              </div>
              <Separator />
              <div className="flex justify-between text-[17px]">
                <dt className="font-semibold">{t('checkout.total')}</dt>
                <dd className="font-semibold">{formatPrice(money(total))}</dd>
              </div>
            </dl>
            {shippingQuoteStatus === 'ready' && <p className="mt-3 text-sm leading-5 text-[#5c5049]">Portugal · {deliveryWindowLabel()}</p>}
            </div>
          </details>
        </aside>
        {/* Delivery and payment follow the summary in reading order. */}
        <div className="space-y-4">
          <section ref={deliverySectionRef} aria-labelledby="co-delivery-title" className={`${CHECKOUT_CARD_CLASS} p-4 sm:p-5`}>
            <div className="flex items-start gap-3">
              <span aria-hidden="true" className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-black text-[12px] font-bold text-white">1</span>
              <div className="min-w-0">
                <h2 id="co-delivery-title" className="text-[16px] font-bold leading-[24px]">Dados de entrega</h2>
              </div>
            </div>
            <p className="mt-2 text-sm leading-5 text-[#5c5049]">Todos os campos são obrigatórios, exceto o complemento da morada.</p>
            <div className="mt-4 grid grid-cols-1 gap-x-3 gap-y-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
              {field('firstName', 'Nome completo', { autoComplete: 'name', placeholder: 'O seu nome' })}
              {field('email', 'E-mail', {
                type: 'email',
                autoComplete: 'email',
                placeholder: 'o.seu.email@exemplo.com',
              })}
              {field('address', t('checkout.address'), { autoComplete: 'address-line1', placeholder: 'Rua e número' })}
              <details open={Boolean(form.address2) || undefined} className="sm:col-span-2">
                <summary className="flex min-h-11 cursor-pointer items-center text-sm font-medium underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2">Adicionar andar, porta ou complemento (opcional)</summary>
                {field('address2', 'Complemento da morada (opcional)', { autoComplete: 'address-line2', placeholder: 'Andar, porta ou ponto de referência', required: false })}
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
              {shippingQuoteStatus === 'loading' && (
                <div role="status" className="mt-2 flex min-h-10 items-center gap-2 rounded-xl border border-[#dedfe3] bg-[#fbfbfc] px-3 py-3 text-sm text-[#5c5049] sm:col-span-2">
                  <LoaderCircle aria-hidden className="h-4 w-4 shrink-0 animate-spin" />
                  A calcular entrega para Portugal…
                </div>
              )}
              {shippingQuoteStatus === 'ready' && <div role="status" className="mt-2 flex min-h-10 flex-wrap items-center gap-2 rounded-xl border border-[#dedfe3] bg-[#fbfbfc] px-3 py-3 text-sm text-[#5c5049] sm:col-span-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-[#65755a]" aria-hidden />
                <span className="font-medium">{shipping === 0 ? 'Entrega grátis por' : 'Entrega por'}</span>
                <Image src="/pt/images/logo-ctt-express.svg" alt="CTT Express" width={82} height={27} className="h-auto w-[76px]" />
                {shipping > 0 && <span className="font-medium">· {formatPrice(shipping)}</span>}
                <span className="basis-full">{deliveryWindowLabel()}</span>
              </div>}
            </div>
          </section>

          {/* Payment — real Stripe Elements flow */}
          <section aria-labelledby="co-payment" className={`${CHECKOUT_CARD_CLASS} p-4 sm:p-5`}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="co-payment" className="flex items-center gap-3 text-[16px] font-bold leading-[24px]">
                <span aria-hidden="true" className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-black text-[12px] font-bold text-white">2</span>
                Pagamento
              </h2>
              <span className="text-sm text-muted-foreground">{t('checkout.secureTitle')}</span>
            </div>
            <p className="mt-1 pl-10 text-sm leading-5 text-[#62626b]">
              {t('checkout.secureDesc')}
            </p>

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
                <h3 className="mt-5 text-[16px] font-semibold">Como prefere pagar?</h3>
                <p className="mt-1 text-sm leading-5 text-muted-foreground">
                  Selecione uma opção para ver os campos e as instruções de pagamento.
                </p>
                <PaymentElement
                  elements={session.elements}
                  options={PAYMENT_ELEMENT_OPTIONS}
                  className="mt-3"
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

            <p id="co-payment-help" className="mt-4 text-sm leading-6 text-[#5c5049]" aria-live="polite">{paymentHelp}</p>
            {paymentError && (
              <div id="co-payment-error" ref={paymentErrorRef} tabIndex={-1} role="alert" className="mt-4 rounded-xl border border-[#a32924] bg-[#fff6f5] p-4 text-sm leading-6 text-[#a32924] focus:outline-2 focus:outline-offset-2">
                <p className="font-semibold">Não foi possível concluir o pagamento</p>
                <p>{paymentError}</p>
                <p className="mt-1">Os seus dados de entrega foram mantidos.</p>
              </div>
            )}
            <button
              type="submit"
              disabled={payDisabled}
              aria-describedby={paymentError ? 'co-payment-error co-payment-help' : 'co-payment-help'}
              aria-busy={paySubmitting || session.phase === 'confirming'}
              className="mt-5 flex min-h-[50px] w-full items-center justify-center gap-2 rounded-[16px] bg-[#201a17] px-4 py-3 text-[16px] font-semibold text-white transition-colors hover:bg-[#352d28] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#201a17] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {paySubmitting || session.phase === 'confirming' ? (
                <><LoaderCircle aria-hidden className="h-4 w-4 animate-spin" /> {t('checkout.processing')}</>
              ) : session.phase === 'error' || session.phase === 'unavailable' || paymentLoadFailed ? (
                'Pagamento indisponível — tente novamente acima'
              ) : session.phase === 'ready' && paymentReady ? (
                <><Lock aria-hidden className="h-4 w-4 shrink-0" strokeWidth={2} /> {paymentMethod === 'multibanco' ? 'Gerar referência' : 'Pagar'} · {formatPrice(money(total))}</>
              ) : (
                <><LoaderCircle aria-hidden className="h-4 w-4 animate-spin" /> {t('checkout.paymentInitializing')}</>
              )}
            </button>
            <p className="mt-3 flex items-start justify-center gap-2 text-sm leading-5 text-muted-foreground">
              <ShieldCheck aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-olive" strokeWidth={1.5} />
              {t('checkout.payNote')}
            </p>
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
