'use client';

import { useLiveProduct } from '@/hooks/use-live-product';
import { cartStockLimit, quantityLimit } from '@/lib/catalog/inventory';
import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/lib/cart-store';
import { useCartDrawer } from '@/lib/cart-drawer-store';
import { useT } from '@/hooks/use-t';
import { formatPrice } from '@/lib/format';
import { isCatalogProductSaleable } from '@/lib/catalog/saleability';
import type { Product } from '@/types';
import { cn } from '@/lib/utils';

export function StickyAddToCart({ product: initialProduct }: { product: Product }) {
  const product = useLiveProduct(initialProduct);
  const t = useT();
  const add = useCart((s) => s.add);
  const openCartDrawer = useCartDrawer((s) => s.open);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [qty, setQty] = useState(1);
  const saleable = isCatalogProductSaleable(product);

  useEffect(() => {
    const target = sentinelRef.current;
    if (!target || !saleable) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setVisible(!entry.isIntersecting && entry.boundingClientRect.top < 0);
      },
      { threshold: 0 },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [saleable]);

  if (!saleable) return null;

  const onAdd = () => {
    add(
      {
        slug: product.slug,
        name: product.name,
        subtitle: product.subtitle,
        price: product.price,
        image: product.image,
        automaticDiscountPct: product.promoDiscountPct, promoEndsAt: product.promoEndsAt, maxStock: cartStockLimit(product),
      },
      qty,
    );
    openCartDrawer();
  };

  return (
    <>
      <div ref={sentinelRef} aria-hidden className="h-0" />
      <div
        className={cn(
          'fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-background/95 backdrop-blur transition-transform duration-300 will-change-transform',
          'supports-[backdrop-filter]:bg-background/90',
          visible ? 'translate-y-0' : 'translate-y-full',
        )}
        aria-hidden={!visible}
      >
        <div className="container-ecom flex items-center gap-3 py-3 sm:gap-4">
          <div className="relative hidden h-12 w-12 shrink-0 overflow-hidden rounded-md border border-border/60 bg-muted/40 sm:block">
            <Image src={product.image} alt="" fill sizes="48px" className="object-cover" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13.5px] font-medium leading-tight">{product.name}</p>
            <p className="mt-0.5 text-[12.5px] text-muted-foreground">
              <span className="font-semibold text-foreground">{formatPrice(product.price)}</span> · {t('buy.inclVat')}
            </p>
          </div>
          <div className="hidden h-10 items-center rounded-md border border-input sm:flex">
            <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1} className="flex h-full w-9 items-center justify-center transition-colors hover:bg-accent disabled:opacity-40" aria-label={t('buy.decrease')}>−</button>
            <span className="w-8 text-center text-[13px] font-medium tabular-nums" aria-live="polite">{qty}</span>
            <button type="button" onClick={() => setQty((q) => Math.min(quantityLimit(product), q + 1))} disabled={qty >= (quantityLimit(product))} className="flex h-full w-9 items-center justify-center transition-colors hover:bg-accent disabled:opacity-40" aria-label={t('buy.increase')}>+</button>
          </div>
          <Button onClick={onAdd} className="h-10 shrink-0 gap-2 rounded-md bg-ink px-4 text-[13.5px] font-semibold text-cream hover:bg-ink/90 sm:px-6">
            <ShoppingBag className="h-4 w-4" strokeWidth={1.75} />
            {t('sticky.addToCart')}
          </Button>
        </div>
      </div>
    </>
  );
}
