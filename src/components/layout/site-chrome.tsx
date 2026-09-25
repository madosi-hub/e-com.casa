'use client';

import { usePathname } from 'next/navigation';
import { PromotionInfo } from './promotion-info';
import { SiteHeader } from '@/components/layout/site-header';
import { SiteFooter } from '@/components/layout/site-footer';
import { CheckoutFooter, CheckoutHeader } from '@/components/checkout/checkout-chrome';
import { panelOfferPath, panelOfferSlugFromPathname } from '@/lib/offers/route-policy';

export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const panelOfferSlug = panelOfferSlugFromPathname(pathname);
  const offerCheckoutRoute = Boolean(panelOfferSlug && pathname.startsWith(panelOfferPath(panelOfferSlug, '/checkout')));
  const offerInformationRoute = Boolean(panelOfferSlug && pathname.startsWith(panelOfferPath(panelOfferSlug, '/informacao/')));
  const offerChromeRoute = offerCheckoutRoute || offerInformationRoute;
  const selfContainedRoute = pathname.startsWith('/offers/') || pathname.startsWith('/admin');

  return (
    <div className={offerChromeRoute ? 'flex min-h-screen flex-col bg-[#f7f3ef]' : 'flex min-h-screen flex-col'}>
      {offerChromeRoute && <CheckoutHeader />}
      {!selfContainedRoute && <SiteHeader />}
      {!selfContainedRoute && <PromotionInfo />}
      <main id="main-content" className="flex-1">{children}</main>
      {!selfContainedRoute && <SiteFooter />}
      {offerChromeRoute && <CheckoutFooter />}
    </div>
  );
}
