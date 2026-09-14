'use client';

import { usePathname } from 'next/navigation';
import { CookieConsent } from '@/components/cookie/cookie-consent';
import { ChatWidget } from '@/components/chat/chat-widget';
import { CartDrawer } from '@/components/cart/cart-drawer';
import { CartPriceSync } from '@/components/cart/cart-price-sync';
import { LanguageBoot } from '@/hooks/use-t';

export function RuntimeWidgets() {
  const pathname = usePathname();
  const chatEnabled = process.env.NEXT_PUBLIC_CHAT_ENABLED !== 'false';
  if (pathname.startsWith('/admin')) return null;

  return (
    <>
      <CookieConsent />
      {chatEnabled && <ChatWidget />}
      <CartDrawer />
      <CartPriceSync />
      <LanguageBoot />
    </>
  );
}
