'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InspirationItem {
  image: string;
  alt: string;
  title: string;
  tags: string[];
  href: string;
  aspect: string;
}

const FILTERS = ['All', 'Living Room', 'Bedroom', 'Garden', 'Balcony', 'Warm Minimal', 'Japandi'] as const;

const ITEMS: InspirationItem[] = [
  {
    image: '/images/space-living-room.jpg',
    alt: 'Warm minimalist living room with beige linen sofa and oak slat wall',
    title: 'Layers of calm',
    tags: ['Living Room'],
    href: '/shop?space=living-room',
    aspect: 'aspect-[4/3]',
  },
  {
    image: '/images/space-bedroom.jpg',
    alt: 'Serene bedroom with natural wood bed frame and caramel linen throw',
    title: 'A bedroom that breathes',
    tags: ['Bedroom'],
    href: '/shop?space=bedroom',
    aspect: 'aspect-[3/4]',
  },
  {
    image: '/images/space-garden.jpg',
    alt: 'Modern European garden with raised planters, olive trees and lanterns',
    title: 'The five-minute garden glow',
    tags: ['Garden'],
    href: '/shop?space=garden',
    aspect: 'aspect-[4/3]',
  },
  {
    image: '/images/space-balcony.jpg',
    alt: 'Cozy small balcony with deck tiles, bistro chair and potted plants',
    title: 'Four square metres, reconsidered',
    tags: ['Balcony'],
    href: '/shop?space=balcony',
    aspect: 'aspect-square',
  },
  {
    image: '/images/style-warm-minimal.jpg',
    alt: 'Warm minimal corner with cream boucle armchair and dried grass in a vase',
    title: 'Warm minimal, step by step',
    tags: ['Warm Minimal'],
    href: '/shop?style=warm-minimal',
    aspect: 'aspect-square',
  },
  {
    image: '/images/style-japandi.jpg',
    alt: 'Japandi interior with low wooden bench, paper lantern and bonsai',
    title: 'Japandi: quiet by design',
    tags: ['Japandi'],
    href: '/shop?style=japandi',
    aspect: 'aspect-[3/4]',
  },
  {
    image: '/images/collection-wall-makeover.jpg',
    alt: 'Living room wall transformed with vertical oak wood slat panels',
    title: 'One wall, new room',
    tags: ['Living Room', 'Warm Minimal'],
    href: '/shop?space=living-room',
    aspect: 'aspect-[4/3]',
  },
  {
    image: '/images/collection-mood-lighting.jpg',
    alt: 'Living room corner at dusk with warm glowing table lamps and lanterns',
    title: 'Light at hand height',
    tags: ['Living Room'],
    href: '/shop?space=living-room',
    aspect: 'aspect-[3/4]',
  },
  {
    image: '/images/collection-garden-glow.jpg',
    alt: 'Garden at night with glowing solar lanterns along a stone path',
    title: 'After dark in the garden',
    tags: ['Garden'],
    href: '/shop?space=garden',
    aspect: 'aspect-[4/3]',
  },
  {
    image: '/images/collection-balcony-escape.jpg',
    alt: 'Small balcony turned green oasis at sunset with lanterns and string lights',
    title: 'The balcony escape',
    tags: ['Balcony'],
    href: '/shop?space=balcony',
    aspect: 'aspect-[4/3]',
  },
  {
    image: '/images/journal-warm-minimal.jpg',
    alt: 'Warm minimal living room in morning light through linen curtains',
    title: 'Morning light, filtered',
    tags: ['Warm Minimal', 'Living Room'],
    href: '/shop?style=warm-minimal',
    aspect: 'aspect-[16/11]',
  },
  {
    image: '/images/style-natural.jpg',
    alt: 'Natural style corner with rattan armchair and jute rug in daylight',
    title: 'Natural textures first',
    tags: ['Warm Minimal', 'Japandi'],
    href: '/shop?style=natural',
    aspect: 'aspect-[4/3]',
  },
  {
    image: '/images/journal-garden-lighting.jpg',
    alt: 'Garden at blue hour lit in warm layers with lanterns and an uplit tree',
    title: 'Layers, not floods',
    tags: ['Garden'],
    href: '/shop?space=garden',
    aspect: 'aspect-[3/4]',
  },
  {
    image: '/images/journal-balcony-ideas.jpg',
    alt: 'Small balcony makeover with planters, folding furniture and string lights',
    title: 'A better balcony for under €100',
    tags: ['Balcony'],
    href: '/shop?space=balcony',
    aspect: 'aspect-[4/3]',
  },
];

export function InspirationGallery() {
  const [active, setActive] = useState<string>('All');

  const visible = useMemo(
    () => (active === 'All' ? ITEMS : ITEMS.filter((item) => item.tags.includes(active))),
    [active]
  );

  return (
    <div className="mt-10">
      {/* Filter chips */}
      <div
        className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:justify-center sm:px-0"
        role="group"
        aria-label="Filter inspiration by space or style"
      >
        {FILTERS.map((filter) => {
          const isActive = filter === active;
          return (
            <button
              key={filter}
              type="button"
              onClick={() => setActive(filter)}
              aria-pressed={isActive}
              className={
                isActive
                  ? 'shrink-0 rounded-full border border-ink bg-ink px-4 py-2 text-[12.5px] font-medium text-cream transition-colors'
                  : 'shrink-0 rounded-full border border-border bg-card px-4 py-2 text-[12.5px] font-medium text-foreground/75 transition-colors hover:border-olive hover:text-olive-deep'
              }
            >
              {filter}
            </button>
          );
        })}
      </div>

      {/* Masonry-ish grid */}
      <ul className="mt-8 columns-1 gap-4 sm:columns-2 lg:columns-3" aria-live="polite">
        {visible.map((item) => (
          <li key={item.image} className="mb-4 break-inside-avoid">
            <Link
              href={item.href}
              className="group relative block overflow-hidden rounded-md border border-border bg-card transition-shadow hover:shadow-md"
              aria-label={`${item.title} — shop this look`}
            >
              <div className={cn('relative w-full', item.aspect)}>
                <Image
                  src={item.image}
                  alt={item.alt}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="img-zoom object-cover"
                />
                <div
                  className="absolute inset-0 bg-gradient-to-t from-[#14120e]/75 via-transparent to-transparent"
                  aria-hidden="true"
                />
                <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
                  {item.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink backdrop-blur-sm"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="absolute inset-x-0 bottom-0 p-4">
                  <h2 className="font-display text-lg font-medium leading-snug text-white">{item.title}</h2>
                  <p className="mt-1 inline-flex items-center gap-1.5 text-[12px] font-medium text-white/85">
                    Shop this look
                    <ArrowRight
                      className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1"
                      strokeWidth={1.75}
                    />
                  </p>
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {visible.length === 0 && (
        <p className="mt-12 text-center text-[14px] text-muted-foreground">
          No looks in this filter yet — check back soon.
        </p>
      )}

      <p className="mt-6 text-center text-[13px] text-muted-foreground">
        Looking for something specific?{' '}
        <Link href="/shop" className="text-foreground underline underline-offset-2 hover:text-olive">
          Browse the full shop
        </Link>
        .
      </p>
    </div>
  );
}
