import Link from 'next/link';
import Image from 'next/image';
import { SectionHeading } from './section-heading';
import type { Category } from '@/types';

export function ShopByStyle({ styles }: { styles: Category[] }) {
  return (
    <section aria-labelledby="shop-by-style" className="border-b border-border/60 bg-background py-12 lg:py-16">
      <div className="container-ecom grid items-center gap-8 lg:grid-cols-[240px_1fr]">
        <div>
          <SectionHeading
            title="Shop by Style"
            subtitle="Find the look that feels like home."
          />
          <Link
            href="/shop?filter=style"
            className="group mt-4 hidden items-center gap-1.5 text-[13px] font-medium text-foreground/80 hover:text-foreground lg:flex"
          >
            View all styles
            <span className="transition-transform group-hover:translate-x-0.5">→</span>
          </Link>
        </div>
        <div className="no-scrollbar -mx-4 flex snap-x gap-6 overflow-x-auto px-4 pb-1 sm:grid sm:grid-cols-4 sm:overflow-visible sm:px-0 md:grid-cols-7 lg:gap-5">
          {styles.map((style) => (
            <Link
              key={style.id}
              href={`/shop?style=${style.slug}`}
              className="group flex w-[96px] shrink-0 snap-start flex-col items-center gap-3 text-center sm:w-auto"
              aria-label={`Shop ${style.name} style`}
            >
              <span className="relative block h-[92px] w-[92px] overflow-hidden rounded-full ring-1 ring-border transition-all duration-300 group-hover:ring-2 group-hover:ring-olive lg:h-[104px] lg:w-[104px]">
                <Image
                  src={style.image ?? '/images/style-warm-minimal.jpg'}
                  alt=""
                  fill
                  sizes="104px"
                  className="img-zoom object-cover"
                />
              </span>
              <span className="text-[13px] font-medium leading-tight text-foreground/85 transition-colors group-hover:text-foreground">
                {style.name}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
