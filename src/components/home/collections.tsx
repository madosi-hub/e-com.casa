import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';

const COLLECTIONS = [
  {
    pill: 'Walls & Panels',
    title: 'Wall Makeover',
    subtitle: 'Modern panels. Instant impact.',
    image: '/images/collection-wall-makeover.jpg',
    href: '/shop?collection=wall-makeover',
    alt: 'Living room wall with oak slat panels behind the TV',
  },
  {
    pill: 'Lighting',
    title: 'Mood Lighting',
    subtitle: 'Set the mood, indoors and out.',
    image: '/images/collection-mood-lighting.jpg',
    href: '/shop?collection=mood-lighting',
    alt: 'Warm glowing table lamps in a living room corner at dusk',
  },
  {
    pill: 'Outdoor',
    title: 'Garden Glow',
    subtitle: 'Beautiful spaces, day and night.',
    image: '/images/collection-garden-glow.jpg',
    href: '/shop?collection=garden-glow',
    alt: 'Garden path lit by solar lanterns at night',
  },
  {
    pill: 'Small Spaces',
    title: 'Balcony Escape',
    subtitle: 'More life. Less space required.',
    image: '/images/collection-balcony-escape.jpg',
    href: '/shop?collection=balcony-escape',
    alt: 'Small balcony turned green oasis at sunset',
  },
];

export function Collections() {
  return (
    <section aria-labelledby="collections" className="bg-cream py-12 lg:py-16">
      <h2 id="collections" className="sr-only">
        Transformation collections
      </h2>
      <div className="container-ecom grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {COLLECTIONS.map((c) => (
          <Link
            key={c.title}
            href={c.href}
            className="group relative block aspect-[4/5] overflow-hidden rounded-md sm:aspect-[3/3.4]"
            aria-label={`${c.title} — ${c.subtitle}`}
          >
            <Image
              src={c.image}
              alt={c.alt}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 300px"
              className="img-zoom object-cover"
            />
            <div
              className="absolute inset-0 bg-gradient-to-t from-[#100e0a]/78 via-[#100e0a]/22 to-transparent"
              aria-hidden
            />
            <div className="absolute inset-x-0 bottom-0 p-4 text-white lg:p-5">
              <span className="inline-block rounded-full border border-white/25 bg-white/10 px-2.5 py-1 text-[9.5px] font-semibold uppercase tracking-[0.16em] backdrop-blur">
                {c.pill}
              </span>
              <h3 className="font-display mt-2.5 text-[22px] font-medium tracking-tight lg:text-[24px]">
                {c.title}
              </h3>
              <p className="mt-1 text-[12.5px] leading-snug text-white/75">{c.subtitle}</p>
              <span className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] font-semibold underline-offset-4 group-hover:underline">
                Shop now
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" strokeWidth={2} />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
