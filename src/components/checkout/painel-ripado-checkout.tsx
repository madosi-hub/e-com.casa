'use client';

import { calculatePromoDiscount } from '@/lib/constants';
import { shippingPrice } from '@/lib/shipping';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, ChevronDown, Lock, LoaderCircle, Search, ShieldCheck, ShoppingBag } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
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
  PROMO_CODES,
} from '@/lib/constants';

const OFFER_COPY: Record<string, string> = {
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
const CHECKOUT_DRAFT_KEY = 'ecom-painel-ripado-checkout-draft';
const CHECKOUT_CARD_CLASS = 'rounded-[24px] border border-[#e4e4e7] bg-white shadow-[0_1px_3px_rgba(24,24,27,.12)]';
const CHECKOUT_LABEL_CLASS = 'text-[12px] font-normal leading-[16px] text-[#27272a]';
const CHECKOUT_FIELD_CLASS = 'mt-2 h-[50px] rounded-[16px] border-[#e4e4e7] bg-[#fafafa] px-4 text-[16px] font-normal leading-[24px] text-[#27272a] shadow-none placeholder:text-[#a1a1aa] focus-visible:border-[#777781] focus-visible:ring-[#777781]/15 md:text-[16px]';

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
    country: 'PT',
  });
  const [shippingQuote, setShippingQuote] = useState<{ key: string; status: 'loading' | 'ready' } | null>(null);
  const shippingQuoteTimer = useRef<number | null>(null);

  useEffect(() => () => {
    if (shippingQuoteTimer.current !== null) window.clearTimeout(shippingQuoteTimer.current);
  }, []);

  // Restore the offer checkout draft after hydration.
  useEffect(() => {
    document.documentElement.lang = 'pt-PT';
    try {
      const raw = window.localStorage.getItem(CHECKOUT_DRAFT_KEY);
      if (raw) {
        const { marketingOptIn: _legacyMarketingOptIn, termsAccepted: _legacyTermsAccepted, ...saved } = JSON.parse(raw) as Partial<typeof form> & { marketingOptIn?: boolean; termsAccepted?: boolean };
        // Draft restoration is a one-time client hydration step from localStorage.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setForm((current) => ({ ...current, ...saved }));
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

  const set = (key: keyof typeof form, value: string) => setForm((f) => ({ ...f, [key]: value }));
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
  // The draft can prepare payment before contact and delivery are filled in.
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
          email: '',
          firstName: '',
          lastName: '',
          address: '',
          address2: null,
          city: '',
          postalCode: '',
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
      phone: null,
      notes: null,
      marketingConsent: false,
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
    <div className={half ? 'col-span-1 min-w-0' : 'col-span-2 min-w-0'}>
      <Label htmlFor={`co-${name}`} className={CHECKOUT_LABEL_CLASS}>
        {label}
      </Label>
      <div className="relative">
        <Input
          id={`co-${name}`}
          required={props.required !== false}
          value={String(form[name] ?? '')}
          onChange={(e) => set(name, e.target.value)}
          className={`${CHECKOUT_FIELD_CLASS}${name === 'address' ? ' pr-10' : ''}`}
          {...props}
        />
        {name === 'address' && <Search aria-hidden="true" className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a1a1aa]" strokeWidth={1.5} />}
      </div>
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
    <div className="mx-auto w-full max-w-[1180px] px-4 py-5 font-sans text-[#18181b] sm:px-6 sm:py-7 lg:py-9">
      <div className="mx-auto w-full max-w-[760px]">
        <h1 className="text-[28px] font-semibold leading-tight sm:text-[30px]">{t('checkout.title')}</h1>
        <p className="mt-1.5 text-[15px] leading-6 text-[#70707a]">Confirme os seus dados e conclua a encomenda em segurança.</p>
      </div>

      <form onSubmit={onPay} className="mx-auto mt-5 grid w-full max-w-[760px] items-start gap-4">
        {/* Left: details */}
          {/* Shipping address */}
        <div className="order-2 space-y-4">
          <section aria-labelledby="co-delivery-title" className={`${CHECKOUT_CARD_CLASS} p-4 sm:p-5`}>
            <div className="flex items-start gap-3">
              <span aria-hidden="true" className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-black text-[12px] font-bold text-white">1</span>
              <div className="min-w-0">
                <h2 id="co-delivery-title" className="text-[16px] font-bold leading-[24px]">Dados de entrega</h2>
              </div>
            </div>
            <div className="mt-1 grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-x-2 gap-y-2.5">
              {field('firstName', 'Nome completo', { autoComplete: 'name', placeholder: 'O seu nome' })}
              {field('email', 'E-mail', {
                type: 'email',
                autoComplete: 'email',
                placeholder: 'o.seu.email@exemplo.com',
              })}
              {field('address', t('checkout.address'), { autoComplete: 'address-line1', placeholder: 'Rua e número' })}
              {field('address2', 'Complemento da morada (opcional)', { autoComplete: 'address-line2', placeholder: 'Andar, porta ou ponto de referência', required: false })}
              {field('city', t('checkout.city'), { autoComplete: 'address-level2', placeholder: 'Lisboa' }, true)}
              <div className="col-span-1 min-w-0">
                <Label htmlFor="co-postalCode" className={CHECKOUT_LABEL_CLASS}>{t('checkout.postal')}</Label>
                <Input
                  id="co-postalCode"
                  required
                  autoComplete="postal-code"
                  placeholder="1000-001"
                  value={form.postalCode}
                  onChange={(event) => set('postalCode', event.target.value)}
                  onBlur={loadShippingQuote}
                  className={CHECKOUT_FIELD_CLASS}
                />
              </div>
                {shippingQuoteStatus === 'loading' && (
                  <div role="status" aria-live="polite" className="col-span-2 mt-2 flex min-h-10 items-center gap-2 rounded-xl border border-[#dedfe3] bg-[#fbfbfc] px-3 text-[12px] text-[#70707a]">
                    <LoaderCircle className="h-4 w-4 shrink-0 animate-spin text-olive" aria-hidden />
                    A calcular entrega para Portugal…
                  </div>
                )}
                {shippingQuoteStatus === 'ready' && (
                  <div role="status" aria-live="polite" className="col-span-2 mt-2 flex min-h-10 flex-wrap items-center gap-2 rounded-xl border border-[#dedfe3] bg-[#fbfbfc] px-3 py-2 text-[12px] text-[#5c5049]">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-[#65755a]" aria-hidden />
                    <span className="font-medium">{shipping === 0 ? 'Entrega grátis por' : 'Entrega por'}</span>
                    <Image src="/pt/images/logo-ctt-express.svg" alt="CTT Express" width={82} height={27} className="h-auto w-[76px]" />
                    {shipping > 0 && <span className="font-medium">· {formatPrice(shipping)}</span>}
                  </div>
                )}
            </div>
          </section>

          {/* Payment — real Stripe Elements flow */}
          <section aria-labelledby="co-payment" className={`${CHECKOUT_CARD_CLASS} p-4 sm:p-5`}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="co-payment" className="flex items-center gap-3 text-[16px] font-bold leading-[24px]">
                <span aria-hidden="true" className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-black text-[12px] font-bold text-white">2</span>
                Pagamento
              </h2>
              <span className="text-[12px] text-muted-foreground">{t('checkout.secureTitle')}</span>
            </div>
            <p className="mt-1 pl-10 text-[12px] font-normal leading-[16px] text-[#71717a]">
              {t('checkout.secureDesc')}
            </p>

            {detailsValid && session.phase === 'unavailable' && (
              <div className="mt-4 rounded-xl border border-terracotta/30 bg-terracotta/5 px-4 py-3">
                <p className="text-[12.5px] leading-relaxed text-muted-foreground">{t('checkout.paymentUnavailable')}</p>
              </div>
            )}

            {detailsValid && session.phase === 'error' && (
              <div className="mt-4 rounded-xl border border-terracotta/30 bg-terracotta/5 px-4 py-3">
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
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-[#dedfe3] bg-[#fbfbfc] px-4 py-4 text-[13px] text-[#70707a]">
                <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={2} />
                {t('checkout.paymentInitializing')}
              </div>
            )}

            {session.elements && (
              <>
                <ExpressCheckout
                  stripe={session.stripe}
                  elements={session.elements}
                  className="mt-5"
                  onBeforeConfirm={async () => {
                    if (!detailsValid || !payload) throw new Error('Preencha os dados de entrega para continuar.');
                    const synced = await session.syncOrder({
                      ...payload,
                      email: form.email.trim(),
                      firstName: form.firstName.trim(),
                      lastName: form.firstName.trim(),
                      address: form.address.trim(),
                      address2: form.address2.trim() || null,
                      city: form.city.trim(),
                      postalCode: form.postalCode.trim(),
                    });
                    if (!synced.ok) throw new Error(synced.errorMessage ?? 'Não foi possível atualizar a encomenda.');
                  }}
                  onConfirm={async () => {
                    const result = await session.confirmPayment();
                    if (!result.ok) throw new Error(result.errorMessage ?? t('checkout.errorPayment'));
                  }}
                />
                <PaymentElement
                  elements={session.elements}
                  className="mt-5"
                  ariaLabel="Dados de pagamento seguros"
                  loadingLabel="A carregar o pagamento seguro…"
                />
              </>
            )}

            <button
              type="submit"
              disabled={payDisabled}
              className="mt-5 flex min-h-[50px] w-full items-center justify-center gap-2 rounded-[16px] bg-[#201a17] px-4 py-3 text-[14px] font-medium text-white transition-colors hover:bg-[#352d28] disabled:cursor-not-allowed disabled:opacity-60"
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
          <details className={`${CHECKOUT_CARD_CLASS} overflow-hidden`}>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-4 [&::-webkit-details-marker]:hidden sm:px-5">
              <span className="min-w-0">
                <span className="block text-[15px] font-semibold leading-5">Resumo da encomenda</span>
                <span className="mt-1 inline-flex rounded-full bg-[#f2f2f4] px-2.5 py-1 text-[11px] font-normal leading-none text-[#666670]">
                  {displayLines.reduce((sum, line) => sum + line.quantity, 0)} {displayLines.reduce((sum, line) => sum + line.quantity, 0) === 1 ? 'artigo' : 'artigos'}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-3">
                <span className="text-right"><span className="block text-[10px] font-normal uppercase tracking-[.05em] text-[#8a8a94]">Total</span><strong className="block text-[20px] font-semibold leading-tight">{formatPrice(money(total))}</strong></span>
                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform [details[open]_summary_&]:rotate-180" />
              </span>
            </summary>
            <div className="border-t border-[#e2e2e5] px-4 pb-4 pt-3 sm:px-5">
            <ul className="mt-3 max-h-64 space-y-3 overflow-y-auto thin-scrollbar pr-1">
              {displayLines.map((l) => (
                <li key={l.slug} className="flex gap-3">
                  <div className="relative h-14 w-14 shrink-0">
                    <div className="absolute inset-0 overflow-hidden rounded-lg border border-[#dedfe3]">
                      <Image src={nuraltaCartImage(l.slug, l.image)} alt={l.name} fill sizes="56px" className="object-cover" />
                    </div>
                    <span className="absolute right-1 top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-ink/90 px-1 text-[10.5px] font-medium text-cream shadow-sm">
                      {l.quantity}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-[14px] font-medium leading-5 text-[#18181b]">{l.name}</p>
                    <p className="text-[12px] text-muted-foreground">{formatPrice(l.price)} {t('checkout.each')}</p>
                  </div>
                  <p className="text-[13px] font-medium">{formatPrice(toNumber(l.price) * l.quantity)}</p>
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
