'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Clock } from 'lucide-react';
import { formatDate } from '@/lib/format';
import type { JournalArticle } from '@/lib/journal-data';

export function JournalIndex({ articles, categories }: { articles: JournalArticle[]; categories: string[] }) {
  const [active, setActive] = useState<string>('All');

  // Only show chips for categories that actually have articles,
  // ordered according to the shared JOURNAL_CATEGORIES list.
  const chips = useMemo(() => {
    const present = new Set(articles.map((a) => a.category));
    return categories.filter((c) => present.has(c));
  }, [articles, categories]);

  const visible = active === 'All' ? articles : articles.filter((a) => a.category === active);

  return (
    <div className="mt-10">
      {/* Category filter chips */}
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:justify-center sm:px-0" role="group" aria-label="Filter articles by category">
        {(['All', ...chips] as string[]).map((chip) => {
          const isActive = chip === active;
          return (
            <button
              key={chip}
              type="button"
              onClick={() => setActive(chip)}
              aria-pressed={isActive}
              className={
                isActive
                  ? 'shrink-0 rounded-full border border-ink bg-ink px-4 py-2 text-[12.5px] font-medium text-cream transition-colors'
                  : 'shrink-0 rounded-full border border-border bg-card px-4 py-2 text-[12.5px] font-medium text-foreground/75 transition-colors hover:border-olive hover:text-olive-deep'
              }
            >
              {chip}
            </button>
          );
        })}
      </div>

      {/* Article cards */}
      <ul className="mt-8 grid gap-8 md:grid-cols-2" aria-live="polite">
        {visible.map((article) => (
          <li key={article.slug}>
            <Link
              href={`/journal/${article.slug}`}
              className="group block rounded-md"
              aria-label={`Read: ${article.title}`}
            >
              <div className="relative aspect-[16/10] overflow-hidden rounded-md border border-border bg-muted">
                <Image
                  src={article.image}
                  alt={article.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="img-zoom object-cover"
                />
                <span className="absolute left-3 top-3 rounded-full bg-white/92 px-3 py-1 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-ink backdrop-blur-sm">
                  {article.category}
                </span>
              </div>
              <div className="pt-5">
                <h2 className="font-display text-xl font-medium leading-snug tracking-tight transition-colors group-hover:text-olive sm:text-[22px]">
                  {article.title}
                </h2>
                <p className="mt-2 line-clamp-2 text-[14px] leading-relaxed text-muted-foreground">
                  {article.excerpt}
                </p>
                <p className="mt-3 flex items-center gap-3 text-[12.5px] text-muted-foreground">
                  <span>{formatDate(article.date)}</span>
                  <span aria-hidden="true" className="h-0.5 w-0.5 rounded-full bg-muted-foreground/60" />
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" strokeWidth={1.5} />
                    {article.readingTime} min read
                  </span>
                  <span className="ml-auto inline-flex items-center gap-1 font-medium text-foreground/80 transition-colors group-hover:text-olive-deep">
                    Read
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" strokeWidth={1.75} />
                  </span>
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {visible.length === 0 && (
        <p className="mt-12 text-center text-[14px] text-muted-foreground">
          No articles in this category yet — new stories are on the way.
        </p>
      )}
    </div>
  );
}
