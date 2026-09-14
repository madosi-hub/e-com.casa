import Link from 'next/link';
import type { CatalogCategory } from '@/lib/catalog/types';

export function CatalogCategoryStrip({ categories }: { categories: CatalogCategory[] }) {
  if (!categories.length) return null;

  return (
    <section className="border-b border-border/70 bg-cream/35" aria-label="Product categories">
      <div className="container-ecom overflow-x-auto py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <nav className="flex min-w-max items-center gap-2">
          <Link
            href="/shop"
            className="rounded-full border border-border bg-background px-4 py-2 text-[12px] font-medium text-foreground transition hover:border-olive/50 hover:text-olive"
          >
            Todos
          </Link>
          {categories.map((category) => (
            <Link
              key={category.id || category.slug}
              href={`/shop?category=${encodeURIComponent(category.slug)}`}
              title={category.subtitle ?? undefined}
              className="rounded-full border border-border bg-background px-4 py-2 text-[12px] font-medium text-foreground/80 transition hover:border-olive/50 hover:text-olive"
            >
              {category.name}
            </Link>
          ))}
        </nav>
      </div>
    </section>
  );
}
