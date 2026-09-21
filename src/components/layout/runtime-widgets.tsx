'use client';

import { usePathname } from 'next/navigation';
import { CookieConsent } from '@/components/cookie/cookie-consent';
import { ChatWidget } from '@/components/chat/chat-widget';
import { CartDrawer } from '@/components/cart/cart-drawer';
import { CartPriceSync } from '@/components/cart/cart-price-sync';
import { LanguageBoot } from '@/hooks/use-t';
import { useCartDrawer } from '@/lib/cart-drawer-store';

export function RuntimeWidgets() {
  const pathname = usePathname();
  const painelRipadoRoute = pathname.startsWith('/offers/painel-ripado');
  const chatEnabled = process.env.NEXT_PUBLIC_CHAT_ENABLED !== 'false';
  const cartDrawerOpen = useCartDrawer((state) => state.isOpen);
  const chatHidden = cartDrawerOpen || pathname === '/cart' || pathname.startsWith('/checkout') || painelRipadoRoute;
  if (pathname.startsWith('/admin')) return null;

  return (
    <>
      <CookieConsent />
      {chatEnabled && !chatHidden && <ChatWidget />}
      <CartDrawer />
      <CartPriceSync />
      {!painelRipadoRoute && <LanguageBoot />}
    </>
  );
}
