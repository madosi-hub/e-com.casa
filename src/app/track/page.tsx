import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { TrackView } from './track-view';

export const metadata: Metadata = {
  title: 'Track Your Order',
  description:
    'Enter your tracking number and follow your E-com.casa parcel from our EU 3PL warehouse to your door — live status, delivery journey and estimated delivery.',
  alternates: { canonical: '/track' },
};

export default function TrackPage() {
  return (
    <>
      {/* Hero */}
      <div className="relative h-[280px] w-full overflow-hidden bg-ink md:h-[340px]">
        <div className="absolute inset-0 bg-gradient-to-br from-ink via-ink to-olive-deep" aria-hidden="true" />
        <div className="container-ecom absolute inset-0 flex flex-col items-center justify-center text-center">
          <nav aria-label="Breadcrumb" className="text-xs text-white/70">
            <ol className="flex items-center gap-1.5">
              <li>
                <Link href="/" className="transition-colors hover:text-white">
                  Home
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li aria-current="page">Track</li>
            </ol>
          </nav>
          <h1 className="font-display mt-3 text-3xl font-medium tracking-tight text-white md:text-4xl">
            Track Your Order
          </h1>
          <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-white/70">
            Follow your parcel from our EU 3PL warehouse to your door.
          </p>
        </div>
      </div>

      <Suspense fallback={<div className="container-ecom py-16 text-center text-[14px] text-muted-foreground">Loading tracking…</div>}>
        <TrackView />
      </Suspense>
    </>
  );
}
