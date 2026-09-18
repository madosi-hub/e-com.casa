"use client";

import { useEffect, useState } from "react";
import type { CatalogProduct } from "@/lib/catalog/types";
import type { OfferConfig, OfferMarketContext } from "@/lib/offers/types";
import { captureOfferAttribution } from "@/lib/offers/attribution";
import { trackOfferEvent } from "@/lib/offers/analytics";
import { TopTicker } from "./top-ticker";
import { Header } from "./header";
import { ProductConfigurator } from "./product-configurator";
import { Transformation } from "./transformation";
import { ProductDetails } from "./product-details";
import { Inspiration } from "./inspiration";
import { Reviews } from "./reviews";
import { Faq } from "./faq";
import { Footer } from "./footer";
import { MobileBuyBar } from "./mobile-buy-bar";
import { NuraltaCartProvider } from "./cart-overlay";

function FactoryPrice() {
  return (
    <section id="preco-fabrica" className="bg-[#201a17] px-4 py-12 text-[#f7f3ef] sm:px-6">
      <div className="mx-auto max-w-6xl">
        <p className="text-[11px] font-bold uppercase tracking-[.14em] text-[#c79a68]">Preço de fábrica</p>
        <h2 className="mt-3 font-display text-4xl font-normal leading-tight">Do fabricante.<br />Para a sua casa.</h2>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-[#cbbbaf]">Produto Nuralta com configuração, carrinho e checkout centralizados pela E-com.casa.</p>
      </div>
    </section>
  );
}

export function NuraltaPainelRipadoOfferPage({
  offer,
  product,
  market,
}: {
  offer: OfferConfig;
  product: CatalogProduct;
  market: OfferMarketContext;
}) {
  const [showMobileBuyBar, setShowMobileBuyBar] = useState(false);

  useEffect(() => {
    captureOfferAttribution(offer.slug);
    trackOfferEvent("offer_view", {
      offerSlug: offer.slug,
      productSlug: product.slug,
      country: market.countryCode,
      locale: market.locale,
    });
    trackOfferEvent("product_view", {
      offerSlug: offer.slug,
      productSlug: product.slug,
      country: market.countryCode,
    });
  }, [market.countryCode, market.locale, offer.slug, product.slug]);

  useEffect(() => {
    const updateMobileBuyBar = () => {
      const primaryButton = document.getElementById("primary-buy-button");
      if (!primaryButton) {
        setShowMobileBuyBar(false);
        return;
      }
      setShowMobileBuyBar(primaryButton.getBoundingClientRect().bottom < 0);
    };

    updateMobileBuyBar();
    window.addEventListener("scroll", updateMobileBuyBar, { passive: true });
    window.addEventListener("resize", updateMobileBuyBar);
    return () => {
      window.removeEventListener("scroll", updateMobileBuyBar);
      window.removeEventListener("resize", updateMobileBuyBar);
    };
  }, []);

  return (
    <NuraltaCartProvider>
      <main id="top" className="nuralta-funnel min-h-screen overflow-x-hidden bg-[#f7f3ef] text-[#201a17]">
        <TopTicker />
        <Header />
        <ProductConfigurator product={product} offer={offer} />
        <FactoryPrice />
        <Transformation />
        <ProductDetails />
        <Inspiration />
        <Reviews />
        <Faq />
        <Footer />
        {showMobileBuyBar && <MobileBuyBar />}
      </main>
    </NuraltaCartProvider>
  );
}
