'use client';

import { calculatePromoDiscount } from '@/lib/constants';
import { shippingPrice, freeShipping as qualifiesForFreeShipping } from '@/lib/shipping';
import { AccessoryUpsell } from '@/components/cart/accessory-upsell';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Gift, Lock, LoaderCircle, ShieldCheck, ShoppingBag } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { useT } from '@/hooks/use-t';
import { useCart } from '@/lib/cart-store';
import { usePaymentSession } from '@/hooks/use-payment-session';
import { formatPrice, toNumber, money } from '@/lib/format';
import { PaymentElement } from '@/components/payments/payment-element';
import { ExpressCheckout } from '@/components/payments/express-checkout';
import { PaymentBrandStrip } from '@/components/payments/payment-brand-strip';
import {
  COUNTRIES,
  FREE_SHIPPING_THRESHOLD,
  SHIPPING_OPTIONS,
  PROMO_CODES,
  GIFT_WRAP_PRICE,
  ORDER_NOTES_MAX,
} from '@/lib/constants';

export default function CheckoutPage() {
  const t = useT();
  const router = useRouter();
  const cart = useCart();
  const [mounted, setMounted] = useState(false);

  const [form, setForm] = useState({
    email: '',
    firstName: '',
    lastName: '',
    address: '',
    address2: '',
    city: '',
    postalCode: '',
    country: 'PT',
    phone: '',
    shippingMethod: 'standard' as 'standard' | 'express',
    giftWrap: false,
    notes: '',
    marketingOptIn: false,
    termsAccepted: false,
  });

  // Deferred so the first client render matches SSR (hydration-safe):
  // cart-derived UI renders in its empty state until after mount.
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(t);
  }, []);

  const displayLines = mounted ? cart.lines : [];
  const subtotal = mounted ? toNumber(cart.subtotal().toFixed(2)) : 0;
  const promo = mounted && cart.promoCode ? PROMO_CODES[cart.promoCode] : null;
  const discount = calculatePromoDiscount(displayLines, promo);
  const option = SHIPPING_OPTIONS.find((o) => o.id === form.shippingMethod) ?? SHIPPING_OPTIONS[0];
  const shipping = shippingPrice(form.country, subtotal - discount, option.id);
  const giftWrapFee = form.giftWrap ? GIFT_WRAP_PRICE : 0;
  const total = Math.max(0, subtotal - discount + shipping + giftWrapFee);

  const set = (key: keyof typeof form, value: string | boolean) => setForm((f) => ({ ...f, [key]: value }));

  // Real payment session
  // Contact + delivery must be complete before an order/intent is created.
  const detailsValid =
    form.email.includes('@') &&
    form.firstName.trim().length > 0 &&
    form.lastName.trim().length > 0 &&
    form.address.trim().length > 0 &&
    form.city.trim().length > 0 &&
    form.postalCode.trim().length > 0;

  const payload = useMemo(
    () =>
      detailsValid && cart.lines.length > 0
        ? {
            email: form.email.trim(),
            firstName: form.firstName.trim(),
            lastName: form.lastName.trim(),
            address: form.address.trim(),
            address2: form.address2.trim() || null,
            city: form.city.trim(),
            postalCode: form.postalCode.trim(),
            country: form.country,
            phone: form.phone.trim() || null,
            shippingMethod: form.shippingMethod,
            promoCode: cart.promoCode,
            giftWrap: form.giftWrap,
            notes: form.notes.trim() || null,
            marketingConsent: form.marketingOptIn,
            items: cart.lines.map((l) => ({ slug: l.slug, quantity: l.quantity, variantId: l.variantId ?? null })),
          }
        : null,
    [
      detailsValid,
      cart.lines,
      cart.promoCode,
      form.email, form.firstName, form.lastName, form.address, form.address2,
      form.city, form.postalCode, form.country, form.phone,
      form.shippingMethod, form.giftWrap, form.notes, form.marketingOptIn,
    ],
  );

  const signature = useMemo(
    () => (payload ? JSON.stringify(payload) : 'invalid'),
    [payload],
  );

  const finishOrder = (orderNumber: string, accessToken: string) => {
    saveOrderReference(orderNumber, accessToken);
    router.push(`/checkout/success?order=${encodeURIComponent(orderNumber)}&token=${encodeURIComponent(accessToken)}`);
  };

  const session = usePaymentSession({ payload, signature, onComplete: finishOrder });

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
    if (session.phase !== 'ready') return;

    const result = await session.confirmPayment();
    if (!result.ok) {
      const message =
        result.errorCode === 'PAYMENT_CANCELLED'
          ? t('checkout.errorCancelled')
          : result.errorMessage || t('checkout.errorPayment');
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
        <Link href="/shop" className="mt-6 inline-flex h-11 items-center rounded-md bg-primary px-7 text-[14px] font-semibold text-primary-foreground">
          {t('checkout.backToShop')}
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
        className="mt-1.5 h-11 rounded-md"
        {...props}
      />
    </div>
  );

  const payDisabled = session.phase !== 'ready' || !form.termsAccepted;

  return (
    <div className="container-ecom py-8 lg:py-12">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-[28px] font-medium tracking-tight sm:text-[32px]">{t('checkout.title')}</h1>
        <span className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
          <Lock className="h-3.5 w-3.5" strokeWidth={1.75} /> {t('checkout.secure')}
        </span>
      </div>

      <form onSubmit={onPay} className="mt-8 grid gap-10 lg:grid-cols-[1fr_380px]">
        {/* Left: details */}
        <div className="space-y-8">
          {/* Contact */}
          <section aria-labelledby="co-contact" className="rounded-lg border border-border bg-card p-6">
            <h2 id="co-contact" className="font-display text-[19px] font-medium">
              {t('checkout.s1')}
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {field('email', t('checkout.email'), { type: 'email', autoComplete: 'email', placeholder: 'you@example.com' })}
            </div>
            <div className="mt-4 flex items-start gap-2.5">
              <Checkbox
                id="co-marketing"
                checked={form.marketingOptIn}
                onCheckedChange={(v) => set('marketingOptIn', v === true)}
                className="mt-0.5"
              />
              <Label htmlFor="co-marketing" className="text-[12.5px] font-normal leading-relaxed text-muted-foreground">
                {t('checkout.marketing')}{' '}
                <Link href="/legal/privacy" className="underline underline-offset-2">{t('checkout.privacyShort')}</Link>.
              </Label>
            </div>
          </section>

          {/* Shipping address */}
          <section aria-labelledby="co-address" className="rounded-lg border border-border bg-card p-6">
            <h2 id="co-address" className="font-display text-[19px] font-medium">
              {t('checkout.s2')}
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {field('firstName', t('checkout.firstName'), { autoComplete: 'given-name' }, true)}
              {field('lastName', t('checkout.lastName'), { autoComplete: 'family-name' }, true)}
              {field('address', t('checkout.address'), { autoComplete: 'address-line1' })}
              {field('address2', t('checkout.address2'), { autoComplete: 'address-line2', required: false })}
              <div>
                <Label htmlFor="co-country" className="text-[12.5px] font-medium">{t('checkout.country')}</Label>
                <Select value={form.country} onValueChange={(v) => set('country', v)}>
                  <SelectTrigger id="co-country" className="mt-1.5 h-11 rounded-md">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {field('postalCode', t('checkout.postal'), { autoComplete: 'postal-code' }, true)}
              {field('city', t('checkout.city'), { autoComplete: 'address-level2' }, true)}
              {field('phone', t('checkout.phone'), { type: 'tel', autoComplete: 'tel', required: false }, true)}
            </div>
          </section>

          {/* Shipping method */}
          <section aria-labelledby="co-shipping" className="rounded-lg border border-border bg-card p-6">
            <h2 id="co-shipping" className="font-display text-[19px] font-medium">
              {t('checkout.s3')}
            </h2>
            <RadioGroup
              value={form.shippingMethod}
              onValueChange={(v) => set('shippingMethod', v)}
              className="mt-4 gap-3"
            >
              {SHIPPING_OPTIONS.map((opt) => {
                const free = qualifiesForFreeShipping(form.country, subtotal - discount);
                const optName = opt.id === 'standard' ? t('ship.standard') : t('ship.express');
                const optDesc = opt.id === 'standard' ? t('ship.standardDesc') : t('ship.expressDesc');
                return (
                  <Label
                    key={opt.id}
                    htmlFor={`ship-${opt.id}`}
                    className="flex cursor-pointer items-center justify-between rounded-md border border-border px-4 py-3.5 transition-colors has-[[data-state=checked]]:border-olive has-[[data-state=checked]]:bg-olive/5"
                  >
                    <span className="flex items-center gap-3">
                      <RadioGroupItem value={opt.id} id={`ship-${opt.id}`} />
                      <span>
                        <span className="block text-[13.5px] font-medium">{optName}</span>
                        <span className="block text-[12px] text-muted-foreground">{optDesc}</span>
                      </span>
                    </span>
                    <span className="text-[13.5px] font-semibold">{free ? <span className="text-olive">{t('common.free')}</span> : formatPrice(opt.price)}</span>
                  </Label>
                );
              })}
            </RadioGroup>

            {/* Gift wrap */}
            <div
              className={
                form.giftWrap
                  ? 'mt-4 rounded-md border border-terracotta/40 bg-terracotta/5 transition-colors'
                  : 'mt-4 rounded-md border border-border bg-background/50 transition-colors'
              }
            >
              <Label
                htmlFor="co-giftwrap"
                className="flex cursor-pointer items-start justify-between gap-3 px-4 py-3.5"
              >
                <span className="flex items-start gap-3">
                  <Checkbox
                    id="co-giftwrap"
                    checked={form.giftWrap}
                    onCheckedChange={(v) => set('giftWrap', v === true)}
                    className="mt-0.5"
                  />
                  <span>
                    <span className="flex items-center gap-1.5 text-[13.5px] font-medium">
                      <Gift
                        className={form.giftWrap ? 'h-4 w-4 text-terracotta' : 'h-4 w-4 text-muted-foreground'}
                        strokeWidth={1.5}
                      />
                      {t('checkout.giftWrap')}
                    </span>
                    <span className="mt-0.5 block text-[12px] leading-relaxed text-muted-foreground">
                      {t('checkout.giftWrapDesc')}
                    </span>
                  </span>
                </span>
                <span className="shrink-0 text-[13.5px] font-semibold">+{formatPrice(GIFT_WRAP_PRICE)}</span>
              </Label>
            </div>

            {/* Delivery notes / gift message */}
            <div className="mt-4">
              <Label htmlFor="co-notes" className="text-[12.5px] font-medium">
                {t('checkout.notes')}{' '}
                <span className="font-normal text-muted-foreground">{t('checkout.notesOptional')}</span>
              </Label>
              <Textarea
                id="co-notes"
                value={form.notes}
                onChange={(e) => set('notes', e.target.value.slice(0, ORDER_NOTES_MAX))}
                rows={3}
                maxLength={ORDER_NOTES_MAX}
                placeholder={t('checkout.notesPlaceholder')}
                className="mt-1.5 min-h-[84px] rounded-md bg-background"
                aria-describedby="co-notes-counter"
              />
              <p
                id="co-notes-counter"
                className="mt-1 text-right text-[11px] tabular-nums text-muted-foreground"
                aria-hidden
              >
                {form.notes.length}/{ORDER_NOTES_MAX}
              </p>
            </div>
          </section>

          {/* Payment — real Stripe Elements flow */}
          <section aria-labelledby="co-payment" className="rounded-lg border border-border bg-card p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="co-payment" className="font-display text-[19px] font-medium">
                {t('checkout.s4')}
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
                <p className="text-[12.5px] leading-relaxed text-muted-foreground">{session.errorMessage ?? t('checkout.paymentUnavailable')}</p>
              </div>
            )}

            {detailsValid && session.phase === 'error' && (
              <div className="mt-4 rounded-md border border-terracotta/30 bg-terracotta/5 px-4 py-3">
                <p className="text-[12.5px] leading-relaxed text-muted-foreground">{session.errorMessage ?? t('checkout.errorPayment')}</p>
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
                  onConfirm={() => session.confirmPayment().then((r) => { if (!r.ok && r.errorMessage) toast({ title: t('checkout.errorPaymentTitle'), description: r.errorMessage, variant: 'destructive' }); })}
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
                <PaymentElement elements={session.elements} />

                {/* Compact brand strip — informational only; the
                    selectable methods are the Stripe Element's own */}
                <PaymentBrandStrip country={form.country} currency="EUR" variant="compact" caption={t('checkout.weAccept')} className="mt-5" />
              </>
            )}

            <div className="mt-5 flex items-start gap-2.5">
              <Checkbox
                id="co-terms"
                checked={form.termsAccepted}
                onCheckedChange={(v) => set('termsAccepted', v === true)}
                className="mt-0.5"
              />
              <Label htmlFor="co-terms" className="text-[12.5px] font-normal leading-relaxed text-muted-foreground">
                {t('checkout.terms')}{' '}
                <Link href="/legal/terms" className="underline underline-offset-2">{t('checkout.termsShort')}</Link>,{' '}
                <Link href="/legal/privacy" className="underline underline-offset-2">{t('checkout.privacyShort')}</Link> {t('checkout.termsAnd')}{' '}
                <Link href="/legal/returns" className="underline underline-offset-2">{t('checkout.withdrawal')}</Link> (14 days).
              </Label>
            </div>
          </section>
        </div>

        {/* Right: summary */}
        <aside aria-label={t('checkout.summary')} className="lg:sticky lg:top-32 lg:self-start">
          <div className="rounded-lg border border-border bg-card p-6">
            <h2 className="font-display text-[19px] font-medium">{t('checkout.summary')}</h2>
            <ul className="mt-4 max-h-72 space-y-4 overflow-y-auto thin-scrollbar pr-1">
              {displayLines.map((l) => (
                <li key={l.slug} className="flex gap-3">
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md border border-border/60">
                    <Image src={l.image} alt={l.name} fill sizes="64px" className="object-cover" />
                    <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-ink px-1 text-[10.5px] font-semibold text-cream">
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
            <AccessoryUpsell />
            <Separator className="my-5" />
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
                <dt className="text-muted-foreground">{t('checkout.shippingLabel', { method: (form.shippingMethod === 'standard' ? t('ship.standard') : t('ship.express')).toLowerCase() })}</dt>
                <dd className="font-medium">{shipping === 0 ? <span className="text-olive">{t('common.free')}</span> : formatPrice(shipping)}</dd>
              </div>
              {form.giftWrap && (
                <div className="flex justify-between text-terracotta">
                  <dt className="flex items-center gap-1.5">
                    <Gift className="h-3.5 w-3.5" strokeWidth={1.5} /> {t('checkout.giftWrapLine')}
                  </dt>
                  <dd className="font-medium">+{formatPrice(GIFT_WRAP_PRICE)}</dd>
                </div>
              )}
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
            <button
              type="submit"
              disabled={payDisabled}
              className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-md bg-primary text-[14.5px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {session.phase === 'confirming' ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" /> {t('checkout.processing')}
                </>
              ) : session.phase === 'ready' ? (
                <>
                  <Lock className="h-4 w-4" strokeWidth={2} /> {t('checkout.pay', { amount: formatPrice(money(total)) })}
                </>
              ) : session.phase === 'unavailable' ? (
                <>
                  <Lock className="h-4 w-4" strokeWidth={2} /> {t('checkout.paymentUnavailableShort')}
                </>
              ) : (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" /> {t('checkout.paymentInitializing')}
                </>
              )}
            </button>
            <p className="mt-3.5 flex items-center justify-center gap-1.5 text-[11.5px] text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-olive" strokeWidth={1.5} />
              {t('checkout.payNote')}
            </p>
          </div>
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
