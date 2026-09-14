import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { SectionHeading } from './section-heading';
import { ProductCard } from '@/components/product/product-card';
import type { Product } from '@/types';

export function BestSellers({ products }: { products: Product[] }) {
  return (
    <section aria-labelledby="best-sellers" className="bg-background py-12 lg:py-16">
      <div className="container-ecom">
        <SectionHeading
          title="Best Sellers"
          subtitle="Loved by our customers. Ready for your home."
          href="/shop?sort=best"
          linkLabel="View all best sellers"
        />
        <div className="no-scrollbar -mx-4 mt-7 flex snap-x gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 lg:grid-cols-6">
          {products.map((p, i) => (
            <div key={p.id} className="w-[46vw] max-w-[220px] shrink-0 snap-start sm:w-auto sm:max-w-none">
              <ProductCard product={p} priority={i < 2} />
            </div>
          ))}
        </div>
        <div className="mt-6 text-center sm:hidden">
          <Link href="/shop?sort=best" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-foreground/80">
            View all best sellers <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
