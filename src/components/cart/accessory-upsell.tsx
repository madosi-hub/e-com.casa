'use client';
import { applyBundleOffer, rankAccessories } from '@/lib/catalog/bundle';
import { useEffect, useId, useState } from 'react';
import { Plus, Wrench } from 'lucide-react';
import type { CatalogProduct } from '@/lib/catalog/types';
import { useCart } from '@/lib/cart-store';
import { cartStockLimit } from '@/lib/catalog/inventory';
import { applyCommerce } from '@/lib/catalog/commerce';
import { formatPrice } from '@/lib/format';

const NURALTA_ACCESSORY_SLUGS = ['nuralta-kit-instalacao-completo', 'nuralta-fita-led-rgb-3m'];

function NuraltaAccessoryUpsell({ cartProducts }: { cartProducts: CatalogProduct[] }) {
  const add = useCart(s => s.add);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  useEffect(() => {
    let live = true;
    Promise.all(NURALTA_ACCESSORY_SLUGS.map(slug => fetch(`/api/products/${slug}`).then(r => r.ok ? r.json() : null).catch(() => null)))
      .then(rows => { if (live) setProducts(rows.map(row => row?.product).filter(Boolean)); });
    return () => { live = false; };
  }, []);

  return <section className="my-4 rounded-xl border border-[#e6ded4] bg-[#fdfbf9] p-4" aria-label="Complete a sua instalação">
    <h3 className="text-sm font-bold text-[#201a17]">Complete a sua instalação</h3>
    <div className="mt-3 divide-y divide-[#e6ded4]">
      {products.length === 0 && <p className="py-3 text-xs text-[#7d6f64]">A carregar acessórios Nuralta…</p>}
      {products.map(raw => {
        const product = applyBundleOffer(raw, cartProducts);
        const variant = product.variants[0];
        const cents = product.priceCents + (variant?.priceDeltaCents ?? 0);
        const regularCents = (product.regularPriceCents ?? product.priceCents) + (variant?.regularPriceDeltaCents ?? variant?.priceDeltaCents ?? 0);
        const gallery = [product.image, ...product.gallery.split(',').filter(Boolean)];
        const installation = product.slug.includes('kit-instalacao');
        return <article key={product.slug} className="py-4 first:pt-1 last:pb-1">
          <div className="flex gap-3">
            <img src={product.image} alt={product.name} className="h-16 w-16 shrink-0 rounded-lg object-cover" />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-[.12em] text-[#8a5a2b]">{installation ? 'Para instalar' : 'Para realçar'}</p>
              <h4 className="mt-0.5 text-sm font-semibold text-[#201a17]">{product.name.replace(' Nuralta', '')}</h4>
              <p className="mt-0.5 text-xs text-[#7d6f64]">{installation ? 'Para 1 painel, recomendamos 1 kit' : 'Cor e intensidade ajustáveis'}</p>
              <div className="mt-1 flex items-baseline gap-2">
                <strong className="text-sm text-[#201a17]">+{formatPrice((cents / 100).toFixed(2))}</strong>
                {cents < regularCents && <><span className="text-[11px] text-[#8d8178] line-through">{formatPrice((regularCents / 100).toFixed(2))}</span><span className="text-[10px] font-bold text-[#4d7d44]">−{product.promoDiscountPct}%</span></>}
              </div>
            </div>
            <button type="button" className="self-center rounded-full border border-[#201a17] px-3 py-2 text-xs font-semibold" onClick={() => add({ slug: product.slug, brand: product.brand, categorySlug: product.categorySlug, name: product.name, subtitle: product.subtitle, price: (cents / 100).toFixed(2), image: product.image, automaticDiscountPct: product.promoDiscountPct, promoEndsAt: product.promoEndsAt, maxStock: cartStockLimit(product), variantId: variant?.id, variantLabel: variant?.name })}>+ Adicionar</button>
          </div>
          <details className="ml-[76px] mt-2 text-xs text-[#5c5049]">
            <summary className="cursor-pointer font-semibold underline underline-offset-4">Ver fotos e detalhes</summary>
            <p className="mt-2 leading-5">{product.description}</p>
            <div className="mt-2 flex gap-2 overflow-x-auto pb-1">{gallery.map((src, index) => <img key={`${src}-${index}`} src={src} alt={`${product.name} — imagem ${index + 1}`} className="h-20 w-20 shrink-0 rounded-lg object-cover" loading="lazy" />)}</div>
          </details>
        </article>;
      })}
    </div>
  </section>;
}

export function AccessoryUpsell() {
  const id = useId();
  const cartKey = useCart(s => s.lines.map(l => l.slug).join(','));
  const [cartProducts, setCartProducts] = useState<CatalogProduct[]>([]);
  useEffect(() => { let live = true; Promise.all([...new Set(cartKey.split(',').filter(Boolean))].map(slug => fetch(`/api/products/${encodeURIComponent(slug)}`).then(r => r.ok ? r.json() : null).catch(() => null))).then(rows => { if (live) setCartProducts(rows.map(r=>r?.product).filter(Boolean)); }); return () => { live = false; }; }, [cartKey]);
  const add = useCart(s => s.add);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [selected, setSelected] = useState('');
  const [variantId, setVariantId] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const raw = products.find(p => p.slug === selected);
  const product = raw ? applyBundleOffer(raw, cartProducts) : null;
  const variant = product?.variants.find(v => v.id === variantId) ?? product?.variants[0];
  const cents = product ? product.priceCents + (variant?.priceDeltaCents ?? 0) : 0;
  const hasNuraltaProduct = cartProducts.some(product => product.slug === 'nuralta-painel-ripado-decorativo');
  async function load() {
    if (loaded || loading) return;
    setLoading(true); setStatus('');
    try {
      const first = await fetch('/api/products?category=acessorios-instalacao&perPage=48').then(r => { if (!r.ok) throw Error(); return r.json(); });
      const rest = await Promise.all(Array.from({ length: Math.max(0, first.totalPages - 1) }, (_, i) => fetch(`/api/products?category=acessorios-instalacao&perPage=48&page=${i + 2}`).then(r => { if (!r.ok) throw Error(); return r.json(); })));
      setProducts([first, ...rest].flatMap(p => p.products).filter(p => p.canPurchase)); setLoaded(true);
    } catch { setStatus('Não foi possível carregar. Feche e volte a abrir para tentar novamente.'); }
    finally { setLoading(false); }
  }
  if (hasNuraltaProduct) return <NuraltaAccessoryUpsell cartProducts={cartProducts} />;
  return <details className="my-4 rounded-xl border border-olive/20 bg-olive/5 p-4" onToggle={e => { if (e.currentTarget.open) void load(); }}>
    <summary className="cursor-pointer text-sm font-semibold"><Wrench className="mr-2 inline h-4 w-4" />Complete a instalação</summary>
    <p className="my-3 text-xs text-muted-foreground">Acessórios e produtos de instalação, vendidos separadamente. Marcas da sua encomenda aparecem primeiro. Em setembro, ao juntar a um produto principal: −75% sobre o catálogo, sem acumulação. Confirme a compatibilidade.</p>
    <label htmlFor={id} className="sr-only">Escolher acessório</label>
    <select id={id} className="h-11 w-full rounded-md border bg-background px-2 text-sm" value={selected} onChange={e => { setSelected(e.target.value); setVariantId(''); setStatus(''); }} disabled={loading}>
      <option value="">{loading ? 'A carregar…' : 'Escolher um acessório'}</option>
      {rankAccessories(products, cartProducts).map(p => <option key={p.slug} value={p.slug}>{p.name} · {formatPrice(applyBundleOffer(p, cartProducts).price)}</option>)}
    </select>
    {product && <div className="mt-3 space-y-3">
      {product.variants.length > 1 && <select aria-label="Opção do acessório" className="h-11 w-full rounded-md border bg-background px-2 text-sm" value={variant?.id} onChange={e => setVariantId(e.target.value)}>{product.variants.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}</select>}
      <a className="block text-xs underline" href={`/product/${product.slug}`} target="_blank" rel="noreferrer">Ver detalhes e compatibilidade</a>
      <button type="button" className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-olive text-sm font-semibold text-white" onClick={() => {
        add({ slug: product.slug, brand: product.brand, categorySlug: product.categorySlug, name: product.name, subtitle: product.subtitle, price: (cents / 100).toFixed(2), image: product.image, automaticDiscountPct: product.promoDiscountPct, promoEndsAt: product.promoEndsAt, maxStock: cartStockLimit(product), variantId: variant?.id, variantLabel: variant?.name }); setStatus('Adicionado ao carrinho.');
      }}><Plus className="h-4 w-4" />Adicionar · {formatPrice((cents / 100).toFixed(2))}</button>
    </div>}
    <p role="status" className="mt-2 text-xs">{status}</p>
  </details>;
}
