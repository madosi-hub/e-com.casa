import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { SectionHeading } from './section-heading';
import type { Category } from '@/types';

export function ShopBySpace({ spaces }: { spaces: Category[] }) {
  return (
    <section aria-labelledby="shop-by-space" className="bg-cream py-12 lg:py-16">
      <div className="container-ecom">
        <SectionHeading
          title="Shop by Space"
          subtitle="Find the perfect pieces for every corner of your home."
          href="/shop?filter=space"
          linkLabel="View all"
        />
        <div className="no-scrollbar -mx-4 mt-7 flex snap-x snap-mandatory gap-3.5 overflow-x-auto px-4 sm:mx-0 sm:grid sm:grid-cols-4 sm:overflow-visible sm:px-0 lg:grid-cols-7">
          {spaces.map((space) => (
            <Link
              key={space.id}
              href={`/shop?space=${space.slug}`}
              className="group relative aspect-[7/8] w-[68vw] max-w-[280px] shrink-0 snap-start overflow-hidden rounded-md sm:w-auto sm:max-w-none"
              aria-label={`Shop ${space.name}`}
            >
              <div className="relative h-full w-full">
                <Image
                  src={space.image ?? '/images/space-living-room.jpg'}
                  alt={space.name}
                  fill
                  sizes="(max-width: 640px) 68vw, (max-width: 1024px) 25vw, 170px"
                  className="img-zoom object-cover"
                />
                <div
                  className="absolute inset-0 bg-gradient-to-t from-[#14120e]/72 via-[#14120e]/10 to-transparent transition-opacity group-hover:opacity-90"
                  aria-hidden
                />
                <span className="absolute bottom-3 left-3 right-2 flex items-center justify-between text-white">
                  <span className="text-[14px] font-medium tracking-tight">{space.name}</span>
                  <ArrowRight className="h-4 w-4 shrink-0 opacity-90 transition-transform group-hover:translate-x-1" strokeWidth={1.75} />
                </span>
              </div>
            </Link>
          ))}
        </div>
        {/* Mobile view-all */}
        <div className="mt-5 sm:hidden">
          <Link href="/shop?filter=space" className="flex items-center justify-center gap-1.5 text-[13px] font-medium text-foreground/80">
            View all spaces <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
