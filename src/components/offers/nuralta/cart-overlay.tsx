"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ChevronLeft, ChevronRight, Minus, Plus, ShieldCheck, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart-store";
import { applyBundleOffer } from "@/lib/catalog/bundle";
import { cartStockLimit } from "@/lib/catalog/inventory";
import { formatPrice } from "@/lib/format";
import type { CatalogProduct } from "@/lib/catalog/types";
import { PAYMENT_METHODS } from "./data";

const ACCESSORIES = [
  {
    slug: "nuralta-kit-instalacao-completo",
    kicker: "Para instalar",
    name: "Kit de instalação completo",
    tagline: "Para 1 painel, recomendamos 1 kit",
    dialogTitle: "Tudo o que precisa para instalar",
    bullets: [
      "1 cola de montagem — instala até 3 painéis",
      "Pistola aplicadora reutilizável",
      "Guia para medir e alinhar os cortes",
      "Estilete para acabamento e ajustes",
    ],
    reviews: [
      ["O kit trouxe tudo o que precisava e a montagem ficou pronta numa tarde.", "João M.", "Lisboa"],
      ["A pistola e o guia facilitaram muito o primeiro corte. Recomendo juntar ao painel.", "Marta R.", "Braga"],
    ],
  },
  {
    slug: "nuralta-fita-led-rgb-3m",
    kicker: "Para realçar",
    name: "Fita LED Nuralta + Controlo RGB",
    tagline: "Cor e intensidade ajustáveis",
    dialogTitle: "Crie a iluminação certa",
    bullets: [
      "Fita LED RGB flexível de 3 metros",
      "Cores e intensidade ajustáveis",
      "Controlo tátil Nuralta incluído",
      "Instalação discreta entre as ripas",
    ],
    reviews: [
      ["O controlo é simples e consigo ajustar a cor e a intensidade num instante.", "Tiago S.", "Porto"],
      ["Ficou discreta entre as ripas e o efeito RGB transformou o ambiente.", "Carla F.", "Coimbra"],
    ],
  },
] as const;

type CartOverlayContextValue = { openNuraltaCart: () => void };
const CartOverlayContext = createContext<CartOverlayContextValue | null>(null);

export function useNuraltaCart() {
  const value = useContext(CartOverlayContext);
  if (!value) throw new Error("useNuraltaCart must be used inside NuraltaCartProvider");
  return value;
}

export function NuraltaCartProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const openNuraltaCart = useCallback(() => setOpen(true), []);
  return (
    <CartOverlayContext.Provider value={{ openNuraltaCart }}>
      {children}
      <NuraltaCartOverlay open={open} onClose={() => setOpen(false)} />
    </CartOverlayContext.Provider>
  );
}

function NuraltaCartOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const lines = useCart((state) => state.lines);
  const add = useCart((state) => state.add);
  const remove = useCart((state) => state.remove);
  const setQty = useCart((state) => state.setQty);
  const [catalogProducts, setCatalogProducts] = useState<CatalogProduct[]>([]);
  const [accessories, setAccessories] = useState<CatalogProduct[]>([]);
  const [detailSlug, setDetailSlug] = useState<string | null>(null);
  const cartKey = lines.map((line) => line.slug).join(",");

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let live = true;
    const cartSlugs = [...new Set(lines.map((line) => line.slug))];
    Promise.all(
      cartSlugs.map((slug) =>
        fetch(`/api/products/${encodeURIComponent(slug)}`)
          .then((response) => (response.ok ? response.json() : null))
          .catch(() => null),
      ),
    ).then((rows) => {
      if (live) setCatalogProducts(rows.map((row) => row?.product).filter(Boolean));
    });
    return () => {
      live = false;
    };
  }, [cartKey, lines, open]);

  useEffect(() => {
    if (!open || accessories.length) return;
    let live = true;
    Promise.all(
      ACCESSORIES.map(({ slug }) =>
        fetch(`/api/products/${slug}`)
          .then((response) => (response.ok ? response.json() : null))
          .catch(() => null),
      ),
    ).then((rows) => {
      if (live) setAccessories(rows.map((row) => row?.product).filter(Boolean));
    });
    return () => {
      live = false;
    };
  }, [accessories.length, open]);

  const offeredAccessories = useMemo(
    () => accessories.map((product) => applyBundleOffer(product, catalogProducts)),
    [accessories, catalogProducts],
  );
  const detail = ACCESSORIES.find((item) => item.slug === detailSlug);
  const detailProduct = offeredAccessories.find((product) => product.slug === detailSlug);
  const subtotal = lines.reduce((sum, line) => sum + Number(line.price) * line.quantity, 0);
  const count = lines.reduce((sum, line) => sum + line.quantity, 0);

  if (!open) return null;

  const addAccessory = (product: CatalogProduct) => {
    const variant = product.variants[0];
    const cents = product.priceCents + (variant?.priceDeltaCents ?? 0);
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
  };

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-[#f7f3ef] text-[#201a17]" role="dialog" aria-modal="true" aria-label="O meu carrinho">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-[#e6ded4] bg-[#f7f3ef]/95 px-4 py-3 backdrop-blur sm:px-7">
        <button type="button" onClick={onClose} className="inline-flex items-center gap-2 text-sm font-semibold">
          <ChevronLeft className="h-4 w-4" /> Continuar a comprar
        </button>
        <img src="/pt/images/LOGO_PRETA.webp" alt="Nuralta Interiores" className="h-11 object-contain" />
        <span className="text-sm font-semibold">{count}</span>
      </header>

      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-7 lg:grid-cols-[minmax(0,1fr)_380px] lg:px-6">
        <section>
          <h1 className="belmonte-serif text-3xl sm:text-4xl">O meu carrinho <span className="text-xl text-[#7d6f64]">({count})</span></h1>
          <div className="mt-5 divide-y divide-[#e6ded4] border-y border-[#e6ded4]">
            {lines.map((line) => {
              const key = `${line.slug}|${line.variantId ?? ""}`;
              return (
                <article key={key} className="flex gap-4 py-5">
                  <img src={line.image} alt={line.name} className="h-24 w-20 rounded-lg object-cover sm:h-28 sm:w-24" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{line.quantity}x {line.name.replace(" Nuralta", "")}</p>
                    <p className="mt-1 text-sm text-[#7d6f64]">{line.variantLabel || line.subtitle}</p>
                    <strong className="mt-2 block">{formatPrice(line.price)}</strong>
                    <div className="mt-3 inline-flex items-center rounded-full border border-[#d8cec2] bg-white">
                      <button type="button" aria-label="Diminuir quantidade" onClick={() => setQty(key, line.quantity - 1)} className="p-2"><Minus className="h-4 w-4" /></button>
                      <span className="min-w-8 text-center text-sm font-semibold">{line.quantity}</span>
                      <button type="button" aria-label="Aumentar quantidade" onClick={() => setQty(key, line.quantity + 1)} className="p-2"><Plus className="h-4 w-4" /></button>
                    </div>
                  </div>
                  <button type="button" aria-label={`Remover ${line.name}`} onClick={() => remove(key)} className="self-start rounded-full p-2 text-[#7d6f64]"><Trash2 className="h-4 w-4" /></button>
                </article>
              );
            })}
          </div>

          <h2 className="belmonte-serif mt-8 text-2xl">Complete a sua instalação</h2>
          <div className="mt-3 divide-y divide-[#e6ded4] rounded-xl border border-[#e6ded4] bg-white px-4">
            {offeredAccessories.map((product) => {
              const copy = ACCESSORIES.find((item) => item.slug === product.slug)!;
              const variant = product.variants[0];
              const cents = product.priceCents + (variant?.priceDeltaCents ?? 0);
              return (
                <article key={product.slug} className="py-4">
                  <p className="mb-2 text-[10px] uppercase tracking-[.14em] text-[#8a5a2b]">{copy.kicker}</p>
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => setDetailSlug(product.slug)} className="flex min-w-0 flex-1 items-center gap-3 text-left" aria-label={`Ver detalhes de ${copy.name}`}>
                      <img src={product.image} alt={copy.name} className="h-16 w-16 rounded-lg object-cover" />
                      <span className="min-w-0">
                        <strong className="block text-sm">{copy.name}</strong>
                        <span className="mt-0.5 block text-xs text-[#7d6f64]">{copy.tagline}</span>
                        <span className="mt-1 block text-xs font-semibold underline underline-offset-4">Ver fotos e detalhes</span>
                      </span>
                    </button>
                    <div className="shrink-0 text-right">
                      <strong className="block text-sm">+{formatPrice((cents / 100).toFixed(2))}</strong>
                      <button type="button" onClick={() => addAccessory(product)} className="mt-2 rounded-full border border-[#201a17] px-4 py-2 text-xs font-semibold">Adicionar</button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <aside className="h-fit rounded-2xl border border-[#e0d6cb] bg-white p-5 lg:sticky lg:top-24">
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatPrice(subtotal.toFixed(2))}</dd></div>
            <div className="flex justify-between"><dt>Envio</dt><dd>Grátis</dd></div>
            <div className="flex justify-between border-t border-[#e6ded4] pt-3 text-lg font-bold"><dt>Total</dt><dd>{formatPrice(subtotal.toFixed(2))}</dd></div>
          </dl>
          <button type="button" disabled={!lines.length} onClick={() => { onClose(); router.push("/checkout"); }} className="mt-5 w-full rounded-full bg-[#201a17] py-4 font-semibold text-white disabled:opacity-40">Finalizar encomenda</button>
          <p className="mt-3 text-center text-xs text-[#7d6f64]">Escolha a forma de pagamento no passo seguinte</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2" aria-label="Métodos de pagamento">
            {PAYMENT_METHODS.map((method) => <span key={method.alt} className="inline-flex h-8 items-center rounded border border-zinc-200 px-2"><img src={method.src} alt={method.alt} style={{ width: method.width, maxHeight: 17 }} /></span>)}
          </div>
          <p className="mt-4 flex items-center justify-center gap-2 text-xs font-semibold"><ShieldCheck className="h-4 w-4" /> Compra 100% segura</p>
        </aside>
      </div>

      {detail && detailProduct && <AccessoryDetail product={detailProduct} copy={detail} onClose={() => setDetailSlug(null)} onAdd={() => { addAccessory(detailProduct); setDetailSlug(null); }} />}
    </div>
  );
}

function AccessoryDetail({ product, copy, onClose, onAdd }: { product: CatalogProduct; copy: (typeof ACCESSORIES)[number]; onClose: () => void; onAdd: () => void }) {
  const [index, setIndex] = useState(0);
  const gallery = [product.image, ...product.gallery.split(",").filter(Boolean)];
  const variant = product.variants[0];
  const cents = product.priceCents + (variant?.priceDeltaCents ?? 0);
  const go = (direction: number) => setIndex((current) => (current + direction + gallery.length) % gallery.length);
  return (
    <div className="fixed inset-0 z-[120] grid place-items-center bg-black/60 p-3" role="dialog" aria-modal="true" aria-label={copy.dialogTitle}>
      <div className="max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-[#f7f3ef] p-4 sm:p-6">
        <div className="flex items-start justify-between gap-4"><div><p className="text-xs uppercase tracking-[.14em] text-[#8a5a2b]">{copy.slug.includes("led") ? "RGB · 3 m" : "Instalação completa"}</p><h3 className="belmonte-serif mt-1 text-3xl">{copy.dialogTitle}</h3></div><button type="button" onClick={onClose} aria-label="Fechar detalhes" className="rounded-full border border-[#d8cec2] p-2"><X className="h-5 w-5" /></button></div>
        <div className="relative mt-5 aspect-video overflow-hidden rounded-xl bg-[#e8e0d7]"><img src={gallery[index]} alt={`${copy.name} — imagem ${index + 1}`} className="h-full w-full object-cover" /><button type="button" aria-label="Imagem anterior" onClick={() => go(-1)} className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white p-2"><ChevronLeft className="h-5 w-5" /></button><button type="button" aria-label="Próxima imagem" onClick={() => go(1)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white p-2"><ChevronRight className="h-5 w-5" /></button></div>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">{gallery.map((src, galleryIndex) => <button type="button" key={`${src}-${galleryIndex}`} onClick={() => setIndex(galleryIndex)} className={`h-14 w-14 shrink-0 overflow-hidden rounded-md border-2 ${galleryIndex === index ? "border-[#8a5a2b]" : "border-transparent"}`}><img src={src} alt={`Ver imagem ${galleryIndex + 1}`} className="h-full w-full object-cover" /></button>)}</div>
        <div className="mt-5 grid gap-6 md:grid-cols-2"><div><h4 className="font-semibold">Detalhes {copy.slug.includes("led") ? "da fita LED" : "do kit"}</h4><ul className="mt-3 space-y-2 text-sm text-[#5c5049]">{copy.bullets.map((bullet) => <li key={bullet}>✓ {bullet}</li>)}</ul></div><div><h4 className="font-semibold">Avaliações de clientes em Portugal</h4><div className="mt-3 space-y-3">{copy.reviews.map((review) => { const [body, author, city] = review; return <blockquote key={author} className="rounded-lg bg-white p-3 text-sm"><p>“{body}”</p><footer className="mt-2 text-xs text-[#7d6f64]">{author} · 🇵🇹 {city} · ★★★★★</footer></blockquote>; })}</div></div></div>
        <button type="button" onClick={onAdd} className="mt-6 w-full rounded-full bg-[#201a17] py-4 font-semibold text-white">+{formatPrice((cents / 100).toFixed(2))} · Adicionar {copy.slug.includes("led") ? "fita LED" : "kit"}</button>
      </div>
    </div>
  );
}
