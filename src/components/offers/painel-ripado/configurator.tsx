'use client';

import { useLiveProduct } from '@/hooks/use-live-product';
import { isCatalogProductSaleable } from '@/lib/catalog/saleability';
import { cartStockLimit, quantityLimit } from '@/lib/catalog/inventory';
import { type TouchEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Maximize2, Minus, Play, Plus, Ruler, Star, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/lib/cart-store';
import { useCartDrawer } from '@/lib/cart-drawer-store';
import { trackOfferEvent } from '@/lib/offers/analytics';
import { isPanelOfferSlug, panelOfferPath } from '@/lib/offers/route-policy';
import type { CatalogProduct, ProductVariant } from '@/lib/catalog/types';
import type { OfferConfig, OfferMarketContext } from '@/lib/offers/types';
import { campaignEuro, isPanelVideo, panelProductMediaForColor, PANEL_COLORS, PANEL_PAYMENT_METHODS, PANEL_REVIEW_RATING, PANEL_REVIEW_TOTAL, PANEL_SIZES } from './data';

function StarRow({ value = 5, size = 14 }: { value?: number; size?: number }) {
  return (
    <span className="inline-flex gap-0.5" aria-label={`Avaliação de ${value.toFixed(1).replace('.', ',')} em 5`}>
      {Array.from({ length: 5 }).map((_, index) => {
        const filled = index < Math.floor(value);
        const half = !filled && index < value;

        return (
          <span key={index} className="relative inline-block" style={{ height: size, width: size }}>
            <Star className="absolute inset-0" style={{ height: size, width: size, color: '#b8860b' }} strokeWidth={1.5} />
            {(filled || half) && (
              <span className="absolute inset-0 overflow-hidden" style={{ width: half ? size / 2 : size }}>
                <Star className="fill-current" style={{ height: size, width: size, color: '#b8860b' }} strokeWidth={1.5} />
              </span>
            )}
          </span>
        );
      })}
    </span>
  );
}

function findConfiguredVariant(product: CatalogProduct, colorIndex: number | null, sizeIndex: number | null): ProductVariant | undefined {
  if (colorIndex === null || sizeIndex === null) return undefined;
  const exactId = `nuralta-panel-c${colorIndex}-s${sizeIndex}`;
  return product.variants.find((variant) => variant.id === exactId)
    ?? product.variants.find((variant) => variant.name.includes(PANEL_COLORS[colorIndex].name) && variant.name.includes(PANEL_SIZES[sizeIndex].label));
}

export function PanelConfigurator({ product: initialProduct, offer }: { product: CatalogProduct; offer: OfferConfig; market: OfferMarketContext }) {
  const product = useLiveProduct(initialProduct);
  const router = useRouter();
  const add = useCart((state) => state.add);
  const openCart = useCartDrawer((state) => state.open);
  const [activeIndex, setActiveIndex] = useState(0);
  const [colorIndex, setColorIndex] = useState<number | null>(null);
  const [sizeIndex, setSizeIndex] = useState<number | null>(null);
  const [qty, setQty] = useState(1);
  const [selectionError, setSelectionError] = useState('');
  const [selectionGuidanceVisible, setSelectionGuidanceVisible] = useState(false);
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const [productLightboxOpen, setProductLightboxOpen] = useState(false);
  const [wallWidth, setWallWidth] = useState('');
  const [wallHeight, setWallHeight] = useState('');
  const [calculatorSizeIndex, setCalculatorSizeIndex] = useState(0);
  const activeVideoRef = useRef<HTMLVideoElement | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const swipedRef = useRef(false);
  const selectedColor = colorIndex === null ? null : PANEL_COLORS[colorIndex];
  const gallery = panelProductMediaForColor(colorIndex);
  const active = gallery[activeIndex];
  const selectedSize = sizeIndex === null ? null : PANEL_SIZES[sizeIndex];
  const selectedVariant = findConfiguredVariant(product, colorIndex, sizeIndex);
  const selectedSizeSoldOut = Boolean(selectedSize?.soldOut || selectedVariant?.availability === 'outOfStock');
  const hasRequiredSelections = colorIndex !== null && sizeIndex !== null;
  const missingSelectionMessage = colorIndex === null && sizeIndex === null
    ? 'Falta selecionar a cor e o tamanho.'
    : colorIndex === null
      ? 'Falta selecionar a cor.'
      : sizeIndex === null
        ? 'Falta selecionar o tamanho.'
        : '';
  const visibleSelectionMessage = selectionError || (selectionGuidanceVisible ? missingSelectionMessage : '');
  const unitCents = selectedVariant ? product.priceCents + selectedVariant.priceDeltaCents : selectedSize?.priceCents ?? PANEL_SIZES[0].priceCents;
  const displayedPrice = selectedSize ? campaignEuro(unitCents) : `Desde ${campaignEuro(PANEL_SIZES[0].priceCents)}`;

  const moveGallery = useCallback((direction: number) => {
    setActiveIndex((index) => (index + direction + gallery.length) % gallery.length);
  }, [gallery.length]);

  const calculator = useMemo(() => {
    const width = Number(wallWidth.replace(',', '.'));
    const height = Number(wallHeight.replace(',', '.'));
    const size = PANEL_SIZES[calculatorSizeIndex] ?? PANEL_SIZES[0];
    const panels = width > 0 && height > 0 ? Math.max(1, Math.ceil((width * height * 1.1) / size.areaM2)) : 0;
    return { panels, priceCents: panels * size.priceCents };
  }, [calculatorSizeIndex, wallHeight, wallWidth]);

  useEffect(() => {
    if (!calculatorOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setCalculatorOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [calculatorOpen]);

  useEffect(() => {
    if (!productLightboxOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setProductLightboxOpen(false);
      if (event.key === 'ArrowLeft') moveGallery(-1);
      if (event.key === 'ArrowRight') moveGallery(1);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [moveGallery, productLightboxOpen]);

  useEffect(() => {
    if (active.type !== 'video') return;
    const video = activeVideoRef.current;
    if (!video) return;

    video.muted = true;
    video.currentTime = 0;
    const playVideo = () => {
      void video.play().catch(() => undefined);
    };

    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      playVideo();
      return;
    }

    video.addEventListener('loadeddata', playVideo, { once: true });
    return () => video.removeEventListener('loadeddata', playVideo);
  }, [active.src, active.type]);

  function handleGalleryTouchStart(event: TouchEvent<HTMLDivElement>) {
    const touch = event.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    swipedRef.current = false;
  }

  function handleGalleryTouchEnd(event: TouchEvent<HTMLDivElement>) {
    const start = touchStartRef.current;
    const touch = event.changedTouches[0];
    touchStartRef.current = null;
    if (!start || !touch) return;

    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    if (Math.abs(deltaX) < 45 || Math.abs(deltaX) < Math.abs(deltaY) * 1.2) return;

    swipedRef.current = true;
    moveGallery(deltaX < 0 ? 1 : -1);
    window.setTimeout(() => {
      swipedRef.current = false;
    }, 0);
  }

  const validate = () => {
    setSelectionGuidanceVisible(true);
    if (colorIndex === null && sizeIndex === null) {
      setSelectionError('Escolha uma cor e um tamanho antes de continuar.');
      return false;
    }
    if (colorIndex === null) {
      setSelectionError('Escolha uma cor antes de continuar.');
      return false;
    }
    if (sizeIndex === null) {
      setSelectionError('Escolha um tamanho para continuar.');
      return false;
    }
    if (selectedSizeSoldOut || !selectedVariant) {
      setSelectionError('Esta combinação está indisponível de momento.');
      return false;
    }
    setSelectionError('');
    return true;
  };

  const increaseQuantity = () => {
    if (!hasRequiredSelections) {
      setSelectionGuidanceVisible(true);
      setSelectionError(
        colorIndex === null && sizeIndex === null
          ? 'Para aumentar a quantidade, falta selecionar a cor e o tamanho.'
          : colorIndex === null
            ? 'Para aumentar a quantidade, falta selecionar a cor.'
            : 'Para aumentar a quantidade, falta selecionar o tamanho.',
      );
      return;
    }
    setSelectionError('');
    setQty(Math.min(quantityLimit(product), qty + 1));
  };

  const addCampaignLine = (buyNow: boolean) => {
    if (!validate() || !selectedColor || !selectedSize || !selectedVariant || !isCatalogProductSaleable(product)) return;
    add({
      slug: product.slug,
      name: product.name,
      brand: product.brand,
      categorySlug: product.categorySlug,
      subtitle: `${selectedColor.name} · ${selectedSize.label}`,
      price: (unitCents / 100).toFixed(2),
      image: selectedColor.src,
      automaticDiscountPct: product.promoDiscountPct,
      promoEndsAt: product.promoEndsAt,
      maxStock: cartStockLimit(product),
      variantId: selectedVariant.id,
      variantLabel: `${selectedColor.name} · ${selectedSize.label}`,
    }, qty);

    trackOfferEvent(buyNow ? 'begin_checkout' : 'add_to_cart', {
      offerSlug: offer.slug,
      productSlug: product.slug,
      variantId: selectedVariant.id,
      quantity: qty,
      value: (unitCents * qty) / 100,
      currency: product.currency,
    });
    if (buyNow) {
      router.push(isPanelOfferSlug(offer.slug) ? panelOfferPath(offer.slug, '/checkout') : '/checkout');
    }
    else openCart();
  };

  const applyCalculatedQuantity = () => {
    if (!calculator.panels) return;
    setSizeIndex(calculatorSizeIndex);
    if (colorIndex === null) {
      setSelectionGuidanceVisible(true);
      setSelectionError('Para aplicar a quantidade calculada, falta selecionar a cor.');
      setCalculatorOpen(false);
      return;
    }
    setQty(Math.min(quantityLimit(product), calculator.panels));
    setSelectionError('');
    setCalculatorOpen(false);
  };

  return (
    <section id="product" className="belmonte-product-section mx-auto max-w-6xl px-4 sm:px-6">
      <div className="grid min-w-0 gap-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-14">
        <div id="product-gallery" className="min-w-0 lg:sticky lg:top-24 lg:self-start">
          <div className="belmonte-product-image relative aspect-[4/5] max-h-[48dvh] touch-pan-y overflow-hidden rounded-lg border border-[#e0d6cb] bg-[#e8e0d7] max-sm:h-[38dvh] max-sm:min-h-[220px] sm:aspect-square sm:max-h-[540px] lg:max-h-[calc(100dvh-160px)]" onTouchStart={handleGalleryTouchStart} onTouchEnd={handleGalleryTouchEnd}>
            {active.type === 'video' ? (
              <video
                ref={activeVideoRef}
                key={active.src}
                src={active.src}
                poster={active.poster}
                aria-label={active.alt}
                className="h-full w-full object-cover object-center"
                autoPlay
                muted
                loop
                playsInline
                disablePictureInPicture
                preload="metadata"
              />
            ) : (
              <button type="button" onClick={() => { if (!swipedRef.current) setProductLightboxOpen(true); }} className="block h-full w-full" aria-label="Ampliar imagem do painel">
                <img src={active.src} alt={active.alt} className="h-full w-full object-cover object-center" />
              </button>
            )}

            <div className="pointer-events-none absolute inset-x-0 top-1/2 z-30 flex -translate-y-1/2 items-center justify-between px-2 sm:px-3">
              <button type="button" aria-label="Imagem anterior" onClick={() => moveGallery(-1)} className="pointer-events-auto grid h-10 w-10 place-items-center rounded-full bg-white/90 text-[#201a17] shadow-sm transition hover:bg-white sm:h-11 sm:w-11"><ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" /></button>
              <button type="button" aria-label="Próxima imagem" onClick={() => moveGallery(1)} className="pointer-events-auto grid h-10 w-10 place-items-center rounded-full bg-white/90 text-[#201a17] shadow-sm transition hover:bg-white sm:h-11 sm:w-11"><ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" /></button>
            </div>
            <span className="absolute left-3 top-3 rounded-full bg-[#201a17]/80 px-3 py-1.5 text-[10px] uppercase tracking-[.12em] text-[#f2e9df]">{selectedColor?.name ?? 'Escolha uma cor'}</span>
            <span className="belmonte-mobile-counter absolute bottom-3 left-3 rounded-full bg-[#201a17]/80 px-2.5 py-1.5 text-[10px] text-[#f2e9df]">{activeIndex + 1} / {gallery.length}</span>
            <button type="button" onClick={() => setProductLightboxOpen(true)} className="absolute bottom-3 right-3 z-30 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-2 text-[10px] font-semibold text-[#201a17] shadow transition hover:bg-white"><Maximize2 className="h-3.5 w-3.5" /> Ampliar</button>
          </div>

        </div>

        <div className="belmonte-product-info flex min-w-0 flex-col gap-6 pt-3 sm:pt-0">
          <div id="product-intro" className="min-w-0">
            <h1 className="belmonte-serif break-words text-[28px] leading-[1.04] sm:text-5xl">{offer.headline || 'Painel Ripado Acústico'}</h1>
            <p className="mt-3 overflow-hidden text-ellipsis text-sm leading-relaxed text-[#5c5049] sm:text-base">{offer.subheadline || 'Design que transforma. Instalação que simplifica.'}</p>
          </div>

          <div id="product-rating" className="flex min-w-0 flex-wrap items-center gap-2">
            <StarRow value={PANEL_REVIEW_RATING} size={16} />
            <strong className="text-base">{PANEL_REVIEW_RATING.toFixed(1).replace('.', ',')}</strong>
            <a href="#avaliacoes" className="text-base text-[#7d6f64] underline decoration-[#d8cec2] underline-offset-4">{PANEL_REVIEW_TOTAL} avaliações</a>
          </div>

          <div id="configurar-painel" className="belmonte-configurator flex flex-col gap-6" style={{ scrollMarginTop: 72 }}>
            <div id="product-price" className="border-y border-[#e6ded4] py-4">
              <div className="flex flex-wrap items-baseline gap-2">
                <strong className="belmonte-serif text-4xl font-normal">{displayedPrice}</strong>
                <span className="text-sm text-[#7d6f64]">por painel</span>
              </div>
              {!selectedSize && <p className="mt-1 text-xs text-[#7d6f64]">Painel de {PANEL_SIZES[0].label}. O preço varia consoante o tamanho.</p>}
            </div>

            <div id="product-color" className={`belmonte-color-option ${selectionGuidanceVisible && colorIndex === null ? 'ecom-pending-option rounded-xl' : ''}`}>
              <div className="mb-3 flex flex-wrap items-baseline gap-2"><strong className="text-sm">Cor:</strong><span className="text-sm text-[#7d6f64]">{selectedColor?.name ?? 'Escolha uma opção'}</span>{selectionGuidanceVisible && colorIndex === null && <span className="rounded-full bg-[#8a3f2b]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[.1em] text-[#8a3f2b]">Pendente</span>}</div>
              <div className="belmonte-color-selector flex items-center rounded-full border border-[#e0d6cb] bg-[#fdfbf9] px-4 py-2">
                <div className="relative min-w-0 flex-1 after:pointer-events-none after:absolute after:inset-y-0 after:right-0 after:w-8 after:bg-gradient-to-l after:from-[#fdfbf9] after:to-transparent">
                  <div className="belmonte-color-swatches no-scrollbar flex min-w-0 gap-2 overflow-x-auto py-0.5 pr-6">
                    {PANEL_COLORS.map((color, index) => (
                      <button key={color.name} type="button" aria-label={color.name} title={color.name} onClick={() => { setColorIndex(index); setActiveIndex(0); setSelectionError(''); }} className={`belmonte-color-swatch h-9 w-9 shrink-0 overflow-hidden rounded-full border-2 bg-[#fdfbf9] p-0.5 transition-colors ${index === colorIndex ? 'border-[#8a5a2b]' : 'border-transparent hover:border-[#8a5a2b]/50'}`}>
                        <img src={color.src} alt="" className="h-full w-full rounded-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div id="product-size" className={`min-w-0 ${selectionGuidanceVisible && sizeIndex === null ? 'ecom-pending-option rounded-xl' : ''}`}>
              <div className="mb-3 flex min-w-0 items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex min-w-0 flex-wrap items-baseline gap-2"><span className="belmonte-option-number text-xs font-bold text-[#a89a8d]">01</span><strong className="text-sm">Tamanho:</strong>{selectionGuidanceVisible && sizeIndex === null && <span className="rounded-full bg-[#8a3f2b]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[.1em] text-[#8a3f2b]">Pendente</span>}</div>
                  <span className="mt-1 block text-sm text-[#7d6f64]">{selectedSize?.label ?? 'Escolha uma opção'}</span>
                </div>
                <button type="button" onClick={() => { setCalculatorSizeIndex(sizeIndex ?? 0); setCalculatorOpen(true); trackOfferEvent('calculator_opened', { offerSlug: offer.slug, productSlug: product.slug }); }} className="inline-flex shrink-0 items-center gap-1.5 pt-0.5 text-xs font-medium text-[#8a5a2b] transition hover:text-[#201a17] sm:text-sm"><Ruler className="h-4 w-4 shrink-0 sm:h-[18px] sm:w-[18px]" /> <span>Quantos painéis preciso? Calcule aqui</span></button>
              </div>
              <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-2">
                {PANEL_SIZES.map((size, index) => {
                  const variant = findConfiguredVariant(product, colorIndex ?? 0, index);
                  const disabled = Boolean(size.soldOut || variant?.availability === 'outOfStock');
                  const selected = index === sizeIndex;
                  return (
                    <button key={size.key} type="button" disabled={disabled} onClick={() => { setSizeIndex(index); setSelectionError(''); }} className={`belmonte-option-card flex min-h-20 min-w-0 flex-col items-start gap-1 rounded-lg border p-3 text-left text-sm transition ${disabled ? 'cursor-not-allowed border-[#ded9d4] bg-[#efedeb] text-[#9a948e]' : selected ? 'border-[#8a5a2b] bg-[#f1e7db] shadow-[inset_0_0_0_1px_#8a5a2b]' : 'border-[#e0d6cb] bg-[#fdfbf9] hover:border-[#8a5a2b]'}`}>
                      <strong className="break-words">{size.label}</strong>
                      <span className="break-words text-xs sm:text-sm">{disabled ? 'Esgotado' : `${campaignEuro(variant ? product.priceCents + variant.priceDeltaCents : size.priceCents)} / unidade`}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div id="product-quantity" className="pt-2">
              <div className="mb-3"><span className="text-base font-semibold text-[#3d342e]">Quantidade</span></div>
              <div className="flex h-12 w-full items-center justify-between rounded-xl bg-[#f1ece6] px-1">
                <button type="button" aria-label="Diminuir quantidade" onClick={() => setQty(Math.max(1, qty - 1))} className="grid h-10 w-10 place-items-center rounded-lg text-[#5c5049] transition hover:bg-white/60"><Minus className="h-4 w-4" /></button>
                <strong className="text-base font-semibold tabular-nums text-[#201a17]">{qty} {qty === 1 ? 'painel' : 'painéis'}</strong>
                <button type="button" aria-label="Aumentar quantidade" aria-disabled={!hasRequiredSelections} onClick={increaseQuantity} className={`grid h-10 w-10 place-items-center rounded-lg text-white transition ${hasRequiredSelections ? 'bg-[#201a17] hover:bg-[#8a5a2b]' : 'cursor-not-allowed bg-[#8f837a]'}`}><Plus className="h-4 w-4" /></button>
              </div>
              {selectedSize && (
                <div className="mt-4 flex items-end justify-between px-1">
                  <div><strong className="block text-sm text-[#3d342e]">Total</strong><span className="mt-0.5 block text-xs text-[#8d7f73]">{qty} {qty === 1 ? 'painel' : 'painéis'} × {campaignEuro(unitCents)}</span></div>
                  <strong className="belmonte-serif text-3xl font-normal leading-none text-[#201a17]">{campaignEuro(unitCents * qty)}</strong>
                </div>
              )}
            </div>

            <div id="product-purchase" className="space-y-3">
              {visibleSelectionMessage && (
                <div role="status" aria-live="polite" className="rounded-xl border border-[#c99578] bg-[#fff7f1] px-4 py-3 text-sm font-semibold text-[#7c3828]">
                  {visibleSelectionMessage}
                </div>
              )}
              <button id="primary-buy-button" type="button" disabled={!isCatalogProductSaleable(product)} onClick={() => addCampaignLine(true)} className="w-full rounded-full bg-[#201a17] py-4 text-base font-semibold text-[#f7f3ef] transition hover:bg-[#8a5a2b] disabled:cursor-not-allowed disabled:opacity-45">Comprar agora</button>
              <button type="button" disabled={!isCatalogProductSaleable(product)} onClick={() => addCampaignLine(false)} className="w-full rounded-full border border-[#201a17] py-3.5 text-sm font-semibold transition hover:bg-[#efe7de] disabled:cursor-not-allowed disabled:opacity-45">Adicionar ao carrinho</button>
              <div>
                <p className="mb-2 text-sm font-semibold text-[#201a17]">Pague como preferir</p>
                <div className="flex flex-wrap items-center gap-2">
                  {PANEL_PAYMENT_METHODS.map((method) => (
                    <span key={method.alt} className="inline-flex h-9 items-center rounded-md border border-zinc-200 bg-white px-2.5">
                      <img src={method.src} alt={method.alt} style={{ width: method.width, maxHeight: 19, height: 'auto' }} />
                    </span>
                  ))}
                </div>
              </div>
              <div className="border-t border-[#e6ded4] pt-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-[#201a17]">Entrega por</span>
                  <img src="/pt/images/logo-ctt-express.svg" alt="CTT Express" style={{ width: 86, height: 'auto' }} />
                </div>
                <p className="mt-2 text-xs leading-relaxed text-[#7d6f64]">Envio gratuito para Portugal Continental</p>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[10px] text-[#6f635b]">
                  <span>Pagamento protegido</span>
                  <span>Entrega acompanhada</span>
                  <span>Apoio pós-venda</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {productLightboxOpen && (
        <div className="fixed inset-0 z-[140] flex flex-col bg-[#050505]" role="dialog" aria-modal="true" aria-label="Galeria do produto" onMouseDown={(event) => { if (event.target === event.currentTarget) setProductLightboxOpen(false); }}>
          <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-4 py-3 text-white">
            <span className="text-xs font-semibold">{activeIndex + 1} / {gallery.length}</span>
            <button type="button" onClick={() => setProductLightboxOpen(false)} className="rounded-full bg-white/10 p-2.5 text-white transition hover:bg-white/20" aria-label="Fechar galeria"><X className="h-5 w-5" /></button>
          </div>

          <div className="relative flex min-h-0 flex-1 items-center justify-center px-4 py-14 sm:px-16">
            <button type="button" onClick={() => moveGallery(-1)} className="absolute left-2 top-1/2 z-20 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/12 text-white transition hover:bg-white/22 sm:left-5" aria-label="Imagem anterior"><ChevronLeft className="h-7 w-7" /></button>
            {active.type === 'video' ? (
              <video key={active.src} src={active.src} poster={active.poster} className="max-h-full max-w-full object-contain" controls autoPlay muted loop playsInline />
            ) : (
              <img src={active.src} alt={active.alt} className="max-h-full max-w-full object-contain" />
            )}
            <button type="button" onClick={() => moveGallery(1)} className="absolute right-2 top-1/2 z-20 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/12 text-white transition hover:bg-white/22 sm:right-5" aria-label="Próxima imagem"><ChevronRight className="h-7 w-7" /></button>
          </div>

          <div className="no-scrollbar flex shrink-0 gap-2 overflow-x-auto border-t border-white/10 px-4 py-3">
            {gallery.map((item, index) => (
              <button key={`lightbox-${item.src}`} type="button" onClick={() => setActiveIndex(index)} className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-md border transition sm:h-16 sm:w-16 ${index === activeIndex ? 'border-white opacity-100' : 'border-transparent opacity-55 hover:opacity-90'}`} aria-label={item.type === 'video' ? 'Ver vídeo do produto' : `Ver imagem ${index + 1}`}>
                <img src={item.poster ?? item.src} alt="" className="h-full w-full object-cover" />
                {item.type === 'video' && <span className="absolute inset-0 grid place-items-center bg-black/25 text-white"><Play className="h-3.5 w-3.5 fill-current" /></span>}
              </button>
            ))}
          </div>
        </div>
      )}

      {calculatorOpen && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/60 p-4 backdrop-blur-[7px]" role="dialog" aria-modal="true" aria-labelledby="panel-calculator-title" onMouseDown={(event) => { if (event.target === event.currentTarget) setCalculatorOpen(false); }}>
          <div className="w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-6" style={{ maxHeight: '90vh' }}>
            <div className="flex items-start justify-between gap-4">
              <div><p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#8a5a2b]">Calculadora de painéis</p><h2 id="panel-calculator-title" className="mt-1 text-xl font-bold text-[#201a17]">Qual é o tamanho da parede?</h2><p className="mt-1 text-xs leading-5 text-[#7d6f64]">Indique as medidas em metros. Já incluímos 10% de margem para cortes e ajustes.</p></div>
          <button type="button" onClick={() => { setCalculatorOpen(false); trackOfferEvent('calculator_closed', { offerSlug: offer.slug, productSlug: product.slug, reason: 'button' }); }} className="shrink-0 rounded-full p-2 text-zinc-500 hover:bg-zinc-100" aria-label="Fechar calculadora"><X className="h-5 w-5" /></button>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <label className="text-xs font-semibold text-zinc-700">Largura<div className="mt-1.5 flex items-center rounded-xl border border-zinc-200 bg-zinc-50 px-3"><input type="text" inputMode="decimal" value={wallWidth} onChange={(event) => setWallWidth(event.target.value.replace(/[^\d.,]/g, ''))} placeholder="Ex.: 3,20" className="min-w-0 flex-1 bg-transparent py-3 text-base outline-none" /><span className="text-xs text-zinc-500">m</span></div></label>
              <label className="text-xs font-semibold text-zinc-700">Altura<div className="mt-1.5 flex items-center rounded-xl border border-zinc-200 bg-zinc-50 px-3"><input type="text" inputMode="decimal" value={wallHeight} onChange={(event) => setWallHeight(event.target.value.replace(/[^\d.,]/g, ''))} placeholder="Ex.: 2,60" className="min-w-0 flex-1 bg-transparent py-3 text-base outline-none" /><span className="text-xs text-zinc-500">m</span></div></label>
            </div>
            <div className="mt-5">
              <p className="mb-2 text-xs font-semibold text-zinc-700">Tamanho do painel</p>
              <div className="grid grid-cols-2 gap-2">
                {PANEL_SIZES.map((size, index) => (
                  <button key={size.key} type="button" disabled={size.soldOut} onClick={() => setCalculatorSizeIndex(index)} className={`rounded-xl border px-3 py-2.5 text-left text-xs font-semibold transition ${size.soldOut ? 'cursor-not-allowed border-zinc-200 bg-zinc-100 text-zinc-400' : calculatorSizeIndex === index ? 'border-[#8a5a2b] bg-[#f1e7db] text-[#201a17]' : 'border-zinc-200 bg-white text-zinc-600'}`}>
                    <span className="block">{size.label}</span>
                    {size.soldOut && <span className="mt-0.5 block text-[10px] uppercase tracking-wide">Esgotado</span>}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-5 rounded-2xl bg-[#f7f3ef] p-4 text-center">
              {calculator.panels ? (
                <>
                  <span className="text-xs text-[#7d6f64]">Quantidade recomendada</span>
                  <strong className="belmonte-serif mt-1 block text-4xl font-normal text-[#201a17]">{calculator.panels} {calculator.panels === 1 ? 'painel' : 'painéis'}</strong>
                  <span className="mt-2 block text-xs text-[#7d6f64]">Valor estimado</span>
                  <strong className="mt-0.5 block text-xl text-[#201a17]">{campaignEuro(calculator.priceCents)}</strong>
                </>
              ) : <p className="text-sm text-[#7d6f64]">Preencha as duas medidas para ver o resultado.</p>}
            </div>
            <button type="button" onClick={applyCalculatedQuantity} disabled={!calculator.panels} className="mt-4 w-full rounded-full bg-[#201a17] py-3.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">{calculator.panels ? `Selecionar ${calculator.panels} ${calculator.panels === 1 ? 'painel' : 'painéis'}` : 'Preencha as medidas'}</button>
            <p className="mt-2 text-center text-[11px] leading-relaxed text-[#8d7f73]">Pode alterar a quantidade depois.</p>
          </div>
        </div>
      )}
    </section>
  );
}
