import Link from 'next/link';
import type { Metadata } from 'next';
import { User, Package, Heart, MapPin, Settings, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'My Account',
  description: 'Manage your E-com.casa orders, wishlist and details.',
  robots: { index: false },
};

const LINKS = [
  { href: '/account/orders', icon: Package, title: 'My Orders', desc: 'Track deliveries and revisit past orders.' },
  { href: '/wishlist', icon: Heart, title: 'Wishlist', desc: 'Your saved pieces, stored on this device.' },
  { href: '/checkout', icon: MapPin, title: 'Addresses', desc: 'Managed at checkout — saved for this session.' },
  { href: '/legal/cookie-settings', icon: Settings, title: 'Privacy settings', desc: 'Manage cookies and consent.' },
];

export default function AccountPage() {
  return (
    <div className="container-ecom py-10 lg:py-14">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-cream">
            <User className="h-6 w-6 text-olive" strokeWidth={1.5} />
          </span>
          <div>
            <h1 className="font-display text-[28px] font-medium tracking-tight">My Account</h1>
            <p className="text-[13px] text-muted-foreground">Guest session — no account required in this V1 store.</p>
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="group flex items-start justify-between gap-4 rounded-lg border border-border bg-card p-5 transition-all hover:border-ring hover:shadow-sm"
            >
              <span className="flex items-start gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-cream">
                  <l.icon className="h-5 w-5 text-olive" strokeWidth={1.5} />
                </span>
                <span>
                  <span className="block text-[14.5px] font-medium">{l.title}</span>
                  <span className="mt-1 block text-[12.5px] leading-relaxed text-muted-foreground">{l.desc}</span>
                </span>
              </span>
              <ChevronRight className="mt-2 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </Link>
          ))}
        </div>

        <div className="mt-8 rounded-lg border border-border bg-cream/50 p-5 text-[13px] leading-relaxed text-muted-foreground">
          <strong className="text-foreground">Simple and secure by design.</strong> Orders you place on this device
          are listed with private order links, wishlists live on your device, and checkout takes under a minute.
          Saved addresses and faster checkout are on the roadmap — see our{' '}
          <Link href="/legal/privacy" className="text-olive underline underline-offset-2">privacy policy</Link> for
          how data is handled today.
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild className="rounded-md bg-primary">
            <Link href="/shop">Continue shopping</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-md">
            <Link href="/contact">Need help?</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
