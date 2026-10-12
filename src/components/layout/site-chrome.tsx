'use client';

import { usePathname } from 'next/navigation';
import { PromotionInfo } from './promotion-info';
import { SiteHeader } from '@/components/layout/site-header';
import { SiteFooter } from '@/components/layout/site-footer';
import { CheckoutFooter, CheckoutHeader } from '@/components/checkout/checkout-chrome';
import { dedicatedOfferPath, dedicatedOfferSlugFromPathname, isFadoOfferSlug } from '@/lib/offers/route-policy';
import { isLightingProductPath } from '@/lib/catalog/lighting';

export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const offerSlug = dedicatedOfferSlugFromPathname(pathname);
  const offerCheckoutRoute = Boolean(offerSlug && pathname.startsWith(dedicatedOfferPath(offerSlug, '/checkout')));
  const offerInformationRoute = Boolean(offerSlug && pathname.startsWith(dedicatedOfferPath(offerSlug, '/informacao/')));
  const offerChromeRoute = offerCheckoutRoute || offerInformationRoute;
  const selfContainedRoute = pathname.startsWith('/offers/') || pathname.startsWith('/admin') || isLightingProductPath(pathname);

  return (
    <div className={offerChromeRoute ? `flex min-h-screen flex-col ${isFadoOfferSlug(offerSlug) ? 'bg-[#faf9f5] [font-family:var(--font-manrope)]' : 'bg-[#f7f3ef]'}` : 'flex min-h-screen flex-col'}>
      {offerChromeRoute && <CheckoutHeader />}
      {!selfContainedRoute && <SiteHeader />}
      {!selfContainedRoute && <PromotionInfo />}
      <main id="main-content" className="flex-1">{children}</main>
      {!selfContainedRoute && <SiteFooter />}
      {offerChromeRoute && <CheckoutFooter />}
    </div>
  );
}
