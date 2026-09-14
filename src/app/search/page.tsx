'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, ArrowRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ProductCard } from '@/components/product/product-card';
import { Skeleton } from '@/components/ui/skeleton';
import { SEARCH_SUGGESTIONS } from '@/lib/constants';
import type { Product } from '@/types';

function SearchClient() {
  const params = useSearchParams();
  const router = useRouter();
  const initialQ = params.get('q') ?? '';
  const [query, setQuery] = useState(initialQ);
  const [fetchResult, setFetchResult] = useState<{ key: string; products: Product[] } | null>(null);
  const loading = initialQ !== '' && fetchResult?.key !== initialQ;
  const products = fetchResult?.key === initialQ ? fetchResult.products : null;

  // Sync input when the URL query changes (render-time adjustment)
  const [prevInitial, setPrevInitial] = useState(initialQ);
  if (prevInitial !== initialQ) {
    setPrevInitial(initialQ);
    setQuery(initialQ);
  }

  useEffect(() => {
    if (!initialQ) return;
    let cancelled = false;
    fetch(`/api/search?q=${encodeURIComponent(initialQ)}`)
      .then((r) => r.json())
      .then((d) => !cancelled && setFetchResult({ key: initialQ, products: d.products ?? [] }))
      .catch(() => !cancelled && setFetchResult({ key: initialQ, products: [] }));
    return () => {
      cancelled = true;
    };
  }, [initialQ]);

  return (
    <div className="container-ecom py-10 lg:py-14">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="font-display text-[28px] font-medium tracking-tight sm:text-[32px]">Search</h1>
        <form
          className="relative mt-6"
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            router.replace(`/search?q=${encodeURIComponent(query)}`);
          }}
        >
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-muted-foreground" strokeWidth={1.75} />
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for products, categories, styles..."
            aria-label="Search"
            className="h-13 rounded-full border-input bg-muted/50 pl-12 pr-28 text-[15px]"
            style={{ height: 52 }}
          />
          <button
            type="submit"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full bg-primary px-5 py-2 text-[13px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Search
          </button>
        </form>

        {!initialQ && (
          <div className="mt-7">
            <p className="eyebrow text-muted-foreground">Popular searches</p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {SEARCH_SUGGESTIONS.map((s) => (
                <Link
                  key={s}
                  href={`/search?q=${encodeURIComponent(s)}`}
                  className="rounded-full border border-border bg-card px-4 py-2 text-[13px] text-foreground/80 transition-colors hover:border-olive hover:text-olive"
                >
                  {s}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {loading && (
        <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-md" />
          ))}
        </div>
      )}

      {!loading && initialQ && products && (
        <div className="mt-12">
          <p className="text-[13.5px] text-muted-foreground" aria-live="polite">
            {products.length === 0
              ? `No results for “${initialQ}”.`
              : `${products.length} ${products.length === 1 ? 'result' : 'results'} for “${initialQ}”`}
          </p>
          {products.length === 0 ? (
            <div className="mt-6 rounded-lg border border-border bg-cream/50 px-6 py-12 text-center">
              <p className="font-display text-[19px]">Try a different word</p>
              <p className="mt-2 text-[13.5px] text-muted-foreground">
                Or browse the full collection — everything is one click away.
              </p>
              <Link href="/shop" className="mt-5 inline-flex items-center gap-1.5 text-[13.5px] font-medium text-olive hover:underline">
                Browse all products <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      )}

      {!initialQ && (
        <div className="mt-16">
          <h2 className="font-display text-center text-[22px] font-medium">Or start from a best seller</h2>
          <BestSellerStrip />
        </div>
      )}
    </div>
  );
}

function BestSellerStrip() {
  const [products, setProducts] = useState<Product[]>([]);
  useEffect(() => {
    fetch('/api/products?sort=best&perPage=4')
      .then((r) => r.json())
      .then((d) => setProducts(d.products ?? []))
      .catch(() => {});
  }, []);
  return (
    <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
      {products.map((p) => (
        <Link key={p.id} href={`/product/${p.slug}`} className="group text-center">
          <div className="relative aspect-square overflow-hidden rounded-md border border-border/60">
            <Image src={p.image} alt={p.name} fill sizes="220px" className="img-zoom object-cover" />
          </div>
          <p className="mt-2.5 line-clamp-1 text-[13px] font-medium">{p.name}</p>
        </Link>
      ))}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="container-ecom py-14">
          <Skeleton className="mx-auto h-9 w-40" />
          <Skeleton className="mx-auto mt-8 h-12 w-full max-w-2xl rounded-full" />
        </div>
      }
    >
      <SearchClient />
    </Suspense>
  );
}
