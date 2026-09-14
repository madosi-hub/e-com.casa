import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Recycle, Sofa, Compass } from 'lucide-react';

const PILLARS = [
  {
    icon: Sofa,
    title: 'Transform Your Space',
    text: 'With simple changes, make a big difference.',
  },
  {
    icon: Recycle,
    title: 'Sustainable Choices',
    text: 'Thoughtful products for a better tomorrow.',
  },
  {
    icon: Compass,
    title: 'Design for Every Lifestyle',
    text: "From tiny balconies to country gardens.",
  },
];

export function JournalBanner() {
  return (
    <section aria-labelledby="journal-banner" className="relative overflow-hidden bg-olive-deep">
      <div className="absolute inset-0" aria-hidden>
        <Image
          src="/images/journal-banner.jpg"
          alt=""
          fill
          sizes="100vw"
          className="object-cover opacity-45"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#232b23]/92 via-[#232b23]/72 to-[#232b23]/38" />
      </div>

      <div className="container-ecom relative grid gap-10 py-14 lg:grid-cols-[1fr_auto] lg:items-center lg:py-16">
        <div className="max-w-md">
          <h2 id="journal-banner" className="font-display text-[28px] font-medium leading-tight tracking-tight text-white sm:text-[32px]">
            Your home. Your garden.
            <br />
            Our inspiration.
          </h2>
          <p className="mt-3 text-[14px] leading-relaxed text-white/75">
            Explore our Journal for ideas, tips and the latest trends.
          </p>
          <Link
            href="/journal"
            className="group mt-7 inline-flex h-11 items-center gap-2 rounded-md bg-white px-6 text-[13.5px] font-semibold text-ink transition-all hover:bg-cream hover:shadow-lg"
          >
            Visit the Journal
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" strokeWidth={2} />
          </Link>
        </div>

        <ul className="grid gap-8 sm:grid-cols-3 lg:max-w-xl lg:gap-10" aria-label="What we stand for">
          {PILLARS.map((p) => (
            <li key={p.title} className="flex flex-col items-center text-center sm:flex-col">
              <span className="flex h-12 w-12 items-center justify-center rounded-full border border-white/25 bg-white/8 text-white backdrop-blur">
                <p.icon className="h-5 w-5" strokeWidth={1.4} />
              </span>
              <h3 className="mt-3.5 text-[14px] font-semibold text-white">{p.title}</h3>
              <p className="mt-1.5 max-w-[190px] text-[12.5px] leading-relaxed text-white/65">{p.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
