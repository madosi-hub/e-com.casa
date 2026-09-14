'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Heart, Share2, Check } from 'lucide-react';
import { ProductCard } from '@/components/product/product-card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useWishlist } from '@/lib/wishlist-store';
import { useT } from '@/hooks/use-t';
import type { Product } from '@/types';

export default function WishlistPage() {
  const t = useT();
  const wishlist = useWishlist();
  const [products, setProducts] = useState<Product[] | null>(null);
  const [shared, setShared] = useState(false);
  const [importedCount, setImportedCount] = useState(0);
  const importedRef = useRef(false);
  const hydrated = wishlist.hydrated;
  const slugs = wishlist.slugs;
  const slugKey = slugs.join(',');

  // Import a shared list once: /wishlist?items=slug-a,slug-b
  useEffect(() => {
    if (!hydrated || importedRef.current) return;
    importedRef.current = true;
    const params = new URLSearchParams(window.location.search);
    const raw = params.get('items');
    if (!raw) return;
    const incoming = raw.split(',').map((s) => s.trim()).filter(Boolean);
    const fresh = incoming.filter((s) => !wishlist.slugs.includes(s));
    if (fresh.length > 0) {
      wishlist.addMany(incoming);
      // Defer UI state out of the effect body (set-state-in-effect rule)
      window.setTimeout(() => {
        setImportedCount(fresh.length);
        window.setTimeout(() => setImportedCount(0), 6000);
      }, 0);
    }
    // Clean the URL so refreshing doesn't re-import
    window.history.replaceState({}, '', window.location.pathname);
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated || slugs.length === 0) return;
    let cancelled = false;
    Promise.all(
      slugs.map((slug) =>
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
  }, [hydrated, slugKey]);

  const copyShareLink = async () => {
    const url = `${window.location.origin}/wishlist?items=${slugs.join(',')}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt('Copy your wishlist link:', url);
    }
    setShared(true);
    window.setTimeout(() => setShared(false), 2500);
  };

  const isEmpty = hydrated && slugs.length === 0;
  const visible: Product[] = isEmpty ? [] : products ?? [];

  if (!hydrated) {
    return (
      <div className="container-ecom py-10">
        <Skeleton className="h-9 w-40" />
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-md" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container-ecom py-10 lg:py-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[28px] font-medium tracking-tight sm:text-[32px]">{t('wishlist.title')}</h1>
          <p className="mt-1 text-[13.5px] text-muted-foreground">
            {visible.length === 0 ? t('wishlist.savedAppear') : t('wishlist.savedCount', { n: visible.length, word: visible.length === 1 ? 'piece' : 'pieces' })}
          </p>
        </div>
        {slugs.length > 0 && (
          <Button
            type="button"
            variant="outline"
            onClick={copyShareLink}
            className="min-h-[44px] gap-2 rounded-md"
            aria-label={t('wishlist.shareAria')}
          >
            {shared ? (
              <>
                <Check className="h-4 w-4 text-olive" strokeWidth={2} /> {t('wishlist.linkCopied')}
              </>
            ) : (
              <>
                <Share2 className="h-4 w-4" strokeWidth={1.75} /> {t('wishlist.shareWishlist')}
              </>
            )}
          </Button>
        )}
      </div>

      {importedCount > 0 && (
        <div
          role="status"
          className="mt-4 flex items-center gap-2 rounded-md border border-olive/25 bg-olive/5 px-4 py-2.5 text-[13px] text-olive"
        >
          <Check className="h-4 w-4" strokeWidth={2} />
          {t('wishlist.imported', { n: importedCount })}
        </div>
      )}

      {visible.length === 0 ? (
        <div className="mt-12 rounded-lg border border-border bg-cream/50 px-6 py-16 text-center">
          <Heart className="mx-auto h-9 w-9 text-muted-foreground" strokeWidth={1.25} />
          <p className="font-display mt-5 text-[20px]">{t('wishlist.emptyTitle')}</p>
          <p className="mx-auto mt-2 max-w-sm text-[13.5px] text-muted-foreground">
            {t('wishlist.emptyDescLong')}
          </p>
          <Button asChild className="mt-6 rounded-md bg-primary px-7">
            <Link href="/shop">{t('wishlist.discover')}</Link>
          </Button>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
          {visible.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
