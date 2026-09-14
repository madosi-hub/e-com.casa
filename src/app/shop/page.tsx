import { Suspense } from 'react';
import type { Metadata } from 'next';
import { ShopClient } from '@/components/product/shop-client';
import { CatalogCategoryStrip } from '@/components/product/catalog-category-strip';
import { Skeleton } from '@/components/ui/skeleton';
import { getCategories } from '@/lib/catalog';
import type { CatalogCategory } from '@/lib/catalog/types';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Shop — Revestimentos, Painéis Acústicos & Acessórios',
  description:
    'Explore o catálogo E-com.casa com revestimentos ODEM-PT e sistemas WoodUpp, incluindo painéis ripados, WPC, SPC, rodapés, sancas, painéis acústicos e acessórios.',
  alternates: { canonical: '/shop' },
};

export default async function ShopPage() {
  let categories: CatalogCategory[] = [];
  try {
    categories = await getCategories('shop');
  } catch {
    categories = [];
  }

  return (
    <>
      <CatalogCategoryStrip categories={categories} />
      <Suspense
        fallback={
          <div className="container-ecom py-10">
            <Skeleton className="h-9 w-48" />
            <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="aspect-square w-full rounded-md" />
              ))}
            </div>
          </div>
        }
      >
        <ShopClient categories={categories} />
      </Suspense>
    </>
  );
}
