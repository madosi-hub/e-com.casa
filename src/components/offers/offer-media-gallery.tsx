'use client';

import Image from 'next/image';
import { Play } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { CatalogProduct } from '@/lib/catalog/types';
import type { OfferConfig, OfferMediaItem } from '@/lib/offers/types';
import { cn } from '@/lib/utils';

interface ImageMedia {
  type: 'image';
  src: string;
  label?: string;
}

type GalleryMedia = ImageMedia | OfferMediaItem;

function dedupeImages(items: Array<string | null | undefined>): ImageMedia[] {
  return [...new Set(items.filter((item): item is string => Boolean(item)))].map((src) => ({ type: 'image' as const, src }));
}

export function OfferMediaGallery({ offer, product, videoLabel }: { offer: OfferConfig; product: CatalogProduct; videoLabel: string }) {
  const media = useMemo<GalleryMedia[]>(() => {
    const images = dedupeImages([
      product.image,
      product.hoverImage,
      ...(product.gallery ? product.gallery.split(',').map((item) => item.trim()) : []),
    ]);
    return [...images, ...(offer.media ?? [])];
  }, [offer.media, product.gallery, product.hoverImage, product.image]);

  const [active, setActive] = useState(0);
  const current = media[active] ?? media[0];

  return (
    <div>
      <div className="relative aspect-[4/4.45] overflow-hidden rounded-2xl bg-muted/40 sm:aspect-[4/3.9] lg:aspect-[4/4.15]">
        {current?.type === 'video' ? (
          <video
            key={current.src}
            src={current.src}
            poster={current.poster ?? product.image}
            className="h-full w-full object-cover"
            autoPlay
            muted
            loop
            playsInline
            controls
            preload="metadata"
            aria-label={current.label ?? videoLabel}
          />
        ) : current ? (
          <Image
            src={current.src}
            alt={product.name}
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 56vw"
            className="object-cover transition-transform duration-700 hover:scale-[1.015]"
          />
        ) : null}
        <span className="absolute left-4 top-4 rounded-full bg-background/90 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] backdrop-blur">
          {offer.eyebrow}
        </span>
        {current?.type === 'video' && (
          <span className="pointer-events-none absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-ink/80 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-cream backdrop-blur">
            <Play className="h-3 w-3 fill-current" /> {current.label ?? videoLabel}
          </span>
        )}
      </div>

      {media.length > 1 && (
        <div className="mt-3 grid grid-cols-5 gap-2 sm:grid-cols-6">
          {media.slice(0, 6).map((item, index) => (
            <button
              key={`${item.type}-${item.src}`}
              type="button"
              onClick={() => setActive(index)}
              className={cn(
                'relative aspect-square overflow-hidden rounded-lg border bg-muted/30 transition',
                active === index ? 'border-olive ring-1 ring-olive/30' : 'border-border hover:border-olive/40',
              )}
              aria-label={item.type === 'video' ? `${videoLabel} ${index + 1}` : `Imagem ${index + 1}`}
            >
              <Image
                src={item.type === 'video' ? (item.poster ?? product.image) : item.src}
                alt=""
                fill
                sizes="120px"
                className="object-cover"
              />
              {item.type === 'video' && (
                <span className="absolute inset-0 grid place-items-center bg-ink/15">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-background/90 shadow-sm">
                    <Play className="ml-0.5 h-3.5 w-3.5 fill-current text-ink" />
                  </span>
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {current?.type === 'video' && (current.attribution || current.disclaimer) && (
        <p className="mt-2 text-[10.5px] leading-relaxed text-muted-foreground">
          {[current.disclaimer, current.attribution].filter(Boolean).join(' · ')}
        </p>
      )}
    </div>
  );
}
