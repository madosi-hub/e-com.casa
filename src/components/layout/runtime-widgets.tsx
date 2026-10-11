'use client';

import { usePathname } from 'next/navigation';
import { ChatWidget } from '@/components/chat/chat-widget';
import { CartDrawer } from '@/components/cart/cart-drawer';
import { CartPriceSync } from '@/components/cart/cart-price-sync';
import { LanguageBoot } from '@/hooks/use-t';
import { useCartDrawer } from '@/lib/cart-drawer-store';
import { UtmifyTracking } from '@/components/analytics/utmify-tracking';
import { UmamiTracking } from '@/components/analytics/umami-tracking';
import { FADO_OFFER_ALIAS, FADO_OFFER_SLUG, panelOfferSlugFromPathname } from '@/lib/offers/route-policy';
import { isLightingProductPath } from '@/lib/catalog/lighting';

export function RuntimeWidgets() {
  const pathname = usePathname();
  const painelRipadoRoute = panelOfferSlugFromPathname(pathname) !== null;
  const dedicatedOfferRoute = painelRipadoRoute || [FADO_OFFER_SLUG, FADO_OFFER_ALIAS].some(slug => pathname === `/offers/${slug}`) || isLightingProductPath(pathname);
  const chatEnabled = process.env.NEXT_PUBLIC_CHAT_ENABLED !== 'false';
  const cartDrawerOpen = useCartDrawer((state) => state.isOpen);
  const chatHidden = cartDrawerOpen || pathname === '/cart' || pathname.startsWith('/checkout') || dedicatedOfferRoute;
  if (pathname.startsWith('/admin')) return null;

  return (
    <>
      {chatEnabled && !chatHidden && <ChatWidget />}
      <CartDrawer />
      <CartPriceSync />
      <UtmifyTracking />
      <UmamiTracking />
      {!dedicatedOfferRoute && <LanguageBoot />}
    </>
  );
}
