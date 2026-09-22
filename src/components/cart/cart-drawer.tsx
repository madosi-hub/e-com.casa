'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AccessoryUpsell } from './accessory-upsell';
import { AccessoryDetailModal } from './accessory-detail-modal';
import Image from 'next/image';
import { useState } from 'react';
import { Minus, Plus, ShoppingBag, Trash2, Lock } from 'lucide-react';
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
import { formatPrice } from '@/lib/format';
import { FREE_SHIPPING_THRESHOLD } from '@/lib/constants';
import type { CatalogProduct } from '@/lib/catalog/types';
import { cartStockLimit } from '@/lib/catalog/inventory';
import { nuraltaCartImage } from '@/lib/catalog/nuralta-media';

export function CartDrawer() {
  const pathname = usePathname();
  const nuraltaOfferRoute = pathname === '/offers/painel-ripado' || pathname === '/offers/nuralta-painel-ripado';
  const isOpen = useCartDrawer((s) => s.isOpen);
  const setOpen = (v: boolean) => (v ? useCartDrawer.getState().open() : useCartDrawer.getState().close());
  const lines = useCart((s) => s.lines);
  const setQty = useCart((s) => s.setQty);
  const remove = useCart((s) => s.remove);
  const [detailProduct, setDetailProduct] = useState<CatalogProduct | null>(null);

  const count = lines.reduce((a, l) => a + l.quantity, 0);
  const subtotal = lines.reduce((a, l) => a + parseFloat(l.price) * l.quantity, 0);
  const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
  const isAccessory = (slug: string) => slug === 'nuralta-kit-instalacao-completo' || slug === 'nuralta-fita-led-rgb-3m';
  const openAccessoryDetail = async (slug: string) => {
    const response = await fetch(`/api/products/${encodeURIComponent(slug)}`);
    if (!response.ok) return;
    const data = await response.json() as { product?: CatalogProduct };
    if (data.product) setDetailProduct(data.product);
  };

  return (
    <Sheet open={isOpen} onOpenChange={setOpen}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 border-border/70 bg-background p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border/70 px-5 py-4">
          <SheetTitle className="font-display text-[19px] font-medium">
            O seu carrinho{' '}
            {count > 0 && (
              <span className="text-[14px] font-normal text-muted-foreground">
                · {count} {count === 1 ? 'artigo' : 'artigos'}
              </span>
            )}
          </SheetTitle>
          <SheetDescription className="sr-only">Rever os artigos no seu carrinho</SheetDescription>
        </SheetHeader>

        {lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-muted/70">
              <ShoppingBag className="h-7 w-7 text-muted-foreground" strokeWidth={1.5} />
            </span>
            <div>
              <p className="font-display text-[18px] font-medium">O seu carrinho está vazio</p>
              <p className="mt-1 text-[13px] text-muted-foreground">Adicione algo especial para começar.</p>
            </div>
            <Button asChild className="mt-2 rounded-md bg-ink text-cream hover:bg-ink/90">
              <Link href="/shop" onClick={() => setOpen(false)}>Ver produtos</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="min-h-0 flex-1 overflow-y-auto thin-scrollbar">
              {/* Line items */}
              <ul className="divide-y divide-border/60 px-5" aria-label="Artigos no carrinho">
                {lines.map((line) => (
                  <li key={`${line.slug}|${line.variantId ?? ''}`} className="flex gap-4 py-4">
                    {isAccessory(line.slug) ? (
                      <button type="button" onClick={() => void openAccessoryDetail(line.slug)} aria-label={`Ver fotos e detalhes de ${line.name.replace(/\s+Nuralta\b/gi, '').trim()}`} className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md border border-border/60 bg-muted/40">
                        <Image src={nuraltaCartImage(line.slug, line.image)} alt={line.name.replace(/\s+Nuralta\b/gi, '').trim()} fill sizes="80px" className="object-cover" />
                      </button>
                    ) : (
                      <Link href={line.slug === 'nuralta-painel-ripado-decorativo' ? '/offers/painel-ripado' : `/product/${line.slug}`} onClick={() => setOpen(false)} className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md border border-border/60 bg-muted/40">
                        <Image src={nuraltaCartImage(line.slug, line.image)} alt={line.name.replace(/\s+Nuralta\b/gi, '').trim()} fill sizes="80px" className="object-cover" />
                      </Link>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <Link href={line.slug === 'nuralta-painel-ripado-decorativo' ? '/offers/painel-ripado' : `/product/${line.slug}`} onClick={() => setOpen(false)} className="line-clamp-1 text-[13.5px] font-medium hover:text-olive">
                            {line.name.replace(/\s+Nuralta\b/gi, '').trim()}
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
                            aria-label={`Diminuir quantidade de ${line.name}`}
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="w-8 text-center text-[13px] font-medium tabular-nums" aria-live="polite">{line.quantity}</span>
                          <button
                            type="button"
                            onClick={() => setQty(`${line.slug}|${line.variantId ?? ''}`, line.quantity + 1)}
                            disabled={line.quantity >= (line.maxStock ?? Number.MAX_SAFE_INTEGER)}
                            className="flex h-full w-8 items-center justify-center transition-colors hover:bg-accent disabled:opacity-40"
                            aria-label={`Aumentar quantidade de ${line.name}`}
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => remove(`${line.slug}|${line.variantId ?? ''}`)}
                          className="flex items-center gap-1 text-[12px] text-muted-foreground transition-colors hover:text-terracotta"
                          aria-label={`Remover ${line.name} do carrinho`}
                        >
                          <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                          Remover
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>

              {/* Installation accessories follow the selected products in the same scroll area. */}
              <div className="px-5"><AccessoryUpsell /></div>
            </div>

            {/* Summary + CTAs */}
            <div className="border-t border-border/70 bg-background px-5 py-4">
              <div className="flex items-baseline justify-between">
                <span className="text-[13.5px] text-muted-foreground">Subtotal (IVA incluído)</span>
                <span className="text-[17px] font-semibold tabular-nums">{formatPrice(subtotal.toFixed(2))}</span>
              </div>
              <p className="mt-1 text-[11.5px] text-muted-foreground">
                {remaining > 0 ? 'Envio calculado no checkout' : 'Envio standard gratuito aplicado no checkout'}
              </p>
              <div className="mt-4 grid gap-2">
                <Button asChild className="h-11 rounded-md bg-ink text-[14px] font-semibold text-cream hover:bg-ink/90">
                  <Link
                    href={nuraltaOfferRoute ? '/offers/painel-ripado/checkout' : '/checkout'}
                    onClick={() => setOpen(false)}
                  >
                    <Lock className="h-4 w-4" strokeWidth={1.75} />
                    Finalizar encomenda em segurança
                  </Link>
                </Button>
              </div>
            </div>
          </>
        )}
        {detailProduct && <AccessoryDetailModal product={detailProduct} onClose={() => setDetailProduct(null)} onAdd={() => { useCart.getState().add({ slug: detailProduct.slug, brand: detailProduct.brand, categorySlug: detailProduct.categorySlug, name: detailProduct.name, subtitle: detailProduct.subtitle, price: ((detailProduct.priceCents + (detailProduct.variants[0]?.priceDeltaCents ?? 0)) / 100).toFixed(2), image: detailProduct.image, automaticDiscountPct: detailProduct.promoDiscountPct, promoEndsAt: detailProduct.promoEndsAt, maxStock: cartStockLimit(detailProduct), variantId: detailProduct.variants[0]?.id, variantLabel: detailProduct.variants[0]?.name }); setDetailProduct(null); }} />}
      </SheetContent>
    </Sheet>
  );
}
