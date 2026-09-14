import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { JournalIndex } from '@/components/journal/journal-index';
import { journalArticles, JOURNAL_CATEGORIES } from '@/lib/journal-data';

export const metadata: Metadata = {
  title: 'Journal',
  description: 'Ideas, tips and the latest trends for your home and garden — from the E-com.casa studio.',
  alternates: { canonical: '/journal' },
};

export default function JournalPage() {
  return (
    <>
      {/* Hero */}
      <div className="relative h-[280px] w-full overflow-hidden bg-ink md:h-[340px]">
        <Image
          src="/images/journal-banner.jpg"
          alt="Moody garden at dusk with lush plants and warm lantern light"
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
              <li aria-current="page">Journal</li>
            </ol>
          </nav>
          <h1 className="font-display mt-3 text-3xl font-medium tracking-tight text-white md:text-4xl">Journal</h1>
        </div>
      </div>

      {/* Intro + index */}
      <section className="container-ecom py-12 lg:py-16" aria-label="Journal articles">
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow text-muted-foreground">Your home. Your garden. Our inspiration.</p>
          <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
            Explore our Journal for ideas, tips and the latest trends — practical guides most people can do in
            an afternoon.
          </p>
        </div>

        <JournalIndex articles={journalArticles} categories={JOURNAL_CATEGORIES} />
      </section>
    </>
  );
}
