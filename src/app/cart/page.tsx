'use client';

import { calculatePromoDiscount } from '@/lib/constants';
import { shippingPrice, freeShipping as qualifiesForFreeShipping } from '@/lib/shipping';
import { AccessoryUpsell } from '@/components/cart/accessory-upsell';
import Link from 'next/link';
import Image from 'next/image';
import { Minus, Plus, Trash2, Heart, ShoppingBag, ShieldCheck, RotateCcw, Truck, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { useCart } from '@/lib/cart-store';
import { useWishlist } from '@/lib/wishlist-store';
import { useT } from '@/hooks/use-t';
import { PaymentBrandStrip } from '@/components/payments/payment-brand-strip';
import { formatPrice, toNumber, money } from '@/lib/format';
import { FREE_SHIPPING_THRESHOLD, SHIPPING_OPTIONS, PROMO_CODES } from '@/lib/constants';
import type { Product } from '@/types';
import { useEffect, useState } from 'react';

export default function CartPage() {
  const t = useT();
  const cart = useCart();
  const wishlist = useWishlist();
  const [promoInput, setPromoInput] = useState('');
  const [suggested, setSuggested] = useState<Product[]>([]);
  // Hydration-safe: the first client render must match the SSR payload
  // (empty cart), real lines appear right after mount.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(t);
  }, []);

  const lines = mounted ? cart.lines : [];
  const subtotal = mounted ? toNumber(cart.subtotal().toFixed(2)) : 0;
  const promo = cart.promoCode ? PROMO_CODES[cart.promoCode] : null;
  const discount = calculatePromoDiscount(lines, promo);
  const freeShipping = qualifiesForFreeShipping('PT', subtotal - discount);
  const shippingEstimate = shippingPrice('PT', subtotal - discount);
  const total = Math.max(0, subtotal - discount + shippingEstimate);
  const progress = Math.min(100, ((subtotal - discount) / FREE_SHIPPING_THRESHOLD) * 100);

  useEffect(() => {
    if (lines.length === 0) return;
    fetch('/api/products?sort=best&perPage=4')
      .then((r) => r.json())
      .then((d) => setSuggested((d.products ?? []).filter((p: Product) => !lines.some((l) => l.slug === p.slug)).slice(0, 4)))
      .catch(() => {});
  }, []);

  const applyPromo = () => {
    const code = promoInput.trim().toUpperCase();
    if (!code) return;
    if (PROMO_CODES[code]) {
      cart.setPromo(code);
      toast({ title: t('cart.promoToastApplied'), description: PROMO_CODES[code].label });
      setPromoInput('');
    } else {
      toast({ title: t('cart.promoInvalid'), description: t('cart.promoToastInvalidDesc'), variant: 'destructive' });
    }
  };

  const moveToWishlist = (slug: string) => {
    const line = lines.find((l) => `${l.slug}|${l.variantId ?? ''}` === slug);
    if (!line) return;
    wishlist.toggle(line.slug);
    cart.remove(slug);
    toast({ title: t('cart.movedToast'), description: line.name });
  };

  if (lines.length === 0) {
    return (
      <div className="container-ecom flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-cream">
          <ShoppingBag className="h-7 w-7 text-olive" strokeWidth={1.5} />
        </span>
        <h1 className="font-display mt-6 text-[28px] font-medium">{t('cart.emptyTitle')}</h1>
        <p className="mt-2 max-w-sm text-[14px] text-muted-foreground">
          {t('cart.emptyDescMain')}
        </p>
        <Link href="/shop" className="mt-7 inline-flex h-12 items-center rounded-md bg-primary px-8 text-[14px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90">
          {t('cart.startShopping')}
        </Link>
      </div>
    );
  }

  return (
    <div className="container-ecom py-8 lg:py-12">
      <h1 className="font-display text-[28px] font-medium tracking-tight sm:text-[32px]">{t('cart.title')}</h1>
      <p className="mt-1 text-[13.5px] text-muted-foreground">
        {t('cart.itemsCount', { n: lines.length, word: lines.length === 1 ? 'item' : 'items' })}
      </p>

      {/* Free shipping progress */}
      <div className="mt-6 rounded-lg border border-border bg-cream/60 p-4">
        <p className="text-[13px]">
          {freeShipping ? (
            <span className="font-medium text-olive">Portes grátis para Portugal e Espanha. Outros destinos europeus: compras superiores a 50 €.</span>
          ) : (
            <>
              {t('cart.freeShippingAway', { amount: formatPrice(FREE_SHIPPING_THRESHOLD - (subtotal - discount)) }).split(formatPrice(FREE_SHIPPING_THRESHOLD - (subtotal - discount)))[0]}
              <strong>{formatPrice(FREE_SHIPPING_THRESHOLD - (subtotal - discount))}</strong>
              {t('cart.freeShippingAway', { amount: formatPrice(FREE_SHIPPING_THRESHOLD - (subtotal - discount)) }).split(formatPrice(FREE_SHIPPING_THRESHOLD - (subtotal - discount)))[1]}
            </>
          )}
        </p>
        <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-border">
          <div
            className="h-full rounded-full bg-olive transition-all duration-500"
            style={{ width: `${progress}%` }}
            role="progressbar"
            aria-valuenow={Math.round(progress)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={t('cart.progressLabel')}
          />
        </div>
      </div>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_360px]">
        {/* Lines */}
        <section aria-label={t('cart.itemsRegion')}>
          <ul className="divide-y divide-border border-y border-border">
            {lines.map((line) => (
              <li key={`${line.slug}|${line.variantId ?? ''}`} className="flex gap-4 py-5">
                <Link href={`/product/${line.slug}`} className="relative h-24 w-24 shrink-0 overflow-hidden rounded-md border border-border/60 bg-muted/40 sm:h-28 sm:w-28">
                  <Image src={line.image} alt={line.name} fill sizes="112px" className="object-cover" />
                </Link>
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link href={`/product/${line.slug}`} className="line-clamp-1 text-[14.5px] font-medium hover:underline">
                        {line.name}
                      </Link>
                      {line.subtitle && <p className="mt-0.5 line-clamp-1 text-[12.5px] text-muted-foreground">{line.subtitle}</p>}
                    </div>
                    <p className="shrink-0 text-[14.5px] font-semibold">{formatPrice(toNumber(line.price) * line.quantity)}</p>
                  </div>
                  <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-3">
                    <div className="flex h-9 items-center rounded-md border border-input">
                      <button
                        type="button"
                        onClick={() => cart.setQty(`${line.slug}|${line.variantId ?? ''}`, line.quantity - 1)}
                        className="flex h-full w-9 items-center justify-center hover:bg-accent"
                        aria-label={t('cart.decrease', { name: line.name })}
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-8 text-center text-[13px] font-medium tabular-nums">{line.quantity}</span>
                      <button
                        type="button"
                        onClick={() => cart.setQty(`${line.slug}|${line.variantId ?? ''}`, line.quantity + 1)}
                        className="flex h-full w-9 items-center justify-center hover:bg-accent"
                        aria-label={t('cart.increase', { name: line.name })}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="flex items-center gap-4">
                      <button
                        type="button"
                        onClick={() => moveToWishlist(`${line.slug}|${line.variantId ?? ''}`)}
                        className="flex items-center gap-1.5 text-[12px] text-muted-foreground transition-colors hover:text-foreground"
                      >
                        <Heart className="h-3.5 w-3.5" strokeWidth={1.75} /> {t('cart.saveForLater')}
                      </button>
                      <button
                        type="button"
                        onClick={() => cart.remove(`${line.slug}|${line.variantId ?? ''}`)}
                        className="flex items-center gap-1.5 text-[12px] text-muted-foreground transition-colors hover:text-destructive"
                        aria-label={t('cart.removeFor', { name: line.name })}
                      >
                        <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} /> {t('drawer.removeShort')}
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          {/* Suggestions */}
          {suggested.length > 0 && (
            <div className="mt-10">
              <h2 className="font-display text-[20px] font-medium">{t('cart.completeTheLook')}</h2>
              <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                {suggested.map((p) => (
                  <Link key={p.id} href={`/product/${p.slug}`} className="group">
                    <div className="relative aspect-square overflow-hidden rounded-md border border-border/60">
                      <Image src={p.image} alt={p.name} fill sizes="200px" className="img-zoom object-cover" />
                    </div>
                    <p className="mt-2 line-clamp-1 text-[13px] font-medium">{p.name}</p>
                    <p className="text-[12.5px] text-muted-foreground">{formatPrice(p.price)}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Summary */}
        <aside aria-label={t('cart.summary')}>
          <div className="rounded-lg border border-border bg-card p-6 lg:sticky lg:top-32">
            <h2 className="font-display text-[20px] font-medium">{t('cart.summary')}</h2>

            {/* Promo */}
            <div className="mt-5">
              {cart.promoCode && promo ? (
                <div className="flex items-center justify-between rounded-md bg-olive/10 px-3.5 py-2.5">
                  <span className="flex items-center gap-2 text-[13px] font-medium text-olive">
                    <Tag className="h-3.5 w-3.5" /> {t('cart.promoApplied', { code: cart.promoCode, label: promo.label })}
                  </span>
                  <button type="button" onClick={() => cart.setPromo(null)} className="text-[12px] text-muted-foreground hover:text-destructive" aria-label={t('cart.promoRemoveAria')}>
                    {t('cart.promoRemove')}
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    value={promoInput}
                    onChange={(e) => setPromoInput(e.target.value)}
                    placeholder={t('cart.promoPlaceholder')}
                    className="h-10 rounded-md text-[13px]"
                    aria-label={t('cart.promoPlaceholder')}
                  />
                  <Button variant="outline" onClick={applyPromo} className="h-10 shrink-0 rounded-md px-4 text-[13px]">
                    {t('cart.promoApply')}
                  </Button>
                </div>
              )}
            </div>

            <AccessoryUpsell />
            <Separator className="my-5" />
            <dl className="space-y-3 text-[13.5px]">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{t('cart.subtotal')}</dt>
                <dd className="font-medium">{formatPrice(subtotal)}</dd>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-olive">
                  <dt>{t('cart.discount')} ({cart.promoCode})</dt>
                  <dd className="font-medium">−{formatPrice(discount)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{t('cart.shippingEstimate')}</dt>
                <dd className="font-medium">{shippingEstimate === 0 ? <span className="text-olive">{t('common.free')}</span> : formatPrice(shippingEstimate)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{t('cart.vat')}</dt>
                <dd className="text-muted-foreground">{t('cart.vatIncludedNote')}</dd>
              </div>
              <Separator />
              <div className="flex justify-between text-[16px]">
                <dt className="font-semibold">{t('cart.total')}</dt>
                <dd className="font-semibold">{formatPrice(money(total))}</dd>
              </div>
            </dl>

            <Link
              href="/checkout"
              className="mt-6 flex h-12 w-full items-center justify-center rounded-md bg-primary text-[14.5px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              {t('cart.checkout')}
            </Link>
            <Link href="/shop" className="mt-3 block text-center text-[13px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
              {t('cart.orContinue')}
            </Link>

            <ul className="mt-6 space-y-2.5 border-t border-border pt-5">
              {[
                { icon: ShieldCheck, label: t('cart.trustSecure') },
                { icon: RotateCcw, label: t('cart.trustReturns') },
                { icon: Truck, label: t('cart.trustTracked') },
              ].map((item) => (
                <li key={item.label} className="flex items-center gap-2.5 text-[12.5px] text-muted-foreground">
                  <item.icon className="h-4 w-4 shrink-0 text-olive" strokeWidth={1.5} />
                  {item.label}
                </li>
              ))}
            </ul>

            <PaymentBrandStrip country="ALL" currency="ALL" variant="compact" caption={t('footer.weAccept')} className="mt-6 border-t border-border pt-5" />
          </div>
        </aside>
      </div>
    </div>
  );
}
