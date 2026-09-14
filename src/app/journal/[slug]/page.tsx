import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { ArrowLeft, Clock, User } from 'lucide-react';
import { journalArticles } from '@/lib/journal-data';
import { formatDate } from '@/lib/format';
import { db } from '@/lib/db';
import { getProduct } from '@/lib/catalog';
import { ProductCard } from '@/components/product/product-card';
import type { Product } from '@/types';

interface ArticlePageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return journalArticles.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = journalArticles.find((a) => a.slug === slug);
  if (!article) return { title: 'Article not found' };
  return {
    title: article.title,
    description: article.excerpt,
    alternates: { canonical: `/journal/${article.slug}` },
    openGraph: {
      title: article.title,
      description: article.excerpt,
      type: 'article',
      publishedTime: article.date,
      authors: [article.author],
    },
  };
}

export default async function JournalArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params;
  const article = journalArticles.find((a) => a.slug === slug);
  if (!article) notFound();

  const related = journalArticles.filter((a) => article.relatedSlugs.includes(a.slug));

  // Real products featured in this article
  let storyProducts: Product[] = [];
  if (article.productSlugs.length > 0) {
    try {
      const resolved = await Promise.all(article.productSlugs.map((s) => getProduct(s)));
      // preserve article order
      storyProducts = resolved.filter((p): p is Product => Boolean(p)) as unknown as Product[];
    } catch {
      storyProducts = [];
    }
  }

  return (
    <>
      {/* Hero */}
      <div className="relative h-[280px] w-full overflow-hidden bg-ink md:h-[340px]">
        <Image
          src={article.image}
          alt={article.title}
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-ink/55" aria-hidden="true" />
        <div className="container-ecom absolute inset-0 flex flex-col items-center justify-center text-center">
          <nav aria-label="Breadcrumb" className="text-xs text-white/70">
            <ol className="flex flex-wrap items-center justify-center gap-1.5">
              <li>
                <Link href="/" className="transition-colors hover:text-white">
                  Home
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li>
                <Link href="/journal" className="transition-colors hover:text-white">
                  Journal
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li aria-current="page">{article.category}</li>
            </ol>
          </nav>
          <p className="eyebrow mt-4 text-[#e8ddc8]">{article.category}</p>
          <h1 className="font-display mx-auto mt-3 max-w-3xl text-3xl font-medium leading-tight tracking-tight text-white md:text-4xl">
            {article.title}
          </h1>
        </div>
      </div>

      {/* Meta */}
      <div className="border-b border-border bg-cream">
        <div className="container-ecom flex flex-wrap items-center justify-center gap-x-6 gap-y-2 py-4 text-[13px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <User className="h-3.5 w-3.5" strokeWidth={1.5} />
            {article.author}
          </span>
          <time dateTime={article.date}>{formatDate(article.date)}</time>
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" strokeWidth={1.5} />
            {article.readingTime} min read
          </span>
        </div>
      </div>

      {/* Article body */}
      <article className="container-ecom py-12 lg:py-16">
        <div className="mx-auto max-w-3xl">
          {article.content.map((block, i) => (
            <section key={i} className={i === 0 ? '' : 'mt-10'}>
              {block.heading && (
                <h2 className="font-display text-[22px] font-medium leading-snug tracking-tight sm:text-2xl">
                  {block.heading}
                </h2>
              )}
              <div className={block.heading ? 'mt-4 space-y-4' : 'space-y-4'}>
                {block.paragraphs.map((paragraph, j) => (
                  <p
                    key={j}
                    className={
                      i === 0
                        ? 'text-[16.5px] leading-relaxed text-foreground'
                        : 'text-[15px] leading-relaxed text-foreground/80'
                    }
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>
          ))}

          <p className="mt-12 border-t border-border pt-6">
            <Link
              href="/journal"
              className="inline-flex items-center gap-2 text-[13.5px] font-medium text-foreground/80 transition-colors hover:text-olive-deep"
            >
              <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
              Back to all articles
            </Link>
          </p>
        </div>
      </article>

      {/* Shop the story */}
      {storyProducts.length > 0 && (
        <section className="bg-cream py-12 lg:py-16" aria-labelledby="shop-the-story">
          <div className="container-ecom">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="eyebrow text-muted-foreground">Shop the story</p>
                <h2 id="shop-the-story" className="font-display mt-3 text-2xl font-medium tracking-tight sm:text-3xl">
                  Pieces used in this article
                </h2>
              </div>
              <Link
                href="/shop"
                className="text-[13px] font-medium text-foreground/70 transition-colors hover:text-foreground"
              >
                View all products →
              </Link>
            </div>
            <ul className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-4">
              {storyProducts.map((p) => (
                <li key={p.slug}>
                  <ProductCard product={p} />
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Related articles */}
      {related.length > 0 && (
        <section className="container-ecom py-12 lg:py-16" aria-labelledby="related-articles">
          <div className="mx-auto max-w-3xl">
            <h2 id="related-articles" className="font-display text-2xl font-medium tracking-tight sm:text-3xl">
              Related articles
            </h2>
          </div>
          <ul className="mt-8 grid gap-8 md:grid-cols-2">
            {related.map((rel) => (
              <li key={rel.slug}>
                <Link href={`/journal/${rel.slug}`} className="group block" aria-label={`Read: ${rel.title}`}>
                  <div className="relative aspect-[16/10] overflow-hidden rounded-md border border-border bg-muted">
                    <Image
                      src={rel.image}
                      alt={rel.title}
                      fill
                      sizes="(max-width: 768px) 100vw, 50vw"
                      className="img-zoom object-cover"
                    />
                    <span className="absolute left-3 top-3 rounded-full bg-white/92 px-3 py-1 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-ink backdrop-blur-sm">
                      {rel.category}
                    </span>
                  </div>
                  <h3 className="font-display mt-4 text-lg font-medium leading-snug tracking-tight transition-colors group-hover:text-olive">
                    {rel.title}
                  </h3>
                  <p className="mt-1.5 line-clamp-2 text-[13.5px] leading-relaxed text-muted-foreground">
                    {rel.excerpt}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
