'use client';

import Link from 'next/link';
import { AccessoryUpsell } from './accessory-upsell';
import Image from 'next/image';
import { Minus, Plus, ShoppingBag, Trash2, Truck, Lock } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useCart } from '@/lib/cart-store';
import { useCartDrawer } from '@/lib/cart-drawer-store';
import { useT } from '@/hooks/use-t';
import { formatPrice } from '@/lib/format';
import { FREE_SHIPPING_THRESHOLD } from '@/lib/constants';

export function CartDrawer() {
  const t = useT();
  const isOpen = useCartDrawer((s) => s.isOpen);
  const setOpen = (v: boolean) => (v ? useCartDrawer.getState().open() : useCartDrawer.getState().close());
  const lines = useCart((s) => s.lines);
  const setQty = useCart((s) => s.setQty);
  const remove = useCart((s) => s.remove);

  const count = lines.reduce((a, l) => a + l.quantity, 0);
  const subtotal = lines.reduce((a, l) => a + parseFloat(l.price) * l.quantity, 0);
  const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
  const progress = Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100);

  return (
    <Sheet open={isOpen} onOpenChange={setOpen}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 border-border/70 bg-background p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border/70 px-5 py-4">
          <SheetTitle className="font-display text-[19px] font-medium">
            {t('drawer.title')}{' '}
            {count > 0 && (
              <span className="text-[14px] font-normal text-muted-foreground">
                {t('drawer.countSuffix', { n: count, word: count === 1 ? 'item' : 'items' })}
              </span>
            )}
          </SheetTitle>
          <SheetDescription className="sr-only">Review the items in your shopping cart</SheetDescription>
        </SheetHeader>

        {lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-muted/70">
              <ShoppingBag className="h-7 w-7 text-muted-foreground" strokeWidth={1.5} />
            </span>
            <div>
              <p className="font-display text-[18px] font-medium">{t('drawer.emptyTitle')}</p>
              <p className="mt-1 text-[13px] text-muted-foreground">{t('drawer.emptyDesc')}</p>
            </div>
            <Button asChild className="mt-2 rounded-md bg-ink text-cream hover:bg-ink/90">
              <Link href="/shop" onClick={() => setOpen(false)}>{t('drawer.browse')}</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="px-5"><p className="text-xs text-olive">Portes grátis: PT e ES · Europa acima de 50 €</p><AccessoryUpsell /></div>
            {/* Line items */}
            <ul className="flex-1 divide-y divide-border/60 overflow-y-auto px-5 thin-scrollbar" aria-label="Cart items">
              {lines.map((line) => (
                <li key={`${line.slug}|${line.variantId ?? ''}`} className="flex gap-4 py-4">
                  <Link href={`/product/${line.slug}`} onClick={() => setOpen(false)} className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md border border-border/60 bg-muted/40">
                    <Image src={line.image} alt={line.name} fill sizes="80px" className="object-cover" />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <Link href={`/product/${line.slug}`} onClick={() => setOpen(false)} className="line-clamp-1 text-[13.5px] font-medium hover:text-olive">
                          {line.name}
                        </Link>
                        {line.subtitle && <p className="mt-0.5 line-clamp-1 text-[12px] text-muted-foreground">{line.subtitle}</p>}
                      </div>
                      <span className="shrink-0 text-[13.5px] font-semibold tabular-nums">
                        {formatPrice((parseFloat(line.price) * line.quantity).toFixed(2))}
                      </span>
                    </div>
                    <div className="mt-2.5 flex items-center justify-between">
                      <div className="flex h-8 items-center rounded-md border border-input">
                        <button
                          type="button"
                          onClick={() => setQty(`${line.slug}|${line.variantId ?? ''}`, line.quantity - 1)}
                          className="flex h-full w-8 items-center justify-center transition-colors hover:bg-accent"
                          aria-label={t('drawer.decrease', { name: line.name })}
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-8 text-center text-[13px] font-medium tabular-nums" aria-live="polite">{line.quantity}</span>
                        <button
                          type="button"
                          onClick={() => setQty(`${line.slug}|${line.variantId ?? ''}`, line.quantity + 1)}
                          disabled={line.quantity >= (line.maxStock ?? Number.MAX_SAFE_INTEGER)}
                          className="flex h-full w-8 items-center justify-center transition-colors hover:bg-accent disabled:opacity-40"
                          aria-label={t('drawer.increase', { name: line.name })}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => remove(`${line.slug}|${line.variantId ?? ''}`)}
                        className="flex items-center gap-1 text-[12px] text-muted-foreground transition-colors hover:text-terracotta"
                        aria-label={t('drawer.remove', { name: line.name })}
                      >
                        <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                        {t('drawer.removeShort')}
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            {/* Summary + CTAs */}
            <div className="border-t border-border/70 bg-background px-5 py-4">
              <div className="flex items-baseline justify-between">
                <span className="text-[13.5px] text-muted-foreground">{t('drawer.subtotalVat')}</span>
                <span className="text-[17px] font-semibold tabular-nums">{formatPrice(subtotal.toFixed(2))}</span>
              </div>
              <p className="mt-1 text-[11.5px] text-muted-foreground">
                {remaining > 0 ? t('drawer.shippingNote') : t('drawer.freeShippingNote')}
              </p>
              <div className="mt-4 grid gap-2">
                <Button asChild className="h-11 rounded-md bg-ink text-[14px] font-semibold text-cream hover:bg-ink/90">
                  <Link href="/checkout" onClick={() => setOpen(false)}>
                    <Lock className="h-4 w-4" strokeWidth={1.75} />
                    {t('drawer.checkout')}
                  </Link>
                </Button>
                <Button asChild variant="outline" className="h-11 rounded-md border-ink text-[13.5px] font-semibold hover:bg-ink hover:text-cream">
                  <Link href="/cart" onClick={() => setOpen(false)}>{t('drawer.viewCart')}</Link>
                </Button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
