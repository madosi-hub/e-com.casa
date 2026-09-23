'use client';

import { usePathname } from 'next/navigation';
import { ChatWidget } from '@/components/chat/chat-widget';
import { CartDrawer } from '@/components/cart/cart-drawer';
import { CartPriceSync } from '@/components/cart/cart-price-sync';
import { LanguageBoot } from '@/hooks/use-t';
import { useCartDrawer } from '@/lib/cart-drawer-store';
import { UtmifyTracking } from '@/components/analytics/utmify-tracking';
import { UmamiTracking } from '@/components/analytics/umami-tracking';
import { panelOfferSlugFromPathname } from '@/lib/offers/route-policy';

export function RuntimeWidgets() {
  const pathname = usePathname();
  const painelRipadoRoute = panelOfferSlugFromPathname(pathname) !== null;
  const chatEnabled = process.env.NEXT_PUBLIC_CHAT_ENABLED !== 'false';
  const cartDrawerOpen = useCartDrawer((state) => state.isOpen);
  const chatHidden = cartDrawerOpen || pathname === '/cart' || pathname.startsWith('/checkout') || painelRipadoRoute;
  if (pathname.startsWith('/admin')) return null;

  return (
    <>
      {chatEnabled && !chatHidden && <ChatWidget />}
      <CartDrawer />
      <CartPriceSync />
      <UtmifyTracking />
      <UmamiTracking />
      {!painelRipadoRoute && <LanguageBoot />}
    </>
  );
}
