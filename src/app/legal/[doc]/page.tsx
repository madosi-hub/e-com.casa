import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { LEGAL_LAST_UPDATED, getLegalDocument, legalDocuments } from '@/lib/legal-content';
import { CookieSettingsPanel } from '@/components/legal/cookie-settings-panel';
import { formatDate } from '@/lib/format';

interface LegalDocPageProps {
  params: Promise<{ doc: string }>;
}

export function generateStaticParams() {
  return legalDocuments.map((doc) => ({ doc: doc.slug }));
}

export async function generateMetadata({ params }: LegalDocPageProps): Promise<Metadata> {
  const { doc } = await params;
  const document = getLegalDocument(doc);
  if (!document) return { title: 'Document not found' };
  return {
    title: document.title,
    description: document.description,
    alternates: { canonical: `/legal/${document.slug}` },
  };
}

export default async function LegalDocPage({ params }: LegalDocPageProps) {
  const { doc } = await params;
  const document = getLegalDocument(doc);
  if (!document) notFound();

  const isCookieSettings = document.slug === 'cookie-settings';
  const index = legalDocuments.findIndex((d) => d.slug === document.slug);
  const nextDoc = legalDocuments[(index + 1) % legalDocuments.length];

  return (
    <>
      {/* Hero (solid ink — document page) */}
      <div className="bg-ink">
        <div className="container-ecom flex flex-col items-center py-12 text-center md:py-14">
          <nav aria-label="Breadcrumb" className="text-xs text-white/70">
            <ol className="flex flex-wrap items-center justify-center gap-1.5">
              <li>
                <Link href="/" className="transition-colors hover:text-white">
                  Home
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li>
                <Link href="/legal" className="transition-colors hover:text-white">
                  Legal
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li aria-current="page">{document.title}</li>
            </ol>
          </nav>
          <h1 className="font-display mt-3 text-3xl font-medium tracking-tight text-white md:text-4xl">
            {document.title}
          </h1>
          {document.description && (
            <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-white/70">{document.description}</p>
          )}
        </div>
      </div>

      {/* Document body */}
      <article className="container-ecom py-12 lg:py-16" aria-label={document.title}>
        <div className="mx-auto max-w-3xl">
          <p className="text-[12.5px] uppercase tracking-[0.18em] text-muted-foreground">
            Last updated: {formatDate(LEGAL_LAST_UPDATED)}
          </p>

          {document.intro && (
            <p className="mt-6 text-[15.5px] leading-relaxed text-foreground">{document.intro}</p>
          )}

          {isCookieSettings && (
            <div className="mt-8">
              <CookieSettingsPanel />
            </div>
          )}

          {document.sections.map((section, i) => (
            <section key={i} className="mt-10">
              <h2 className="font-display text-xl font-medium leading-snug tracking-tight sm:text-[22px]">
                {section.heading}
              </h2>
              {section.paragraphs?.map((paragraph, j) => (
                <p key={j} className="mt-3.5 text-[15px] leading-relaxed text-foreground/80">
                  {paragraph}
                </p>
              ))}
              {section.bullets && (
                <ul className="mt-3.5 space-y-2.5 text-[15px] leading-relaxed text-foreground/80">
                  {section.bullets.map((bullet, k) => (
                    <li key={k} className="flex gap-3">
                      <span className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-olive" aria-hidden="true" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}

          <div className="mt-12 flex flex-col gap-4 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
            <Link
              href="/legal"
              className="inline-flex items-center gap-2 text-[13.5px] font-medium text-foreground/80 transition-colors hover:text-olive-deep"
            >
              <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
              All legal documents
            </Link>
            <Link
              href={`/legal/${nextDoc.slug}`}
              className="group inline-flex items-center gap-2 text-[13.5px] font-medium text-foreground/80 transition-colors hover:text-olive-deep"
            >
              Next: {nextDoc.title}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" strokeWidth={1.75} />
            </Link>
          </div>
        </div>
      </article>
    </>
  );
}
