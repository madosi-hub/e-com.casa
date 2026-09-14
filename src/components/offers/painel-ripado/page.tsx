'use client';

import Link from 'next/link';
import { useLiveProduct } from '@/hooks/use-live-product';
import { campaignEuro } from './data';
import { useEffect, useState } from 'react';
import { House, Menu, PackageSearch, ShoppingCart, X } from 'lucide-react';
import { useCartDrawer } from '@/lib/cart-drawer-store';
import { captureOfferAttribution } from '@/lib/offers/attribution';
import { trackOfferEvent } from '@/lib/offers/analytics';
import type { CatalogProduct } from '@/lib/catalog/types';
import type { OfferConfig, OfferMarketContext } from '@/lib/offers/types';
import { PanelConfigurator } from './configurator';
import { PanelCampaignStory, PanelFaq, PanelFooter, PanelInspiration, PanelProductDetails, PanelReviews } from './sections';

export function TopTicker() {
  const items = ['Portes grátis PT e ES · Europa acima de 50 €', 'Pagamento seguro com Cartão · Apple Pay · MB WAY · Multibanco', 'Entrega acompanhada', 'E-com.casa'];
  const group = <div className="flex shrink-0 items-center gap-6 px-3 sm:gap-8 sm:px-4">{items.map((item) => <span key={item} className="flex items-center gap-6 whitespace-nowrap sm:gap-8"><span>{item}</span><span className="opacity-40">◆</span></span>)}</div>;
  return <div className="overflow-hidden bg-[#201a17] py-1 text-[#e9dfd5] sm:py-2"><div className="ecom-panel-ticker flex w-max text-[9px] uppercase tracking-[.12em] sm:text-[11px]">{group}{group}</div></div>;
}

export function FloatingHeader() {
  const [visible, setVisible] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const openCart = useCartDrawer((state) => state.open);
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return <>
    <div className="fixed inset-x-0 top-0 z-40 transition-all duration-200" style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(-100%)', visibility: visible ? 'visible' : 'hidden', pointerEvents: visible ? 'auto' : 'none' }}>
      <header className="flex items-center justify-between border-b border-[#e6ded4] bg-[#f7f3ef]/95 px-4 py-2 backdrop-blur">
        <button type="button" aria-label="Abrir menu" onClick={() => setDrawerOpen(true)} className="rounded-full p-1.5"><Menu className="h-4 w-4" /></button>
        <Link href="/" className="font-display text-xl font-semibold tracking-tight">E-com.casa</Link>
        <button type="button" aria-label="Carrinho" onClick={openCart} className="rounded-full p-1.5"><ShoppingCart className="h-4 w-4" /></button>
      </header>
    </div>
    <div className={`fixed inset-0 z-50 ${drawerOpen ? '' : 'pointer-events-none'}`} aria-hidden={!drawerOpen}>
      <div onClick={() => setDrawerOpen(false)} className={`absolute inset-0 bg-black/50 transition-opacity ${drawerOpen ? 'opacity-100' : 'opacity-0'}`} />
      <aside className={`absolute left-0 top-0 h-full w-[300px] bg-white shadow-2xl transition-transform ${drawerOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between border-b px-5 py-4"><Link href="/" className="font-display text-xl font-semibold">E-com.casa</Link><button type="button" onClick={() => setDrawerOpen(false)} aria-label="Fechar menu"><X className="h-5 w-5" /></button></div>
        <nav className="p-3"><a href="#top" onClick={() => setDrawerOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-3.5 text-sm"><House className="h-5 w-5" />Início</a><Link href="/orders" className="flex items-center gap-3 rounded-xl px-3 py-3.5 text-sm"><PackageSearch className="h-5 w-5" />As minhas encomendas</Link><Link href="/offers" className="flex items-center gap-3 rounded-xl px-3 py-3.5 text-sm">Ofertas em curso</Link></nav>
      </aside>
    </div>
  </>;
}

export function PainelRipadoOfferPage({ offer, product: initialProduct, market }: { offer: OfferConfig; product: CatalogProduct; market: OfferMarketContext }) {
  const product = useLiveProduct(initialProduct);
  useEffect(() => {
    captureOfferAttribution(offer.slug);
    trackOfferEvent('offer_view', { offerSlug: offer.slug, productSlug: product.slug, country: market.countryCode, locale: market.locale });
    trackOfferEvent('product_view', { offerSlug: offer.slug, productSlug: product.slug, country: market.countryCode });
  }, [market.countryCode, market.locale, offer.slug, product.slug]);

  return <main id="top" className="min-h-screen overflow-x-hidden bg-[#f7f3ef] text-[#201a17]">
    <style jsx global>{`
      @keyframes ecomPanelTicker { to { transform: translateX(-50%); } }
      .ecom-panel-ticker { animation: ecomPanelTicker 26s linear infinite; }
      @media (prefers-reduced-motion: reduce) { .ecom-panel-ticker { animation: none; } }
    `}</style>
    <TopTicker />
    <FloatingHeader />
    <PanelConfigurator product={product} offer={offer} market={market} />
    <PanelCampaignStory product={product} />
    <PanelProductDetails product={product} />
    <PanelInspiration product={product} />
    <PanelReviews offer={offer} product={product} />
    <PanelFaq offer={offer} />
    <PanelFooter market={market} />
    <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-3 border-t border-[#d8cec2] bg-[#f7f3ef]/95 px-4 py-3 shadow-[0_-8px_24px_rgba(32,26,23,.14)] backdrop-blur sm:hidden"><div><span className="block text-[10px] text-[#7d6f64]">Oferta desde</span><strong>{campaignEuro(product.priceCents)}</strong></div><a href="#configurar-painel" className="rounded-full bg-[#201a17] px-6 py-3 text-sm font-semibold text-white">Comprar agora</a></div>
  </main>;
}
