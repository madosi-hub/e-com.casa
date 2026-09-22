'use client';

import { calculatePromoDiscount } from '@/lib/constants';
import { shippingPrice } from '@/lib/shipping';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, ChevronDown, Lock, LoaderCircle, ShieldCheck, ShoppingBag } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { useCart } from '@/lib/cart-store';
import { nuraltaCartImage } from '@/lib/catalog/nuralta-media';
import { getOfferAttribution } from '@/lib/offers/attribution';
import { NURALTA_OFFER_ALIAS, panelOfferPath, type PanelOfferSlug } from '@/lib/offers/route-policy';
import { translate } from '@/lib/i18n';
import { usePaymentSession } from '@/hooks/use-payment-session';
import { formatPrice, toNumber, money } from '@/lib/format';
import { PaymentElement } from '@/components/payments/payment-element';
import { ExpressCheckout } from '@/components/payments/express-checkout';
import {
  COUNTRIES,
  PROMO_CODES,
} from '@/lib/constants';

const OFFER_COPY: Record<string, string> = {
  'checkout.marketing': 'Quero receber ofertas e ideias para a casa por email. Consulte a nossa',
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
const regionNames = new Intl.DisplayNames(['pt-PT'], { type: 'region' });
const CHECKOUT_DRAFT_KEY = 'ecom-painel-ripado-checkout-draft';

export default function CheckoutPage({ offerSlug = NURALTA_OFFER_ALIAS }: { offerSlug?: PanelOfferSlug }) {
  const router = useRouter();
  const offerPath = panelOfferPath(offerSlug);
  const checkoutPath = panelOfferPath(offerSlug, '/checkout');
  const informationPath = (slug: string) => panelOfferPath(offerSlug, `/informacao/${slug}`);
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
    country: 'PT',
    phone: '',
    marketingOptIn: false,
    termsAccepted: false,
  });
  const [shippingQuote, setShippingQuote] = useState<{ key: string; status: 'loading' | 'ready' } | null>(null);
  const shippingQuoteTimer = useRef<number | null>(null);

  useEffect(() => () => {
    if (shippingQuoteTimer.current !== null) window.clearTimeout(shippingQuoteTimer.current);
  }, []);

  // Restore the offer checkout draft after hydration. Legal consent is never
  // carried over from an abandoned checkout.
  useEffect(() => {
    document.documentElement.lang = 'pt-PT';
    try {
      const raw = window.localStorage.getItem(CHECKOUT_DRAFT_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<typeof form>;
        // Draft restoration is a one-time client hydration step from localStorage.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setForm((current) => ({
          ...current,
          ...saved,
          marketingOptIn: false,
          termsAccepted: false,
        }));
      }
    } catch {
      // A blocked or malformed local draft must never prevent checkout.
    }
    const attribution = getOfferAttribution();
    const params = new URLSearchParams(window.location.search);
    setTrackingParameters({
      src: params.get('src') ?? attribution?.utm_source ?? null,
      sck: params.get('sck') ?? null,
      utm_source: params.get('utm_source') ?? attribution?.utm_source ?? null,
      utm_medium: params.get('utm_medium') ?? attribution?.utm_medium ?? null,
      utm_campaign: params.get('utm_campaign') ?? attribution?.utm_campaign ?? null,
      utm_content: params.get('utm_content') ?? attribution?.utm_content ?? null,
      utm_term: params.get('utm_term') ?? attribution?.utm_term ?? null,
    });
    setDraftHydrated(true);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!draftHydrated) return;
    try {
      const { marketingOptIn: _marketingOptIn, termsAccepted: _termsAccepted, ...draft } = form;
      window.localStorage.setItem(CHECKOUT_DRAFT_KEY, JSON.stringify(draft));
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

  const set = (key: keyof typeof form, value: string | boolean) => setForm((f) => ({ ...f, [key]: value }));
  const deliveryAddressComplete =
    form.address.trim().length > 0 &&
    form.city.trim().length > 0 &&
    form.postalCode.trim().length >= 4;
  const shippingAddressKey = [form.country, form.address, form.city, form.postalCode]
    .map((value) => value.trim().toLowerCase())
    .join('|');
  const shippingQuoteStatus = shippingQuote?.key === shippingAddressKey ? shippingQuote.status : 'idle';

  const loadShippingQuote = () => {
    if (!deliveryAddressComplete) return;
    if (shippingQuote?.key === shippingAddressKey) return;
    if (shippingQuoteTimer.current !== null) window.clearTimeout(shippingQuoteTimer.current);
    const key = shippingAddressKey;
    setShippingQuote({ key, status: 'loading' });
    shippingQuoteTimer.current = window.setTimeout(() => {
      setShippingQuote({ key, status: 'ready' });
      shippingQuoteTimer.current = null;
    }, 900);
  };

  // Real payment session
  // Contact + delivery must be complete before an order/intent is created.
  const detailsValid =
    form.email.includes('@') &&
    form.firstName.trim().length > 0 &&
    form.address.trim().length > 0 &&
    form.city.trim().length > 0 &&
    form.postalCode.trim().length > 0;

  const payload = useMemo(
    () => cart.lines.length > 0
      ? {
          // Keep the Stripe Elements session stable while contact fields are typed.
          email: 'checkout@e-com.casa',
          firstName: 'A preencher',
          lastName: 'A preencher',
          address: 'A preencher',
          address2: null,
          city: 'A preencher',
          postalCode: '0000-000',
          country: form.country,
          phone: null,
          shippingMethod: 'standard' as const,
          promoCode: cart.promoCode,
          giftWrap: false,
          notes: null,
          marketingConsent: false,
          items: cart.lines.map((l) => ({ slug: l.slug, quantity: l.quantity, variantId: l.variantId ?? null })),
          trackingParameters,
        }
      : null,
    [
      cart.lines,
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
  });

  const onPay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.termsAccepted) {
      toast({ title: t('checkout.toastTerms'), variant: 'destructive' });
      return;
    }
    if (cart.lines.length === 0) {
      toast({ title: t('checkout.toastEmpty'), variant: 'destructive' });
      return;
    }
    if (!detailsValid) {
      toast({ title: t('checkout.completeDetails'), variant: 'destructive' });
      return;
    }
    if (session.phase !== 'ready') return;

    const synced = await session.syncOrder({
      ...payload!,
      email: form.email.trim(),
      firstName: form.firstName.trim(),
      lastName: form.firstName.trim(),
      address: form.address.trim(),
      address2: form.address2.trim() || null,
      city: form.city.trim(),
      postalCode: form.postalCode.trim(),
      phone: form.phone.trim() || null,
      notes: null,
      marketingConsent: form.marketingOptIn,
    });
    if (!synced.ok) {
      toast({ title: t('checkout.errorPaymentTitle'), description: synced.errorMessage, variant: 'destructive' });
      return;
    }

    const result = await session.confirmPayment();
    if (!result.ok) {
      const message =
        result.errorCode === 'PAYMENT_CANCELLED'
          ? t('checkout.errorCancelled')
          : t('checkout.errorPayment');
      toast({ title: t('checkout.errorPaymentTitle'), description: message, variant: 'destructive' });
    }
    // On success confirmPayment either redirects (3DS / async methods)
    // or calls onComplete → success page (server-verified).
  };

  if (mounted && cart.lines.length === 0) {
    return (
      <div className="container-ecom flex min-h-[55vh] flex-col items-center justify-center py-16 text-center">
        <ShoppingBag className="h-10 w-10 text-muted-foreground" strokeWidth={1.25} />
        <h1 className="font-display mt-5 text-[26px] font-medium">{t('checkout.emptyTitle')}</h1>
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
    <div className={half ? 'sm:col-span-1' : 'sm:col-span-2'}>
      <Label htmlFor={`co-${name}`} className="text-[12.5px] font-medium">
        {label}
      </Label>
      <Input
        id={`co-${name}`}
        required={props.required !== false}
        value={String(form[name] ?? '')}
        onChange={(e) => set(name, e.target.value)}
        className="mt-1.5 h-10 rounded-md bg-white"
        {...props}
      />
    </div>
  );

  const payDisabled =
    !detailsValid ||
    session.phase === 'preparing' ||
    session.phase === 'confirming' ||
    session.phase === 'unavailable' ||
    session.phase === 'error' ||
    (detailsValid && session.phase === 'idle');

  return (
    <div className="mx-auto w-full max-w-[1180px] px-4 py-5 sm:px-6 sm:py-7 lg:py-9">
      <div>
        <h1 className="font-display text-[26px] font-medium tracking-tight sm:text-[30px]">{t('checkout.title')}</h1>
        <p className="mt-1 text-[12.5px] text-muted-foreground">Confirme os seus dados e conclua a encomenda em segurança.</p>
      </div>

      <form onSubmit={onPay} className="mx-auto mt-5 grid w-full max-w-[760px] items-start gap-4">
        {/* Left: details */}
          {/* Shipping address */}
        <div className="order-2 space-y-4">
          <section aria-labelledby="co-address" className="rounded-2xl border border-border bg-card p-4 shadow-[0_2px_8px_rgba(32,26,23,.05)] sm:p-5">
            <h2 id="co-address" className="flex items-center gap-3 font-display text-[18px] font-medium">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#17120f] text-[11px] font-sans font-bold text-white">1</span>
              Dados de entrega
            </h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {field('firstName', 'Nome completo', { autoComplete: 'name', placeholder: 'O seu nome' })}
              {field('email', t('checkout.email'), { type: 'email', autoComplete: 'email', placeholder: 'o.seu.email@exemplo.com' })}
              {field('address', t('checkout.address'), { autoComplete: 'address-line1' })}
              {field('address2', t('checkout.address2'), { autoComplete: 'address-line2', required: false })}
              <div>
                <Label htmlFor="co-country" className="text-[12.5px] font-medium">{t('checkout.country')}</Label>
                <Select value={form.country} onValueChange={(v) => set('country', v)}>
                  <SelectTrigger id="co-country" className="mt-1.5 h-10 w-full rounded-md bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {regionNames.of(c.code) ?? c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {field('city', t('checkout.city'), { autoComplete: 'address-level2' }, true)}
              <div className="sm:col-span-1">
                <Label htmlFor="co-postalCode" className="text-[12.5px] font-medium">{t('checkout.postal')}</Label>
                <Input
                  id="co-postalCode"
                  required
                  autoComplete="postal-code"
                  value={form.postalCode}
                  onChange={(event) => set('postalCode', event.target.value)}
                  onBlur={loadShippingQuote}
                  className="mt-1.5 h-10 rounded-md bg-white"
                />
                {shippingQuoteStatus === 'loading' && (
                  <div role="status" aria-live="polite" className="mt-2 flex min-h-10 items-center gap-2 rounded-md border border-border/70 bg-background/60 px-3 text-[11.5px] text-muted-foreground">
                    <LoaderCircle className="h-4 w-4 shrink-0 animate-spin text-olive" aria-hidden />
                    A calcular entrega para {regionNames.of(form.country) ?? form.country}…
                  </div>
                )}
                {shippingQuoteStatus === 'ready' && (
                  <div role="status" aria-live="polite" className="mt-2 flex min-h-10 flex-wrap items-center gap-2 rounded-md border border-[#ded5cb] bg-[#faf8f5] px-3 py-2 text-[11.5px] text-[#5c5049]">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-[#65755a]" aria-hidden />
                    <span className="font-semibold">{shipping === 0 ? 'Entrega grátis por' : 'Entrega por'}</span>
                    <Image src="/pt/images/logo-ctt-express.svg" alt="CTT Express" width={82} height={27} className="h-auto w-[76px]" />
                    {shipping > 0 && <span className="font-semibold">· {formatPrice(shipping)}</span>}
                  </div>
                )}
              </div>
              {field('phone', t('checkout.phone'), { type: 'tel', autoComplete: 'tel', required: false }, true)}
            </div>
            <div className="mt-3 flex items-start gap-2.5">
              <Checkbox id="co-marketing" checked={form.marketingOptIn} onCheckedChange={(v) => set('marketingOptIn', v === true)} className="mt-0.5" />
              <Label htmlFor="co-marketing" className="block min-w-0 text-[12.5px] font-normal leading-relaxed text-muted-foreground">
                {t('checkout.marketing')}{' '}
                <Link href={informationPath('privacidade')} className="underline underline-offset-2">{t('checkout.privacyShort')}</Link>.
              </Label>
            </div>
          </section>

          {/* Payment — real Stripe Elements flow */}
          <section aria-labelledby="co-payment" className="rounded-2xl border border-border bg-card p-4 shadow-[0_2px_8px_rgba(32,26,23,.05)] sm:p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="co-payment" className="flex items-center gap-3 font-display text-[18px] font-medium">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#17120f] text-[11px] font-sans font-bold text-white">2</span>
                Pagamento
              </h2>
              <span className="text-[12px] text-muted-foreground">{t('checkout.secureTitle')}</span>
            </div>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted-foreground">
              {t('checkout.secureDesc')}
            </p>

            {!detailsValid && (
              <p className="mt-4 rounded-md border border-border/70 bg-cream/50 px-4 py-3 text-[12.5px] text-muted-foreground">
                {t('checkout.completeDetails')}
              </p>
            )}

            {detailsValid && session.phase === 'unavailable' && (
              <div className="mt-4 rounded-md border border-terracotta/30 bg-terracotta/5 px-4 py-3">
                <p className="text-[12.5px] leading-relaxed text-muted-foreground">{t('checkout.paymentUnavailable')}</p>
              </div>
            )}

            {detailsValid && session.phase === 'error' && (
              <div className="mt-4 rounded-md border border-terracotta/30 bg-terracotta/5 px-4 py-3">
                <p className="text-[12.5px] leading-relaxed text-muted-foreground">
                  {session.errorMessage ?? t('checkout.errorPayment')}
                </p>
                <button
                  type="button"
                  onClick={session.retry}
                  className="mt-2 text-[12.5px] font-semibold text-olive underline underline-offset-2"
                >
                  {t('checkout.paymentRetry')}
                </button>
              </div>
            )}

            {(session.phase === 'preparing' || (session.phase === 'idle' && detailsValid)) && (
              <div className="mt-4 flex items-center gap-2 rounded-md border border-border/70 bg-background/60 px-4 py-4 text-[12.5px] text-muted-foreground">
                <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={2} />
                {t('checkout.paymentInitializing')}
              </div>
            )}

            {session.elements && (
              <>
                {/* Express wallets — official Stripe buttons, shown only
                    when the browser/device/merchant supports them (§25) */}
                <ExpressCheckout
                  stripe={session.stripe}
                  elements={session.elements}
                  onBeforeConfirm={async () => undefined}
                  onConfirm={() => session.confirmPayment().then((r) => { if (!r.ok) toast({ title: t('checkout.errorPaymentTitle'), description: t('checkout.errorPayment'), variant: 'destructive' }); })}
                  className="mt-5"
                />

                {/* Separator */}
                <div className="my-5 flex items-center gap-3" aria-hidden>
                  <span className="h-px flex-1 bg-border" />
                  <span className="text-[11.5px] uppercase tracking-[0.12em] text-muted-foreground">
                    {t('checkout.orPayWith')}
                  </span>
                  <span className="h-px flex-1 bg-border" />
                </div>

                {/* Official Stripe Payment Element — all card + local
                    method UI (incl. MB WAY phone field, Multibanco flow) */}
                <PaymentElement
                  elements={session.elements}
                  ariaLabel="Dados de pagamento seguros"
                  loadingLabel="A carregar o pagamento seguro…"
                />

              </>
            )}

            <div className="mt-5 flex items-start gap-2.5">
              <Checkbox
                id="co-terms"
                checked={form.termsAccepted}
                onCheckedChange={(v) => set('termsAccepted', v === true)}
                className="mt-0.5"
              />
              <Label htmlFor="co-terms" className="block min-w-0 text-[12.5px] font-normal leading-relaxed text-muted-foreground">
                Li e aceito os{' '}
                <Link href={informationPath('termos-e-condicoes')} className="underline underline-offset-2">{t('checkout.termsShort')}</Link> e a{' '}
                <Link href={informationPath('privacidade')} className="underline underline-offset-2">{t('checkout.privacyShort')}</Link>. Confirmo que li o{' '}
                <Link href={informationPath('livre-resolucao')} className="underline underline-offset-2">direito de livre resolução</Link> (14 dias).
              </Label>
            </div>
            <button
              type="submit"
              disabled={payDisabled}
              className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#201a17] text-[14px] font-semibold text-white transition-colors hover:bg-[#352d28] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {session.phase === 'confirming' ? (
                <><LoaderCircle className="h-4 w-4 animate-spin" /> {t('checkout.processing')}</>
              ) : !detailsValid ? (
                <><Lock className="h-4 w-4" strokeWidth={2} /> Preencha os dados para continuar</>
              ) : session.phase === 'ready' ? (
                <><Lock className="h-4 w-4" strokeWidth={2} /> Pagar {formatPrice(money(total))}</>
              ) : session.phase === 'unavailable' ? (
                <><Lock className="h-4 w-4" strokeWidth={2} /> {t('checkout.paymentUnavailableShort')}</>
              ) : (
                <><LoaderCircle className="h-4 w-4 animate-spin" /> {t('checkout.paymentInitializing')}</>
              )}
            </button>
            <p className="mt-3 flex items-center justify-center gap-1.5 text-[11.5px] text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-olive" strokeWidth={1.5} />
              {t('checkout.payNote')}
            </p>
          </section>
        </div>

        {/* Order summary stays above the form and can be collapsed. */}
        <aside aria-label={t('checkout.summary')} className="order-1">
          <details className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_2px_8px_rgba(32,26,23,.07)]">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-4 [&::-webkit-details-marker]:hidden sm:px-5">
              <span className="min-w-0">
                <span className="flex flex-wrap items-center gap-2 text-[13.5px] font-semibold">
                  Resumo da encomenda
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {displayLines.reduce((sum, line) => sum + line.quantity, 0)} {displayLines.reduce((sum, line) => sum + line.quantity, 0) === 1 ? 'artigo' : 'artigos'}
                  </span>
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-3">
                <span className="text-right"><span className="block text-[9px] uppercase tracking-[.12em] text-muted-foreground">Total</span><strong className="block text-[16px]">{formatPrice(money(total))}</strong></span>
                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform [details[open]_summary_&]:rotate-180" />
              </span>
            </summary>
            <div className="border-t border-border px-4 pb-4 pt-3 sm:px-5">
            <ul className="mt-3 max-h-64 space-y-3 overflow-y-auto thin-scrollbar pr-1">
              {displayLines.map((l) => (
                <li key={l.slug} className="flex gap-3">
                  <div className="relative h-14 w-14 shrink-0">
                    <div className="absolute inset-0 overflow-hidden rounded-md border border-border/60">
                      <Image src={nuraltaCartImage(l.slug, l.image)} alt={l.name} fill sizes="56px" className="object-cover" />
                    </div>
                    <span className="absolute right-1 top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-ink/90 px-1 text-[10.5px] font-semibold text-cream shadow-sm">
                      {l.quantity}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-[13px] font-medium">{l.name}</p>
                    <p className="text-[12px] text-muted-foreground">{formatPrice(l.price)} {t('checkout.each')}</p>
                  </div>
                  <p className="text-[13px] font-semibold">{formatPrice(toNumber(l.price) * l.quantity)}</p>
                </li>
              ))}
            </ul>
            <Separator className="my-4" />
            <dl className="space-y-2.5 text-[13.5px]">
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
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Entrega por CTT</dt>
                <dd className="font-medium">{shipping === 0 ? <span className="text-olive">{t('common.free')}</span> : formatPrice(shipping)}</dd>
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
            </div>
          </details>
        </aside>
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
