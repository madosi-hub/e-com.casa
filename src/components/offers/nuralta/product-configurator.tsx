"use client";

import { type TouchEvent, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Ruler,
  Minus,
  Plus,
} from "lucide-react";
import { COLORS, SIZES, GALLERY, INITIAL_GALLERY_INDEX, PAYMENT_METHODS } from "./data";
import { StarRow } from "./stars";
import type { CatalogProduct } from "@/lib/catalog/types";
import type { OfferConfig } from "@/lib/offers/types";
import { useCart } from "@/lib/cart-store";
import { cartStockLimit } from "@/lib/catalog/inventory";
import { isCatalogProductSaleable } from "@/lib/catalog/saleability";
import { trackOfferEvent } from "@/lib/offers/analytics";
import { useNuraltaCart } from "./cart-overlay";

export function ProductConfigurator({ product, offer }: { product: CatalogProduct; offer: OfferConfig }) {
  const add = useCart((state) => state.add);
  const { openNuraltaCart } = useNuraltaCart();
  const [activeIndex, setActiveIndex] = useState(INITIAL_GALLERY_INDEX);
  const [color, setColor] = useState<number | null>(null);
  const [size, setSize] = useState<number | null>(null);
  const [qty, setQty] = useState(1);
  const [selectionError, setSelectionError] = useState("");
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const go = (dir: number) => {
    setActiveIndex((i) => (i + dir + GALLERY.length) % GALLERY.length);
  };

  const handleGalleryTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleGalleryTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    const start = touchStartRef.current;
    const touch = event.changedTouches[0];
    touchStartRef.current = null;
    if (!start || !touch) return;

    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    if (Math.abs(deltaX) < 45 || Math.abs(deltaX) < Math.abs(deltaY) * 1.2) return;

    go(deltaX < 0 ? 1 : -1);
  };

  const active = GALLERY[activeIndex] ?? GALLERY[INITIAL_GALLERY_INDEX];

  const addConfiguredProduct = (buyNow: boolean) => {
    if (color === null || size === null) {
      setSelectionError("Escolha uma cor e um tamanho antes de continuar.");
      return;
    }
    const variant = product.variants.find((item) => item.id === `nuralta-panel-c${color}-s${size}`);
    if (!variant || variant.availability === "outOfStock" || !isCatalogProductSaleable(product)) return;
    const unitCents = product.priceCents + variant.priceDeltaCents;
    add({
      slug: product.slug,
      brand: product.brand,
      categorySlug: product.categorySlug,
      name: product.name,
      subtitle: `${COLORS[color].name} · ${SIZES[size].label}`,
      price: (unitCents / 100).toFixed(2),
      image: COLORS[color].src,
      maxStock: cartStockLimit(product),
      variantId: variant.id,
      variantLabel: `${COLORS[color].name} · ${SIZES[size].label}`,
    }, qty);
    trackOfferEvent(buyNow ? "begin_checkout" : "add_to_cart", {
      offerSlug: offer.slug,
      productSlug: product.slug,
      variantId: variant.id,
      quantity: qty,
      value: (unitCents * qty) / 100,
      currency: product.currency,
    });
    setSelectionError("");
    openNuraltaCart();
  };

  return (
    <section
      id="product"
      className="belmonte-product-section mx-auto max-w-6xl px-4 sm:px-6"
    >
      <div className="grid gap-9 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-14">
        {/* Gallery */}
        <div id="product-gallery" className="lg:sticky lg:top-24 lg:self-start">
          <div className="belmonte-product-image relative aspect-[4/5] max-h-[48dvh] touch-pan-y overflow-hidden rounded-lg border border-[#e0d6cb] bg-[#e8e0d7] max-sm:h-[38dvh] max-sm:min-h-[220px] sm:aspect-square sm:max-h-[540px] lg:max-h-[calc(100dvh-160px)]" onTouchStart={handleGalleryTouchStart} onTouchEnd={handleGalleryTouchEnd}>
            {active.type === "video" ? (
              <video
                src={active.src}
                poster={active.poster}
                aria-label={active.alt}
                className="h-full w-full object-cover object-top"
                style={{ objectPosition: "50% 0%", transform: "translateY(-8%) scale(1.08)", transformOrigin: "top center" }}
                controls
                playsInline
                preload="metadata"
              />
            ) : (
               
              <img
                src={active.src}
                alt={active.alt}
                className="h-full w-full object-cover object-top"
                style={{ objectPosition: "50% 0%", transform: "translateY(-8%) scale(1.08)", transformOrigin: "top center" }}
              />
            )}

            <button
              type="button"
              aria-label="Imagem anterior"
              onClick={() => go(-1)}
              className="absolute left-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-[#201a17] shadow-sm transition hover:bg-white sm:h-11 sm:w-11"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label="Próxima imagem"
              onClick={() => go(1)}
              className="absolute right-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-[#201a17] shadow-sm transition hover:bg-white sm:h-11 sm:w-11"
            >
              <ChevronRight className="h-5 w-5" />
            </button>

            <span className="absolute left-3 top-3 rounded-full bg-[#201a17]/80 px-3 py-1.5 text-[10px] uppercase tracking-[.12em] text-[#f2e9df]">
              Escolha uma cor
            </span>

            <span className="belmonte-mobile-counter absolute bottom-3 left-3 rounded bg-[#201a17]/80 px-2.5 py-1.5 text-[10px] text-[#f2e9df]">
              {activeIndex + 1} / {GALLERY.length}
            </span>

            <button
              type="button"
              className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded bg-white/90 px-3 py-2 text-[10px] font-semibold text-[#201a17] shadow"
            >
              <Maximize2 className="h-3.5 w-3.5" />
              Ampliar
            </button>
          </div>

        </div>

        {/* Info */}
        <div className="belmonte-product-info flex min-w-0 flex-col gap-6 pt-3 sm:pt-0">
          <div id="product-intro">
            <h1 className="belmonte-serif text-3xl leading-none sm:text-5xl">
              Painel Ripado Acústico
            </h1>
            <p className="mt-3 text-base leading-relaxed text-[#5c5049]">
              Design que transforma. Instalação que simplifica.
            </p>
          </div>

          <div id="product-rating" className="flex items-center gap-2">
            <StarRow fill="#b8860b" size={16} value={4.7} />
            <strong className="text-base">4,7</strong>
            <a
              href="#avaliacoes"
              className="text-base text-[#7d6f64] underline decoration-[#d8cec2] underline-offset-4"
            >
              220 avaliações
            </a>
          </div>

          <div id="configurar-painel" className="belmonte-configurator flex flex-col gap-6" style={{ scrollMarginTop: 72 }}>
            {/* Price */}
            <div id="product-price" className="border-y border-[#e6ded4] py-4">
              <div className="flex items-baseline gap-2">
                <strong className="belmonte-serif text-4xl font-normal">
                  Desde 5,00&nbsp;€
                </strong>
                <span className="text-sm text-[#7d6f64]">por painel</span>
              </div>
              <p className="mt-1 text-xs text-[#7d6f64]">
                Painel de 240 × 60 cm. O preço varia consoante o tamanho.
              </p>
            </div>

            {/* Color */}
            <div id="product-color" className="belmonte-color-option">
              <div className="mb-2 flex items-center gap-2">
                <strong className="text-sm">Cor:</strong>
                <span className="text-sm text-[#7d6f64]">
                  {color !== null ? COLORS[color].name : "Escolha uma opção"}
                </span>
              </div>
              <div className="relative">
                <div className="belmonte-color-selector flex gap-2 overflow-x-auto rounded-full border border-[#e0d6cb] bg-[#fdfbf9] px-4 py-2 no-scrollbar">
                  <div className="belmonte-color-swatches flex gap-2">
                    {COLORS.map((c, i) => (
                      <button
                        key={c.name}
                        type="button"
                        aria-label={c.name}
                        title={c.name}
                        onClick={() => { setColor(i); setSelectionError(""); }}
                        className={`belmonte-color-swatch h-9 w-9 overflow-hidden rounded-full border-2 p-0.5 transition ${
                          i === color
                            ? "border-[#8a5a2b]"
                            : "border-transparent hover:border-[#8a5a2b]/50"
                        }`}
                      >
                        { }
                        <img
                          src={c.src}
                          alt={c.name}
                          className="h-full w-full rounded-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </div>
                <span className="belmonte-color-fade pointer-events-none absolute right-0 top-0 h-full w-12" />
              </div>
            </div>

            {/* Size */}
            <div id="product-tamanho" className="min-w-0">
              <div className="mb-3 flex min-w-0 items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex min-w-0 flex-wrap items-baseline gap-2">
                    <span className="belmonte-option-number text-xs font-bold text-[#a89a8d]">
                      01
                    </span>
                    <strong className="text-sm">Tamanho:</strong>
                  </div>
                  <span className="mt-1 block text-sm text-[#7d6f64]">
                    {size !== null ? SIZES[size].label : "Escolha uma opção"}
                  </span>
                </div>
                <button
                  type="button"
                  className="inline-flex shrink-0 items-center gap-1.5 pt-0.5 text-xs font-medium text-[#8a5a2b] transition hover:text-[#201a17] sm:text-sm"
                >
                  <Ruler className="h-4 w-4 shrink-0" />
                  <span>Quantos painéis preciso?</span>
                </button>
              </div>
              <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-2">
                {SIZES.map((s, i) => {
                  const selected = i === size;
                  if (s.disabled) {
                    return (
                      <div
                        key={s.id}
                        aria-disabled="true"
                        className="belmonte-option-card flex min-h-20 min-w-0 flex-col justify-center rounded-lg border p-3"
                        style={{
                          background: "rgb(239,237,235)",
                          border: "1px solid rgb(222,217,212)",
                          color: "rgb(154,148,142)",
                          cursor: "not-allowed",
                        }}
                      >
                        <strong className="text-sm">{s.label}</strong>
                        <span className="text-xs">{s.disabledLabel}</span>
                      </div>
                    );
                  }
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => { setSize(i); setSelectionError(""); }}
                      className={`belmonte-option-card flex min-h-20 min-w-0 flex-col justify-center rounded-lg border p-3 text-left transition ${
                        selected
                          ? "border-[#8a5a2b] bg-[#fdfbf9]"
                          : "border-[#e0d6cb] bg-[#fdfbf9] hover:border-[#8a5a2b]"
                      }`}
                    >
                      <strong className="text-sm text-[#201a17]">{s.label}</strong>
                      <span className="text-xs text-[#7d6f64]">{s.price}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quantity */}
            <div id="product-quantity" className="pt-2">
              <span className="mb-2 block text-base font-semibold text-[#3d342e]">
                Quantidade
              </span>
              <div
                className="flex h-12 items-center justify-between rounded-xl px-1"
                style={{ background: "#f1ece6" }}
              >
                <button
                  type="button"
                  aria-label="Diminuir quantidade"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="grid h-10 w-10 place-items-center rounded-lg text-[#5c5049] transition hover:bg-white/60"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <strong className="text-base font-semibold tabular-nums text-[#201a17]">
                  {qty} {qty === 1 ? "painel" : "painéis"}
                </strong>
                <button
                  type="button"
                  aria-label="Aumentar quantidade"
                  onClick={() => setQty((q) => q + 1)}
                  className="grid h-10 w-10 place-items-center rounded-lg bg-[#201a17] text-white transition hover:bg-[#8a5a2b]"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Purchase */}
            <div id="product-purchase" className="space-y-3">
              <button
                id="primary-buy-button"
                type="button"
                onClick={() => addConfiguredProduct(true)}
                className="w-full rounded-full bg-[#201a17] py-4 text-base font-semibold text-[#f7f3ef] transition hover:bg-[#8a5a2b]"
              >
                Comprar agora
              </button>
              <button
                type="button"
                onClick={() => addConfiguredProduct(false)}
                className="w-full rounded-full border border-[#201a17] py-3.5 text-sm font-semibold transition hover:bg-[#efe7de]"
              >
                Adicionar ao carrinho
              </button>
              <p role="status" className="min-h-5 text-xs font-medium text-[#8a3f2b]">{selectionError}</p>

              <div>
                <p className="mb-2 text-sm font-semibold text-[#201a17]">
                  Pague como preferir
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  {PAYMENT_METHODS.map((m) => (
                    <span
                      key={m.alt}
                      className="inline-flex h-9 items-center rounded-md border border-zinc-200 bg-white px-2.5"
                    >
                      { }
                      <img
                        src={m.src}
                        alt={m.alt}
                        style={{ width: m.width, maxHeight: 19, height: "auto" }}
                      />
                    </span>
                  ))}
                </div>
              </div>

              <div className="border-t border-[#e6ded4] pt-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-[#201a17]">Entrega por</span>
                  { }
                  <img
                    src="/pt/images/logo-ctt-express.svg"
                    alt="CTT Express"
                    style={{ width: 86, height: "auto" }}
                  />
                </div>
                <p className="mt-2 text-xs leading-relaxed text-[#7d6f64]">
                  3 a 7 dias úteis · Envio gratuito para Portugal Continental ·
                  Acompanhamento pela Nuralta
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
