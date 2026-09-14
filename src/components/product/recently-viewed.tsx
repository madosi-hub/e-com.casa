'use client';

import { useEffect, useState } from 'react';
import { useRecentlyViewed } from '@/lib/recently-viewed-store';
import { ProductCard } from '@/components/product/product-card';
import { useT } from '@/hooks/use-t';
import type { Product } from '@/types';

export function RecentlyViewed({ excludeSlug }: { excludeSlug?: string }) {
  const t = useT();
  const { slugs, hydrated } = useRecentlyViewed();
  const [products, setProducts] = useState<Product[] | null>(null);

  const relevant = hydrated ? slugs.filter((s) => s !== excludeSlug).slice(0, 4) : [];

  useEffect(() => {
    if (!hydrated || relevant.length === 0) return;
    let cancelled = false;
    Promise.all(
      relevant.map((slug) =>
        fetch(`/api/products/${slug}`)
          .then((r) => (r.ok ? r.json() : null))
          .then((d) => (d?.product ? d.product : null))
          .catch(() => null)
      )
    ).then((results) => {
      if (!cancelled) setProducts(results.filter(Boolean));
    });
    return () => {
      cancelled = true;
    };
  }, [hydrated, relevant.join(',')]);

  const visible = relevant.length === 0 ? [] : products;

  if (!hydrated || visible === null || visible.length === 0) return null;

  return (
    <section aria-labelledby="recently-viewed-heading" className="mt-16 border-t border-border pt-12">
      <div className="flex items-end justify-between">
        <h2 id="recently-viewed-heading" className="font-display text-[24px] font-medium">
          {t('recently.title')}
        </h2>
      </div>
      <div className="no-scrollbar -mx-4 mt-6 flex snap-x gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-4 sm:overflow-visible sm:px-0">
        {visible.map((p) => (
          <div key={p.id} className="w-[46vw] max-w-[220px] shrink-0 snap-start sm:w-auto sm:max-w-none">
            <ProductCard product={p} />
          </div>
        ))}
      </div>
    </section>
  );
}
