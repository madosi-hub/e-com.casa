import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, FileText, Hourglass, Info, Leaf, Package, RefreshCw, SearchCheck } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Sustainability',
  description:
    'Our approach to better materials, longer-lasting choices, packaging, responsible sourcing and continuous improvement.',
  alternates: { canonical: '/sustainability' },
};

const PILLARS = [
  {
    icon: Leaf,
    title: 'Better materials',
    text: 'We aim to favour materials chosen for durability and honest ageing — solid wood, natural fibres and ceramics, alongside responsibly produced alternatives. Where a material has known environmental trade-offs, we aim to say so in the product description rather than gloss over it.',
  },
  {
    icon: Hourglass,
    title: 'Longer-lasting choices',
    text: 'The most sustainable product is often the one you do not have to replace. We aim to select pieces designed to be used for years: timeless shapes, replaceable parts where possible, and care instructions that help products age well.',
  },
  {
    icon: Package,
    title: 'Packaging',
    text: 'We aim to protect your order with as little material as we reasonably can — recyclable cardboard and paper fillers, with plastic only where it is genuinely needed to protect a product. As our logistics setup matures, we aim to reduce single-use plastic packaging further.',
  },
  {
    icon: SearchCheck,
    title: 'Responsible sourcing',
    text: 'We aim to work with manufacturers and suppliers who can show where and how their products are made. As we grow, we intend to formalise supplier standards and to publish more detail about our sourcing practices.',
  },
  {
    icon: FileText,
    title: 'Product information',
    text: 'Clear information helps people choose well and care for things properly. We aim to describe materials, dimensions, care and safety information accurately on every product page — and to keep improving that information over time.',
  },
  {
    icon: RefreshCw,
    title: 'Continuous improvement',
    text: 'We do not claim to have all the answers. We aim to review our assortment, packaging and partners regularly, to set measurable goals, and to update this page honestly as we make progress — and where we fall short.',
  },
];

export default function SustainabilityPage() {
  return (
    <>
      {/* Hero */}
      <div className="relative h-[280px] w-full overflow-hidden bg-ink md:h-[340px]">
        <Image
          src="/images/sustainability-hero.jpg"
          alt="Natural materials flat lay with oak samples, linen, stone and paper packaging"
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
              <li aria-current="page">Sustainability</li>
            </ol>
          </nav>
          <h1 className="font-display mt-3 text-3xl font-medium tracking-tight text-white md:text-4xl">
            Sustainability
          </h1>
        </div>
      </div>

      {/* Intro */}
      <section className="container-ecom pt-12 lg:pt-16" aria-labelledby="sustainability-intro">
        <div className="mx-auto max-w-3xl text-center">
          <p className="eyebrow text-muted-foreground">Our approach</p>
          <h2 id="sustainability-intro" className="font-display mt-3 text-2xl font-medium tracking-tight sm:text-3xl">
            Progress we can stand behind
          </h2>
          <p className="mt-5 text-[15px] leading-relaxed text-foreground/80">
            Home is where habits are made — and small, better-made choices, repeated across thousands of homes,
            can add up to something meaningful. We are at the beginning of that journey. Rather than promising
            what we cannot yet prove, this page describes what we aim to do, what we are already doing, and what
            still needs work.
          </p>
        </div>

        {/* Cautious wording notice */}
        <div className="mx-auto mt-8 max-w-3xl rounded-md border border-border bg-cream p-4 sm:p-5" role="note">
          <div className="flex gap-3">
            <Info className="mt-0.5 h-4.5 w-4.5 shrink-0 text-olive" strokeWidth={1.5} />
            <p className="text-[13px] leading-relaxed text-foreground/75">
              <span className="font-medium text-foreground">A note on our wording.</span> This page describes our
              current approach and intentions. It is not a certification, and we do not label our products or
              operations as “eco-friendly”, “green” or “sustainable” without substantiation. Any future claim
              will only appear when it can be evidenced.
            </p>
          </div>
        </div>
      </section>

      {/* Pillars */}
      <section className="container-ecom py-12 lg:py-16" aria-label="Our sustainability focus areas">
        <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {PILLARS.map((pillar, i) => (
            <li key={pillar.title} className="flex h-full flex-col rounded-md border border-border bg-card p-6 transition-shadow hover:shadow-sm">
              <div className="flex items-center justify-between">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent">
                  <pillar.icon className="h-5 w-5 text-olive" strokeWidth={1.5} />
                </span>
                <span className="font-display text-sm text-muted-foreground/70" aria-hidden="true">
                  {String(i + 1).padStart(2, '0')}
                </span>
              </div>
              <h3 className="font-display mt-4 text-lg font-medium">{pillar.title}</h3>
              <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">{pillar.text}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* What you can expect */}
      <section className="bg-cream py-12 lg:py-16" aria-labelledby="expectations-title">
        <div className="container-ecom">
          <div className="grid gap-10 lg:grid-cols-[280px_1fr] lg:gap-16">
            <div>
              <p className="eyebrow text-muted-foreground">In the meantime</p>
              <h2 id="expectations-title" className="font-display mt-3 text-2xl font-medium tracking-tight sm:text-3xl">
                What you can expect from us
              </h2>
            </div>
            <div className="max-w-3xl space-y-4 text-[15px] leading-relaxed text-foreground/80">
              <p>
                Honest product descriptions that name the material, the origin where we know it, and the care the
                product needs — because information is the foundation of a longer product life.
              </p>
              <p>
                Designs chosen to stay relevant, not to follow a season — and safety and compliance information
                that meets European product standards, described openly on our{' '}
                <Link href="/legal/product-safety" className="underline underline-offset-2 hover:text-olive">
                  Product Safety page
                </Link>
                .
              </p>
              <p>
                And transparency about the gaps: where a detail is still being set up, we mark it as pending
                rather than dressing it up. If you have questions about any material or product, write to us —
                real questions help us decide what to improve first.
              </p>
              <Link
                href="/about#story"
                className="group mt-2 inline-flex items-center gap-2 text-[14px] font-medium text-foreground underline-offset-4 hover:underline"
              >
                Read our story
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" strokeWidth={1.75} />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
