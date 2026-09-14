"use client";

import { useEffect } from "react";
import type { CatalogProduct } from "@/lib/catalog/types";
import type { OfferConfig, OfferMarketContext } from "@/lib/offers/types";
import { captureOfferAttribution } from "@/lib/offers/attribution";
import { trackOfferEvent } from "@/lib/offers/analytics";
import { TopTicker } from "./top-ticker";
import { Header } from "./header";
import { ProductConfigurator } from "./product-configurator";
import { FactoryPrice } from "./factory-price";
import { Transformation } from "./transformation";
import { ProductDetails } from "./product-details";
import { Inspiration } from "./inspiration";
import { Reviews } from "./reviews";
import { Faq } from "./faq";
import { Footer } from "./footer";
import { MobileBuyBar } from "./mobile-buy-bar";
import { NuraltaCartProvider } from "./cart-overlay";

export function NuraltaPainelRipadoOfferPage({
  offer,
  product,
  market,
}: {
  offer: OfferConfig;
  product: CatalogProduct;
  market: OfferMarketContext;
}) {
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
        <MobileBuyBar />
      </main>
    </NuraltaCartProvider>
  );
}
