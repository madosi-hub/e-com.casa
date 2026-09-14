import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Accessibility,
  ArrowRight,
  BadgeCheck,
  Building2,
  Cookie,
  FileSignature,
  FileText,
  Lock,
  MessageSquareWarning,
  RotateCcw,
  Scale,
  Settings2,
  ShieldCheck,
  Truck,
  Users,
} from 'lucide-react';
import { legalDocuments } from '@/lib/legal-content';
import { COMPANY } from '@/lib/company';

export const metadata: Metadata = {
  title: 'Legal',
  description:
    'Legal documents for e-com.casa: legal notice, terms & conditions, privacy, cookies, returns, shipping, warranty, product safety, accessibility and more.',
  alternates: { canonical: '/legal' },
};

const ICONS: Record<string, typeof FileText> = {
  notice: Building2,
  terms: FileText,
  privacy: Lock,
  cookies: Cookie,
  'cookie-settings': Settings2,
  returns: RotateCcw,
  shipping: Truck,
  warranty: ShieldCheck,
  'product-safety': BadgeCheck,
  accessibility: Accessibility,
  complaints: MessageSquareWarning,
  'dispute-resolution': Scale,
  impressum: FileSignature,
  'consumer-rights': Users,
};

export default function LegalHubPage() {
  return (
    <>
      {/* Hero (solid ink — document hub) */}
      <div className="bg-ink">
        <div className="container-ecom flex flex-col items-center py-12 text-center md:py-14">
          <nav aria-label="Breadcrumb" className="text-xs text-white/70">
            <ol className="flex items-center gap-1.5">
              <li>
                <Link href="/" className="transition-colors hover:text-white">
                  Home
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li aria-current="page">Legal</li>
            </ol>
          </nav>
          <h1 className="font-display mt-3 text-3xl font-medium tracking-tight text-white md:text-4xl">Legal</h1>
          <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-white/70">
            The documents that govern the e-com.casa shop and website — written to be read, not just filed.
          </p>
        </div>
      </div>

      {/* Document grid */}
      <section className="container-ecom py-12 lg:py-16" aria-label="Legal documents">
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {legalDocuments.map((doc) => {
            const Icon = ICONS[doc.slug] ?? FileText;
            return (
              <li key={doc.slug}>
                <Link
                  href={`/legal/${doc.slug}`}
                  className="group flex h-full flex-col rounded-md border border-border bg-card p-6 transition-shadow hover:shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent">
                      <Icon className="h-5 w-5 text-olive" strokeWidth={1.5} />
                    </span>
                    <ArrowRight
                      className="h-4 w-4 text-muted-foreground/50 transition-all group-hover:translate-x-1 group-hover:text-olive"
                      strokeWidth={1.5}
                    />
                  </div>
                  <h2 className="font-display mt-4 text-lg font-medium leading-snug">{doc.title}</h2>
                  <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">{doc.description}</p>
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="mx-auto mt-12 max-w-3xl rounded-md border border-border bg-cream p-5">
          <p className="text-[13px] leading-relaxed text-foreground/75">
            <span className="font-medium text-foreground">About placeholders.</span> Some documents contain
            marked values such as [TO BE COMPLETED] for the VAT number, telephone line, mediator, returns address
            or hosting provider. These are pending final business configuration and will be completed before
            go-live — they are never filled with invented data.
          </p>
          <p className="mt-3 text-[13px] leading-relaxed text-foreground/75">
            {COMPANY.brand} is operated by {COMPANY.legalName}, company number {COMPANY.companyNumber},{' '}
            {COMPANY.registeredOffice.city}, {COMPANY.registeredOffice.country}.
          </p>
        </div>
      </section>
    </>
  );
}
