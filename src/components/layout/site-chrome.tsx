'use client';

import { usePathname } from 'next/navigation';
import { PromotionInfo } from './promotion-info';
import { SiteHeader } from '@/components/layout/site-header';
import { SiteFooter } from '@/components/layout/site-footer';

export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const selfContainedRoute = pathname.startsWith('/offers/') || pathname.startsWith('/admin');

  return (
    <div className="flex min-h-screen flex-col">
      {!selfContainedRoute && <SiteHeader />}
      {!selfContainedRoute && <PromotionInfo />}
      <main id="main-content" className="flex-1">{children}</main>
      {!selfContainedRoute && <SiteFooter />}
    </div>
  );
}
