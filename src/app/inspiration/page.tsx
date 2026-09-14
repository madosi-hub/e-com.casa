import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { InspirationGallery } from '@/components/inspiration/inspiration-gallery';

export const metadata: Metadata = {
  title: 'Inspiration',
  description:
    'Shoppable inspiration for living rooms, bedrooms, gardens and balconies — filter by space or style and shop the looks you love.',
  alternates: { canonical: '/inspiration' },
};

export default function InspirationPage() {
  return (
    <>
      {/* Hero */}
      <div className="relative h-[280px] w-full overflow-hidden bg-ink md:h-[340px]">
        <Image
          src="/images/inspiration-hero.jpg"
          alt="Airy Mediterranean interior with arched doorway opening onto a garden terrace"
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-ink/55" aria-hidden="true" />
        <div className="container-ecom absolute inset-0 flex flex-col items-center justify-center text-center">
          <nav aria-label="Breadcrumb" className="text-xs text-white/70">
            <ol className="flex items-center gap-1.5">
              <li>
                <Link href="/" className="transition-colors hover:text-white">
                  Home
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li aria-current="page">Inspiration</li>
            </ol>
          </nav>
          <h1 className="font-display mt-3 text-3xl font-medium tracking-tight text-white md:text-4xl">
            Inspiration
          </h1>
        </div>
      </div>

      {/* Intro + gallery */}
      <section className="container-ecom py-12 lg:py-16" aria-label="Inspiration gallery">
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow text-muted-foreground">Shoppable inspiration</p>
          <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
            Every look below is shoppable — filter by space or style, find a scene that feels like your home,
            and follow it straight to the pieces that make it work.
          </p>
        </div>

        <InspirationGallery />
      </section>
    </>
  );
}
