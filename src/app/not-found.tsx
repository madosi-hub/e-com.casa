import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Compass, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="relative overflow-hidden">
      {/* Editorial backdrop */}
      <div className="absolute inset-0" aria-hidden>
        <Image
          src="/images/inspiration-hero.jpg"
          alt=""
          fill
          sizes="100vw"
          className="object-cover opacity-30"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/85 to-background" />
      </div>

      <div className="container-ecom relative flex min-h-[64vh] flex-col items-center justify-center py-20 text-center">
        <p className="eyebrow text-olive">Error 404</p>
        <h1 className="font-display mt-4 text-[40px] font-medium leading-tight tracking-tight sm:text-[52px]">
          This room is empty.
        </h1>
        <p className="mt-4 max-w-md text-[15px] leading-relaxed text-muted-foreground">
          The page you are looking for has moved, sold out or never existed.
          Let&apos;s get you back to the beautiful parts of the store.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button asChild className="h-12 rounded-md bg-primary px-7 text-[14px] font-semibold">
            <Link href="/">
              <Compass className="mr-2 h-4 w-4" strokeWidth={1.75} />
              Back to home
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-12 rounded-md border-ink px-7 text-[14px] font-semibold hover:bg-ink hover:text-cream">
            <Link href="/shop">
              Browse the shop
              <ArrowRight className="ml-2 h-4 w-4" strokeWidth={2} />
            </Link>
          </Button>
        </div>

        {/* Helpful detours */}
        <div className="mt-14 w-full max-w-2xl">
          <p className="eyebrow mb-4 text-muted-foreground">
            <Search className="mr-1.5 inline h-3.5 w-3.5" strokeWidth={1.75} />
            Popular right now
          </p>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Wall Panels', href: '/shop?category=wall-panels' },
              { label: 'Lighting', href: '/shop?category=lighting' },
              { label: 'Garden', href: '/shop?category=garden' },
              { label: 'Best Sellers', href: '/shop?sort=best' },
            ].map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="group flex items-center justify-between rounded-md border border-border bg-card px-4 py-3 text-[13px] font-medium transition-all hover:border-ring hover:shadow-sm"
                >
                  {item.label}
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
