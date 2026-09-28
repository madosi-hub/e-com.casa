'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ArrowUpRight, Plus } from 'lucide-react';
import { AccessoryDetailModal } from '@/components/cart/accessory-detail-modal';
import { useLiveProduct } from '@/hooks/use-live-product';
import { useCart } from '@/lib/cart-store';
import { useCartDrawer } from '@/lib/cart-drawer-store';
import { cartStockLimit } from '@/lib/catalog/inventory';
import { getNuraltaAccessoryPresentation, NURALTA_STANDALONE_ACCESSORY_SLUGS } from '@/lib/catalog/nuralta-accessories';
import { isCatalogProductSaleable } from '@/lib/catalog/saleability';
import type { CatalogProduct } from '@/lib/catalog/types';
import { formatPrice } from '@/lib/format';

function AccessoryCard({ initialProduct }: { initialProduct: CatalogProduct }) {
  const product = useLiveProduct(initialProduct);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const add = useCart(state => state.add);
  const openCart = useCartDrawer(state => state.open);
  const variant = product.variants[0];
  const cents = product.priceCents + (variant?.priceDeltaCents ?? 0);
  const available = isCatalogProductSaleable(product) && variant?.availability !== 'outOfStock';
  const copy = getNuraltaAccessoryPresentation(product.slug);
  const name = copy?.name ?? product.name.replace(/\s+Nuralta\b/gi, '').trim();

  function addProduct() {
    if (!available) return;
    add({
      slug: product.slug,
      brand: product.brand,
      categorySlug: product.categorySlug,
      name: product.name,
      subtitle: product.subtitle,
      price: (cents / 100).toFixed(2),
      image: product.image,
      automaticDiscountPct: product.promoDiscountPct,
      promoEndsAt: product.promoEndsAt,
      maxStock: cartStockLimit(product),
      variantId: variant?.id,
      variantLabel: variant?.name,
    });
    setDetailsOpen(false);
    openCart();
  }

  return (
    <article className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-[#e0d6cb] bg-[#fdfbf9]">
      <button type="button" onClick={() => setDetailsOpen(true)} aria-label={`Ver ${name}: detalhes e avaliações`} className="group relative aspect-[5/4] w-full overflow-hidden bg-white focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-[#8a5a2b] sm:aspect-square">
        <Image src={product.image} alt={name} fill sizes="(max-width: 639px) 50vw, (max-width: 1023px) 45vw, 280px" className="object-contain p-3 transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none sm:p-5" />
        <span className="absolute bottom-3 right-3 grid size-8 place-items-center rounded-full border border-[#e0d6cb] bg-white text-[#62574f]" aria-hidden><ArrowUpRight className="size-4" /></span>
      </button>
      <div className="flex flex-1 flex-col p-3 sm:p-5">
        <h3 className="text-[15px] font-semibold leading-5 sm:text-lg sm:leading-6"><button type="button" className="text-left hover:underline focus-visible:outline-2 focus-visible:outline-[#8a5a2b]" onClick={() => setDetailsOpen(true)}>{name}</button></h3>
        <div className="mt-auto flex flex-wrap items-baseline gap-x-2 gap-y-1 pt-4">
          <strong className="text-xl font-semibold tabular-nums">{formatPrice((cents / 100).toFixed(2))}</strong>
          <span className="text-[10px] text-[#7d6f64] sm:text-xs">IVA incluído</span>
        </div>
        <button type="button" onClick={addProduct} disabled={!available} aria-label={available ? `Adicionar ${name} ao carrinho` : `${name}: indisponível`} className="mt-3 flex min-h-11 w-full items-center justify-center gap-1.5 rounded-full bg-[#201a17] px-2 py-2.5 text-xs font-semibold text-[#f7f3ef] transition hover:bg-[#8a5a2b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8a5a2b] disabled:cursor-not-allowed disabled:opacity-45 sm:text-sm"><Plus className="size-4 shrink-0" aria-hidden />{available ? 'Adicionar' : 'Indisponível'}</button>
        <button type="button" onClick={() => setDetailsOpen(true)} className="mt-1 min-h-11 text-[11px] font-medium text-[#62574f] underline decoration-[#c9b8a7] underline-offset-4 hover:text-[#201a17] sm:text-xs">Ver detalhes</button>
      </div>
      {detailsOpen && <AccessoryDetailModal key={product.slug} product={product} onClose={() => setDetailsOpen(false)} onAdd={addProduct} />}
    </article>
  );
}

export function InstallationAccessories({ products }: { products: CatalogProduct[] }) {
  const accessories = NURALTA_STANDALONE_ACCESSORY_SLUGS.flatMap(slug => {
    const product = products.find(item => item.slug === slug);
    return product ? [product] : [];
  });
  if (!accessories.length) return null;

  return (
    <section id="acessorios" aria-labelledby="accessories-title" className="border-y border-[#e0d6cb] bg-[#efe7de]/60 px-4 py-10 text-[#201a17] sm:px-6 sm:py-16">
      <div className="mx-auto max-w-6xl">
        <div className="mb-7 max-w-2xl sm:mb-9">
          <h2 id="accessories-title" className="font-display text-3xl leading-tight sm:text-4xl">Para instalar e dar o toque final.</h2>
          <p className="mt-3 text-sm leading-6 text-[#62574f] sm:text-base sm:leading-7">Escolha apenas o que lhe faz falta. Artigos vendidos à unidade.</p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
          {accessories.map(product => <AccessoryCard key={product.slug} initialProduct={product} />)}
        </div>
      </div>
    </section>
  );
}
