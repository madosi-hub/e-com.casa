import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, BadgeCheck, Compass, HeartHandshake, Mail, MessagesSquare, Warehouse } from 'lucide-react';
import { EMAILS, COMPANY } from '@/lib/company';

export const metadata: Metadata = {
  title: 'About Us',
  description:
    'E-com.casa is a European home and garden brand built around one simple idea: small changes can transform the way a space feels.',
  alternates: { canonical: '/about' },
};

const VALUES = [
  {
    icon: Compass,
    title: 'Curated, not crowded',
    text: 'We keep the range deliberately small, so every product has a reason to be there — chosen for material, function and character rather than novelty.',
  },
  {
    icon: BadgeCheck,
    title: 'Honest information',
    text: 'Clear descriptions, dimensions and pricing. We would rather say a claim is still a work in progress than make one we cannot support.',
  },
  {
    icon: HeartHandshake,
    title: 'Designed for real life',
    text: 'Balconies, rentals and busy households — our ideas start from how people actually live, not from showroom conditions.',
  },
  {
    icon: MessagesSquare,
    title: 'Human support',
    text: 'A small team that answers personally — before, during and after your order.',
  },
];

export default function AboutPage() {
  return (
    <>
      {/* Hero */}
      <div className="relative h-[280px] w-full overflow-hidden bg-ink md:h-[340px]">
        <Image
          src="/images/about-hero.jpg"
          alt="Sunlit home goods atelier with wooden shelves, ceramics and craft tools"
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
              <li aria-current="page">About</li>
            </ol>
          </nav>
          <h1 className="font-display mt-3 text-3xl font-medium tracking-tight text-white md:text-4xl">
            About E-com.casa
          </h1>
        </div>
      </div>

      {/* Story */}
      <section id="story" className="container-ecom scroll-mt-24 py-12 lg:py-16" aria-labelledby="story-title">
        <div className="grid gap-10 lg:grid-cols-[280px_1fr] lg:gap-16">
          <div>
            <p className="eyebrow text-muted-foreground">Our story</p>
            <h2 id="story-title" className="font-display mt-3 text-2xl font-medium tracking-tight sm:text-3xl">
              A brand built on small changes
            </h2>
          </div>
          <div className="max-w-3xl space-y-6 text-[15px] leading-relaxed text-foreground/80">
            <p className="font-display text-xl leading-snug text-foreground sm:text-[26px] sm:leading-[1.3]">
              E-com.casa is a European home and garden brand built around one simple idea: Small changes can
              transform the way a space feels.
            </p>
            <p>
              We curate pieces for interiors, gardens and everyday living — combining design, comfort, function
              and character. Instead of an endless catalogue, you will find a considered selection: wood slat
              panels that change the whole mood of a wall, lighting that makes an evening feel deliberate, and
              garden pieces that turn four square metres of balcony into a room of their own.
            </p>
            <p>
              The Journal is where we share how to use them — practical, step-by-step ideas that most people can
              do in an afternoon, without a professional and without renovating. Because a better-feeling home
              rarely requires a bigger budget; it requires the right change in the right place.
            </p>
            <p>
              We are based in Europe, we ship across European markets, and we are still growing. Where something
              on this site is still being set up — certifications, final policy details — we say so plainly instead
              of pretending otherwise. Orders are fulfilled through our EU 3PL warehouses in Venlo (Netherlands)
              and Zaragoza (Spain), so your parcels start their journey close to home.
            </p>
          </div>
        </div>
      </section>

      {/* Company & logistics */}
      <section className="container-ecom pb-4" aria-labelledby="company-title">
        <div className="rounded-md border border-border bg-card p-6 sm:p-8">
          <div className="grid gap-8 sm:grid-cols-2">
            <div>
              <p className="eyebrow text-muted-foreground">The company behind the brand</p>
              <h2 id="company-title" className="font-display mt-2 text-xl font-medium tracking-tight">
                {COMPANY.legalName}
              </h2>
              <p className="mt-3 text-[13.5px] leading-relaxed text-muted-foreground">
                E-com.casa is the consumer trading brand of {COMPANY.legalName}, a company incorporated in{' '}
                {COMPANY.countryOfIncorporation} under company number {COMPANY.companyNumber}, registered at{' '}
                {COMPANY.registeredOffice.line1}, {COMPANY.registeredOffice.line2}, {COMPANY.registeredOffice.city}{' '}
                {COMPANY.registeredOffice.postcode}, {COMPANY.registeredOffice.country}.
              </p>
              <p className="mt-3 text-[13.5px] leading-relaxed text-muted-foreground">
                Institutional contact:{' '}
                <a href={`mailto:${EMAILS.institutional}`} className="font-medium underline underline-offset-2 hover:text-olive">
                  {EMAILS.institutional}
                </a>
                {' '}· Customer support:{' '}
                <a href={`mailto:${EMAILS.support}`} className="font-medium underline underline-offset-2 hover:text-olive">
                  {EMAILS.support}
                </a>
                {COMPANY.telephone ? (
                  <>
                    {' '}· {COMPANY.telephone}
                  </>
                ) : null}
              </p>
            </div>
            <div>
              <p className="eyebrow text-muted-foreground">Where your order starts</p>
              <h2 className="font-display mt-2 flex items-center gap-2 text-xl font-medium tracking-tight">
                <Warehouse className="h-4.5 w-4.5 text-olive" strokeWidth={1.5} /> EU 3PL warehouses
              </h2>
              <ul className="mt-3 space-y-3 text-[13.5px] leading-relaxed text-muted-foreground">
                {COMPANY.warehouses.map((w) => (
                  <li key={w.id}>
                    <span className="font-medium text-foreground">{w.name}</span>
                    <br />
                    {w.streets}, {w.postalCode} {w.city}, {w.country}
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[12.5px] text-muted-foreground/80">
                Every paid order carries a tracking number you can follow on our{' '}
                <a href="/track" className="underline underline-offset-2 hover:text-olive">Track Your Order page</a>.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="bg-cream py-12 lg:py-16" aria-labelledby="values-title">
        <div className="container-ecom">
          <p className="eyebrow text-muted-foreground">What we stand for</p>
          <h2 id="values-title" className="font-display mt-3 text-2xl font-medium tracking-tight sm:text-3xl">
            How we work
          </h2>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {VALUES.map((v) => (
              <li key={v.title} className="rounded-md border border-border bg-card p-6 transition-shadow hover:shadow-sm">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent">
                  <v.icon className="h-5 w-5 text-olive" strokeWidth={1.5} />
                </span>
                <h3 className="font-display mt-4 text-lg font-medium">{v.title}</h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">{v.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Careers + Press */}
      <section className="container-ecom py-12 lg:py-16">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          <article id="careers" className="scroll-mt-24">
            <p className="eyebrow text-muted-foreground">Careers</p>
            <h2 className="font-display mt-3 text-2xl font-medium tracking-tight">Join the team</h2>
            <p className="mt-4 text-[15px] leading-relaxed text-foreground/80">
              E-com.casa is a small, focused team working across buying, content, technology and customer care.
              We do not have open roles to list right now. When positions open, they will be published on this
              page — so if you would like to work with us, check back or send a short introduction.
            </p>
            <a
              href={`mailto:${EMAILS.general}`}
              className="group mt-5 inline-flex items-center gap-2 text-[14px] font-medium text-foreground underline-offset-4 hover:underline"
            >
              <Mail className="h-4 w-4 text-olive" strokeWidth={1.5} />
              {EMAILS.general}
            </a>
          </article>

          <article id="press" className="scroll-mt-24 border-t border-border pt-10 lg:border-l lg:border-t-0 lg:pl-16 lg:pt-0">
            <p className="eyebrow text-muted-foreground">Press</p>
            <h2 className="font-display mt-3 text-2xl font-medium tracking-tight">Press enquiries</h2>
            <p className="mt-4 text-[15px] leading-relaxed text-foreground/80">
              For press enquiries, interviews or brand assets, please get in touch by email. Tell us briefly who
              you are, the publication or project, and your deadline — we will come back to you as quickly as we
              can. High-resolution imagery and brand material are available on request.
            </p>
            <a
              href={`mailto:${EMAILS.general}`}
              className="group mt-5 inline-flex items-center gap-2 text-[14px] font-medium text-foreground underline-offset-4 hover:underline"
            >
              <Mail className="h-4 w-4 text-olive" strokeWidth={1.5} />
              {EMAILS.general}
            </a>
          </article>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-olive-deep" aria-label="Shop the collection">
        <div className="container-ecom flex flex-col items-center gap-6 py-12 text-center lg:flex-row lg:justify-between lg:py-14 lg:text-left">
          <div>
            <p className="eyebrow text-white/60">Make Your Space Yours.</p>
            <p className="font-display mt-2 text-2xl font-medium tracking-tight text-white sm:text-3xl">
              Start with one small change today.
            </p>
          </div>
          <Link
            href="/shop"
            className="group inline-flex h-12 shrink-0 items-center gap-2.5 rounded-md bg-white px-7 text-[14px] font-semibold text-ink transition-all hover:bg-cream hover:shadow-lg"
          >
            Shop the Collection
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" strokeWidth={2} />
          </Link>
        </div>
      </section>
    </>
  );
}
