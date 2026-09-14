'use client';

import { useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

export function ProductGallery({
  images,
  productName,
  badge,
}: {
  images: string[];
  productName: string;
  badge?: string | null;
}) {
  const [active, setActive] = useState(0);
  const safeImages = images.length > 0 ? images : ['/images/product-awaiting-media.svg'];
  const mediaPending = safeImages.every((src) => src.includes('product-awaiting-media.svg'));

  return (
    <div>
      <div className="group/main relative aspect-square overflow-hidden rounded-lg border border-border/60 bg-muted/30">
        {safeImages.map((src, i) => (
          <Image
            key={src + i}
            src={src}
            alt={mediaPending ? productName : `${productName} — image ${i + 1} of ${safeImages.length}`}
            fill
            priority={i === 0}
            sizes="(max-width: 1024px) 100vw, 600px"
            className={cn(
              mediaPending ? 'object-contain p-8' : 'object-cover transition-all duration-700 group-hover/main:scale-[1.03]',
              i === active ? 'opacity-100' : 'opacity-0'
            )}
          />
        ))}
        {badge && (
          <span className="absolute left-4 top-4 rounded-full bg-ink/85 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-cream backdrop-blur">
            {badge}
          </span>
        )}
        {safeImages.length > 1 && (
          <span className="absolute bottom-4 right-4 rounded-full bg-background/85 px-2.5 py-1 text-[11px] font-medium tabular-nums text-foreground/75 backdrop-blur">
            {active + 1} / {safeImages.length}
          </span>
        )}
      </div>

      {safeImages.length > 1 && (
        <div
          role="tablist"
          aria-label={`${productName} image gallery`}
          className="mt-3 grid grid-cols-5 gap-2.5"
        >
          {safeImages.map((src, i) => (
            <button
              key={src + i}
              type="button"
              role="tab"
              aria-selected={i === active}
              aria-label={`Show image ${i + 1} of ${safeImages.length}`}
              onClick={() => setActive(i)}
              className={cn(
                'relative aspect-square overflow-hidden rounded-md border bg-muted/40 transition-all duration-200',
                i === active
                  ? 'border-olive ring-1 ring-olive/40'
                  : 'border-border/60 opacity-75 hover:opacity-100 hover:border-ring/50'
              )}
            >
              <Image src={src} alt="" fill sizes="120px" className={mediaPending ? 'object-contain p-2' : 'object-cover'} />
            </button>
          ))}
        </div>
      )}

      <p className="mt-3 text-center text-[11.5px] text-muted-foreground">
        {mediaPending ? 'Product image temporarily unavailable.' : 'Product photography — colours may vary slightly in person.'}
      </p>
    </div>
  );
}
