import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Gem, Truck, ShieldCheck, RotateCcw } from 'lucide-react';

const SERVICES = [
  { icon: Gem, label: 'Premium', sub: 'Quality' },
  { icon: Truck, label: 'Fast & Reliable', sub: 'Shipping' },
  { icon: ShieldCheck, label: 'Secure', sub: 'Payments' },
  { icon: RotateCcw, label: '14-Day', sub: 'Returns' },
];

export function Hero() {
  return (
    <section aria-label="Featured collection" className="relative">
      <div className="relative h-[520px] w-full overflow-hidden sm:h-[560px] lg:h-[600px]">
        <Image
          src="/images/hero.jpg"
          alt="Modern Mediterranean terrace at dusk with outdoor sofa, lanterns and olive trees"
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        {/* Legibility gradients */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#1a160f]/70 via-[#1a160f]/25 to-transparent" aria-hidden />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#1a160f]/55 to-transparent" aria-hidden />

        {/* Copy */}
        <div className="container-ecom absolute inset-0 flex flex-col justify-center">
          <div className="max-w-xl pt-6">
            <p className="eyebrow text-[#e8ddc8]">Design, Comfort &amp; Solutions</p>
            <h1 className="font-display mt-4 text-[42px] font-medium leading-[1.06] tracking-tight text-white sm:text-[56px] lg:text-[64px]">
              Make Your
              <br />
              Space Yours.
            </h1>
            <p className="mt-5 max-w-sm text-[15px] leading-relaxed text-white/85 sm:text-base">
              Curated pieces for interiors, gardens and everyday living.
            </p>
            <div className="mt-8">
              <Link
                href="/shop"
                className="group inline-flex h-12 items-center gap-2.5 rounded-md bg-white px-7 text-[14px] font-semibold text-ink shadow-lg transition-all hover:bg-cream hover:shadow-xl"
              >
                Shop the Collection
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" strokeWidth={2} />
              </Link>
            </div>
          </div>
        </div>

        {/* Service badges */}
        <div className="container-ecom absolute inset-x-0 bottom-5 hidden justify-end md:flex">
          <ul className="flex flex-wrap items-center gap-2.5" aria-label="Our service promises">
            {SERVICES.map((s) => (
              <li
                key={s.label}
                className="flex items-center gap-2.5 rounded-lg border border-white/12 bg-[#14120e]/55 px-3.5 py-2.5 text-white/90 backdrop-blur-md"
              >
                <s.icon className="h-4.5 w-4.5 text-[#e0a03c]" strokeWidth={1.5} />
                <span className="text-left leading-tight">
                  <span className="block text-[11.5px] font-medium">{s.label}</span>
                  <span className="block text-[10.5px] text-white/60">{s.sub}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Mobile service strip */}
      <div className="border-b border-border bg-cream md:hidden">
        <ul className="no-scrollbar flex gap-2 overflow-x-auto px-4 py-3" aria-label="Our service promises">
          {SERVICES.map((s) => (
            <li key={s.label} className="flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5">
              <s.icon className="h-3.5 w-3.5 text-olive" strokeWidth={1.5} />
              <span className="text-[11px] font-medium text-foreground/80">
                {s.label} {s.sub}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
