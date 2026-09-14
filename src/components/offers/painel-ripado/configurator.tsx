'use client';

import { useLiveProduct } from '@/hooks/use-live-product';
import { OfferCountdown } from '@/components/product/offer-countdown';
import { isCatalogProductSaleable } from '@/lib/catalog/saleability';
import { cartStockLimit, quantityLimit } from '@/lib/catalog/inventory';
import { useMemo, useState } from 'react';
import { BadgeCheck, ChevronLeft, ChevronRight, Headphones, Maximize2, Minus, PackageCheck, Plus, Ruler, ShieldCheck, Truck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/lib/cart-store';
import { useCartDrawer } from '@/lib/cart-drawer-store';
import { trackOfferEvent } from '@/lib/offers/analytics';
import type { CatalogProduct } from '@/lib/catalog/types';
import type { OfferConfig, OfferMarketContext } from '@/lib/offers/types';
import { PaymentBrandStrip } from '@/components/payments/payment-brand-strip';
import { campaignEuro } from './data';

function StarRow({ value = 5, size = 14 }: { value?: number; size?: number }) {
  return <span className="inline-flex gap-0.5" aria-label={`${value} de 5 estrelas`}>{[1,2,3,4,5].map((star) => <span key={star} style={{ color: '#f2b01e', fontSize: size }}>{star <= Math.round(value) ? '★' : '☆'}</span>)}</span>;
}

export function PanelConfigurator({ product: initialProduct, offer, market }: { product: CatalogProduct; offer: OfferConfig; market: OfferMarketContext }) {
  const product = useLiveProduct(initialProduct);
  const offerSlug = offer.slug;
  const gallery = [...new Set([product.image, ...product.gallery.split(',').filter(Boolean)])];
  const router = useRouter();
  const add = useCart((state) => state.add);
  const openCart = useCartDrawer((state) => state.open);
  const [activeIndex, setActiveIndex] = useState(0);
  const [variantId, setVariantId] = useState(product.variants.find((variant) => variant.availability !== 'outOfStock')?.id);
  const [qty, setQty] = useState(1);
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const [wallWidth, setWallWidth] = useState('');
  const [wallHeight, setWallHeight] = useState('');
  const selected = product.variants.find((variant) => variant.id === variantId) ?? product.variants[0];
  const regularCents = product.priceCents + (selected?.priceDeltaCents ?? 0);
  const offerCents = regularCents;

  const estimate = useMemo(() => {
    const width = Number(wallWidth.replace(',', '.'));
    const height = Number(wallHeight.replace(',', '.'));
    const size = (selected?.name ?? product.dimensions ?? '').match(/(\d+(?:[.,]\d+)?)\s*[x×]\s*(\d+(?:[.,]\d+)?)/i);
    if (!width || !height || !size) return null;
    const divisor = /mm/i.test(selected?.name ?? product.dimensions ?? '') ? 100 : 1;
    return Math.max(1, Math.ceil((width * height) / (Number(size[1].replace(',', '.')) * Number(size[2].replace(',', '.')) / divisor)));
  }, [product.dimensions, selected, wallHeight, wallWidth]);

  const addCampaignLine = (buyNow: boolean) => {
    if (!isCatalogProductSaleable(product) || selected?.availability === 'outOfStock') return;
    add({
      slug: product.slug,
      name: product.name,
      subtitle: selected?.name ?? product.subtitle,
      price: (regularCents / 100).toFixed(2),
      image: product.image,
      automaticDiscountPct: product.promoDiscountPct, promoEndsAt: product.promoEndsAt, maxStock: cartStockLimit(product),
      variantId: selected?.id,
      variantLabel: selected?.name,
    }, qty);

    trackOfferEvent(buyNow ? 'begin_checkout' : 'add_to_cart', {
      offerSlug,
      productSlug: product.slug,
      variantId: selected?.id,
      quantity: qty,
      value: (offerCents * qty) / 100,
      currency: product.currency,
    });
    if (buyNow) router.push('/checkout'); else openCart();
  };

  return <section id="product" className="mx-auto max-w-6xl px-4 py-7 sm:px-6 lg:py-11">
    <div className="grid gap-9 lg:grid-cols-2 lg:gap-14">
      <div id="product-gallery" className="lg:sticky lg:top-24 lg:self-start">
        <div className="relative aspect-[4/5] overflow-hidden rounded-lg border border-[#e0d6cb] bg-[#e8e0d7] sm:aspect-square max-sm:-mx-4 max-sm:aspect-[4/3] max-sm:rounded-none max-sm:border-x-0">
          <img src={gallery[activeIndex]} alt={product.name} className="h-full w-full object-cover" />
          <button type="button" aria-label="Imagem anterior" onClick={() => setActiveIndex((activeIndex - 1 + gallery.length) % gallery.length)} className="absolute left-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 shadow-sm"><ChevronLeft className="h-5 w-5" /></button>
          <button type="button" aria-label="Próxima imagem" onClick={() => setActiveIndex((activeIndex + 1) % gallery.length)} className="absolute right-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 shadow-sm"><ChevronRight className="h-5 w-5" /></button>
          <span className="absolute left-3 top-3 rounded-full bg-[#201a17]/80 px-3 py-1.5 text-[10px] uppercase tracking-[.12em] text-[#f2e9df]">Escolha uma cor</span>
          <span className="absolute bottom-3 left-3 rounded bg-[#201a17]/80 px-2.5 py-1.5 text-[10px] text-[#f2e9df]">{activeIndex + 1} / {gallery.length}</span>
          <button type="button" onClick={() => window.open(gallery[activeIndex], '_blank', 'noopener,noreferrer')} className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded bg-white/90 px-3 py-2 text-[10px] font-semibold shadow"><Maximize2 className="h-3.5 w-3.5" />Ampliar</button>
        </div>
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1 max-sm:hidden">{gallery.map((src, index) => <button key={src} aria-label={`Ver imagem ${index + 1}`} type="button" onClick={() => setActiveIndex(index)} className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-md border-2 transition ${index === activeIndex ? 'border-[#8a5a2b]' : 'border-transparent opacity-60'}`}><img src={src} alt="" className="h-full w-full object-cover" /></button>)}</div>
      </div>

      <div className="flex flex-col gap-6">
        <div><h1 className="font-display text-3xl leading-none sm:text-5xl">{product.name}</h1><p className="mt-3 text-base leading-relaxed text-[#5c5049]">{product.shortDescription}</p></div>

        {offer.reviews.mode === 'verified' && offer.reviews.count ? <a href="#avaliacoes" className="flex w-fit items-center gap-2 text-sm"><StarRow value={offer.reviews.rating ?? 5} /><strong>{(offer.reviews.rating ?? 5).toFixed(1).replace('.', ',')}</strong><span className="text-[#7d6f64] underline underline-offset-4">{offer.reviews.count} avaliações verificadas</span></a> : <p className="inline-flex w-fit items-center gap-2 text-xs font-medium text-[#5c5049]"><BadgeCheck className="h-4 w-4 text-[#597057]" />Produto e preço ligados ao catálogo do fabricante</p>}

        <div id="configurar-painel" className="flex flex-col gap-6" style={{ scrollMarginTop: 72 }}>
          <div className="border-y border-[#e6ded4] py-4">
            <div className="flex items-baseline gap-2"><strong className="font-display text-4xl font-normal">{campaignEuro(offerCents)}</strong><span className="text-sm text-[#7d6f64]">por painel</span></div>
            <strong className="mt-1 block text-sm text-[#8a5a2b]">{product.promoDiscountPct ? `Oferta −${product.promoDiscountPct}%` : 'Preço E-com.casa'}</strong>
            <p className="mt-1 text-xs text-[#7d6f64]">Preço de catálogo do fornecedor: {campaignEuro(product.regularPriceCents ?? product.priceCents)}. Preço final confirmado antes do pagamento.</p>
            <OfferCountdown endsAt={product.promoEndsAt} />
          </div>

          <p className="text-sm">Fabricante: {product.manufacturer} · Acabamento: {product.color}</p>

          <div>
            <div className="mb-2 flex items-center justify-between gap-2"><div className="flex items-baseline gap-2"><span className="text-xs font-bold text-[#a89a8d]">01</span><strong className="text-sm">Tamanho:</strong><span className="text-sm text-[#7d6f64]">{selected?.name ?? 'Escolha uma opção'}</span></div><button type="button" onClick={() => setCalculatorOpen((value) => !value)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#8a5a2b]"><Ruler className="h-4 w-4" />Quantos painéis preciso?</button></div>
            <div className="grid grid-cols-2 gap-2">{product.variants.map((variant) => {
              const disabled = variant.availability === 'outOfStock';
              const variantRegularCents = product.priceCents + variant.priceDeltaCents;
              const variantOfferCents = variantRegularCents;
              return <button key={variant.id} type="button" disabled={disabled} onClick={() => { setVariantId(variant.id); trackOfferEvent('variant_selected', { offerSlug, productSlug: product.slug, variantId: variant.id }); }} className={`flex min-h-20 flex-col justify-center rounded-lg border p-3 text-left ${disabled ? 'cursor-not-allowed border-[#ded9d4] bg-[#efedeb] text-[#9a948e]' : variant.id === selected?.id ? 'border-[#8a5a2b] bg-[#fdfbf9]' : 'border-[#e0d6cb] bg-[#fdfbf9]'}`}><strong className="text-sm">{variant.name}</strong><span className="text-xs">{disabled ? 'Esgotado' : `${campaignEuro(variantOfferCents)} / unidade`}</span>{!disabled && <span className="mt-0.5 text-[10px] text-[#9a8d82]">{product.dimensions}</span>}</button>;
            })}</div>
            {calculatorOpen && <div className="mt-3 rounded-lg border border-[#e0d6cb] bg-[#fdfbf9] p-4"><p className="text-sm font-semibold">Calculadora rápida</p><p className="mt-1 text-xs text-[#7d6f64]">Introduza as medidas aproximadas da parede em centímetros.</p><div className="mt-3 grid grid-cols-2 gap-2"><input value={wallWidth} onChange={(event) => setWallWidth(event.target.value)} placeholder="Largura cm" inputMode="decimal" className="h-10 rounded-md border border-[#d9cec2] bg-white px-3 text-sm" /><input value={wallHeight} onChange={(event) => setWallHeight(event.target.value)} placeholder="Altura cm" inputMode="decimal" className="h-10 rounded-md border border-[#d9cec2] bg-white px-3 text-sm" /></div>{estimate && <p className="mt-3 text-sm">Estimativa inicial: <strong>{estimate} {estimate === 1 ? 'painel' : 'painéis'}</strong></p>}</div>}
          </div>

          <div><span className="mb-2 block text-base font-semibold text-[#3d342e]">Quantidade</span><div className="flex h-12 items-center justify-between rounded-xl bg-[#f1ece6] px-1"><button type="button" aria-label="Diminuir quantidade" onClick={() => setQty(Math.max(1, qty - 1))} className="grid h-10 w-10 place-items-center"><Minus className="h-4 w-4" /></button><strong className="text-base tabular-nums">{qty} {qty === 1 ? 'painel' : 'painéis'}</strong><button type="button" aria-label="Aumentar quantidade" onClick={() => setQty(Math.min(quantityLimit(product), qty + 1))} className="grid h-10 w-10 place-items-center rounded-lg bg-[#201a17] text-white"><Plus className="h-4 w-4" /></button></div></div>

          <div className="space-y-3">
            <div className="flex items-baseline justify-between"><span className="text-sm text-[#7d6f64]">Total promocional</span><strong className="text-xl">{campaignEuro(offerCents * qty)}</strong></div>
            <button type="button" disabled={!isCatalogProductSaleable(product)} onClick={() => addCampaignLine(true)} className="w-full rounded-full bg-[#201a17] py-4 text-base font-semibold text-[#f7f3ef] transition hover:bg-[#8a5a2b]">Comprar agora</button>
            <button type="button" disabled={!isCatalogProductSaleable(product)} onClick={() => addCampaignLine(false)} className="w-full rounded-full border border-[#201a17] py-3.5 text-sm font-semibold transition hover:bg-[#efe7de]">Adicionar ao carrinho</button>
            <div className="pt-1">
              <PaymentBrandStrip country={market.countryCode} currency={market.currency} variant="compact" caption="Pague como preferir" />
              <p className="mt-2 text-[11px] leading-5 text-[#7d6f64]">Cartão, MB WAY e Multibanco quando disponíveis para o país selecionado. Apple Pay surge no checkout em dispositivos compatíveis.</p>
            </div>
            <div className="border-t border-[#e6ded4] pt-4">
              <div className="flex items-start gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#efe7de]"><Truck className="h-4 w-4 text-[#8a5a2b]" /></span><div><p className="text-sm font-semibold">Entrega acompanhada</p><p className="mt-1 text-xs leading-5 text-[#7d6f64]">Portes grátis em Portugal e Espanha. Restante Europa disponível: portes grátis em encomendas superiores a 50 € após descontos.</p></div></div>
              <div className="mt-4 grid grid-cols-3 gap-2 border-t border-[#e6ded4] pt-4 text-center text-[10px] text-[#6f635b]"><span className="inline-flex flex-col items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-[#8a5a2b]" />Pagamento protegido</span><span className="inline-flex flex-col items-center gap-1.5"><PackageCheck className="h-4 w-4 text-[#8a5a2b]" />Encomenda acompanhada</span><span className="inline-flex flex-col items-center gap-1.5"><Headphones className="h-4 w-4 text-[#8a5a2b]" />Apoio pós-venda</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>;
}
