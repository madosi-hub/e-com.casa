'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowRight, Building2, Instagram, Facebook, Youtube, MapPin, Mail, PackageSearch, Phone, Warehouse } from 'lucide-react';
import { COMPANY } from '@/lib/company';
import { activeSocialLinks } from '@/lib/social';
import { useCookieConsent } from '@/lib/cookie-store';
import { useT } from '@/hooks/use-t';
import { toast } from '@/hooks/use-toast';
import { PaymentBrandStrip } from '@/components/payments/payment-brand-strip';

const COLUMNS: { titleKey: string; links: { labelKey: string; href: string }[] }[] = [
  {
    titleKey: 'footer.colShop',
    links: [
      { labelKey: 'space.livingRoom', href: '/shop?space=living-room' },
      { labelKey: 'space.bedroom', href: '/shop?space=bedroom' },
      { labelKey: 'space.kitchen', href: '/shop?space=kitchen' },
      { labelKey: 'space.bathroom', href: '/shop?space=bathroom' },
      { labelKey: 'shop.garden', href: '/shop?space=garden' },
      { labelKey: 'shop.outdoor', href: '/shop?category=outdoor' },
      { labelKey: 'shop.lighting', href: '/shop?category=lighting' },
      { labelKey: 'shop.wallPanels', href: '/shop?category=wall-panels' },
      { labelKey: 'shop.decoration', href: '/shop?category=decoration' },
      { labelKey: 'shop.organisation', href: '/shop?category=organisation' },
    ],
  },
  {
    titleKey: 'footer.colHelp',
    links: [
      { labelKey: 'help.contact', href: '/contact' },
      { labelKey: 'help.faq', href: '/contact#faq' },
      { labelKey: 'help.shipping', href: '/shipping' },
      { labelKey: 'help.trackOrder', href: '/track' },
      { labelKey: 'help.returns', href: '/returns' },
      { labelKey: 'help.warranty', href: '/legal/warranty' },
      { labelKey: 'help.productSafety', href: '/legal/product-safety' },
      { labelKey: 'help.accessibility', href: '/legal/accessibility' },
      { labelKey: 'help.liveChat', href: '/contact#chat' },
    ],
  },
  {
    titleKey: 'footer.colAbout',
    links: [
      { labelKey: 'about.brand', href: '/about' },
      { labelKey: 'about.story', href: '/about#story' },
      { labelKey: 'nav.journal', href: '/journal' },
      { labelKey: 'nav.inspiration', href: '/inspiration' },
      { labelKey: 'about.sustainability', href: '/sustainability' },
      { labelKey: 'about.careers', href: '/about#careers' },
      { labelKey: 'about.press', href: '/about#press' },
    ],
  },
  {
    titleKey: 'footer.colLegal',
    links: [
      { labelKey: 'legal.notice', href: '/legal/notice' },
      { labelKey: 'legal.terms', href: '/legal/terms' },
      { labelKey: 'legal.privacy', href: '/legal/privacy' },
      { labelKey: 'legal.cookies', href: '/legal/cookies' },
      { labelKey: 'legal.cookieSettings', href: '/legal/cookie-settings' },
      { labelKey: 'legal.returnsWithdrawal', href: '/legal/returns' },
      { labelKey: 'legal.shippingPolicy', href: '/legal/shipping' },
      { labelKey: 'help.productSafety', href: '/legal/product-safety' },
      { labelKey: 'legal.complaints', href: '/legal/complaints' },
      { labelKey: 'legal.dispute', href: '/legal/dispute-resolution' },
    ],
  },
  {
    titleKey: 'footer.colAccount',
    links: [
      { labelKey: 'account.myAccount', href: '/account' },
      { labelKey: 'account.myOrders', href: '/account/orders' },
      { labelKey: 'account.wishlist', href: '/wishlist' },
      { labelKey: 'account.savedAddresses', href: '/account#addresses' },
    ],
  },
];

export function SiteFooter() {
  const t = useT();
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const reopenCookies = useCookieConsent((s) => s.reopen);
  const socials = activeSocialLinks();

  const subscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes('@')) {
      toast({ title: t('footer.toastInvalid'), variant: 'destructive' });
      return;
    }
    // Explicit marketing consent is REQUIRED — never inferred from
    // the form submission itself.
    if (!consent) {
      toast({ title: t('footer.toastConsentRequired'), variant: 'destructive' });
      return;
    }
    setSubscribing(true);
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'footer', marketingConsent: true }),
      });
      if (res.ok) {
        toast({ title: t('footer.toastWelcome'), description: t('footer.toastWelcomeDesc') });
        setEmail('');
        setConsent(false);
      } else {
        const data = await res.json().catch(() => null);
        toast({ title: data?.error ?? t('footer.toastError'), variant: 'destructive' });
      }
    } catch {
      toast({ title: t('footer.toastNetwork'), variant: 'destructive' });
    } finally {
      setSubscribing(false);
    }
  };

  return (
    <footer className="mt-auto bg-ink text-[#c9cdc4]" aria-label="Site footer">
      {/* Newsletter band */}
      <div className="border-b border-white/10">
        <div className="container-ecom flex flex-col items-start justify-between gap-6 py-12 md:flex-row md:items-center">
          <div className="max-w-md">
            <h2 className="font-display text-2xl font-medium text-white">{t('footer.newsletterTitle')}</h2>
            <p className="mt-2 text-sm leading-relaxed text-[#a7ada0]">
              {t('footer.newsletterDesc')}
            </p>
          </div>
          <form onSubmit={subscribe} className="flex w-full max-w-md gap-2" aria-label="Newsletter signup">
            <label htmlFor="newsletter-email" className="sr-only">
              {t('footer.emailPlaceholder')}
            </label>
            <input
              id="newsletter-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('footer.emailPlaceholder')}
              className="h-12 flex-1 rounded-md border border-white/15 bg-white/5 px-4 text-sm text-white outline-none transition-colors placeholder:text-[#8a9082] focus:border-[#e0a03c]/60 focus:ring-2 focus:ring-[#e0a03c]/20"
            />
            <button
              type="submit"
              disabled={subscribing}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-[#e0a03c] text-ink transition-all hover:bg-[#eab157] disabled:opacity-60"
              aria-label={t('footer.subscribe')}
            >
              <ArrowRight className="h-4.5 w-4.5" strokeWidth={2} />
            </button>
          </form>
          <div className="mt-3 w-full max-w-md">
            <label htmlFor="newsletter-consent" className="flex cursor-pointer items-start gap-2 text-[12px] leading-relaxed text-[#a7ada0]">
              <input
                id="newsletter-consent"
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-white/25 bg-white/10 accent-[#e0a03c]"
                required
              />
              <span>
                {t('footer.newsletterConsent')}{' '}
                <Link href="/legal/privacy" className="underline underline-offset-2 hover:text-white">
                  {t('checkout.privacyShort')}
                </Link>
                .
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Link columns */}
      <div className="container-ecom grid grid-cols-2 gap-x-6 gap-y-10 py-14 sm:grid-cols-3 lg:grid-cols-5">
        {COLUMNS.map((col) => (
          <nav key={col.titleKey} aria-label={`${t(col.titleKey)} ${t('footer.links')}`}>
            <h3 className="eyebrow mb-4 text-[#e0a03c]">{t(col.titleKey)}</h3>
            <ul className="space-y-2.5">
              {col.links.map((link) => (
                <li key={link.labelKey}>
                  <Link
                    href={link.href}
                    className="text-[13px] leading-snug text-[#b3b8ad] transition-colors hover:text-white"
                  >
                    {t(link.labelKey)}
                  </Link>
                </li>
              ))}
              {col.titleKey === 'footer.colLegal' && (
                <li>
                  <button
                    type="button"
                    onClick={reopenCookies}
                    className="text-[13px] text-[#b3b8ad] transition-colors hover:text-white"
                  >
                    {t('legal.cookieSettings')}
                  </button>
                </li>
              )}
            </ul>
          </nav>
        ))}
      </div>

      {/* Payment methods — configured, brand-correct, small + balanced */}
      <div className="border-t border-white/10">
        <div className="container-ecom flex flex-col items-start justify-between gap-4 py-8 md:flex-row md:items-center">
          <PaymentBrandStrip country="ALL" currency="ALL" variant="footer" caption={t('footer.weAccept')} />
          <p className="flex items-center gap-1.5 text-[11.5px] text-[#9aa093]">
            {t('footer.securePaymentNote')}
          </p>
        </div>
      </div>

      {/* Company legal identity — institutional entity + operational contacts + 3PL network */}
      <div className="border-t border-white/10">
        <div className="container-ecom grid gap-10 py-10 md:grid-cols-2 lg:grid-cols-3">
          {/* Brand + institutional entity */}
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-md bg-white/10 text-cream">
                <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
                  <path d="M3.5 10.5 12 3.5l8.5 7" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M5.5 9.5V20h13V9.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M10 20v-5.5h4V20" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span className="font-display text-lg font-semibold text-white">E-com.casa</span>
            </div>
            <p className="mt-4 max-w-md text-[12.5px] leading-relaxed text-[#9aa093]">
              {t('footer.registered', {
                legalName: COMPANY.legalName,
                country: COMPANY.countryOfIncorporation,
                number: COMPANY.companyNumber,
              })}
            </p>
            <address className="mt-3 text-[12.5px] not-italic leading-relaxed text-[#9aa093]">
              {COMPANY.legalName}
              <br />
              {COMPANY.registeredOffice.line1}, {COMPANY.registeredOffice.line2}
              <br />
              {COMPANY.registeredOffice.city}, {COMPANY.registeredOffice.postcode}, {COMPANY.registeredOffice.country}
            </address>
            <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8a9082]">
              {t('footer.institutional')}
            </p>
            <p className="mt-1.5 flex items-center gap-2 text-[12.5px] text-[#9aa093]">
              <Building2 className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
              <a href={`mailto:${COMPANY.emails.institutional}`} className="transition-colors hover:text-white">
                {COMPANY.emails.institutional}
              </a>
            </p>
          </div>

          {/* Operational contacts — e-com.casa customers & support */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#e0a03c]">
              {t('footer.customerSupport')}
            </p>
            <ul className="mt-3 space-y-2.5 text-[12.5px] text-[#9aa093]">
              <li className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
                <a href={`mailto:${COMPANY.emails.support}`} className="transition-colors hover:text-white">
                  {COMPANY.emails.support}
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
                <a href={`tel:${COMPANY.telephone.replace(/\s+/g, '')}`} className="transition-colors hover:text-white">
                  {COMPANY.telephone}
                </a>
              </li>
              <li className="flex items-center gap-2">
                <PackageSearch className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
                <Link href="/track" className="transition-colors hover:text-white">
                  {t('help.trackOrder')}
                </Link>
              </li>
            </ul>
            <div className="mt-4 flex items-center gap-3">
              {socials.map((s) => {
                const Icon =
                  s.id === 'instagram' ? Instagram :
                  s.id === 'facebook' ? Facebook :
                  s.id === 'youtube' ? Youtube : null;
                return (
                  <a
                    key={s.id}
                    href={s.url ?? '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.label}
                    title={s.label}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-white/12 text-[#b3b8ad] transition-colors hover:border-white/30 hover:text-white"
                  >
                    {Icon ? <Icon className="h-4 w-4" strokeWidth={1.5} /> : <span className="text-[11px] font-semibold">{s.label.slice(0, 2)}</span>}
                  </a>
                );
              })}
            </div>
          </div>

          {/* EU 3PL logistics warehouses */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#e0a03c]">
              {t('footer.warehouses')}
            </p>
            <ul className="mt-3 space-y-4">
              {COMPANY.warehouses.map((w) => (
                <li key={w.id} className="text-[12.5px] leading-relaxed text-[#9aa093]">
                  <p className="flex items-start gap-2 font-medium text-[#b3b8ad]">
                    <Warehouse className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
                    {w.name}
                  </p>
                  <p className="mt-0.5 pl-5.5">
                    {w.streets}, {w.postalCode} {w.city}, {w.country}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="container-ecom border-t border-white/10 py-5">
          <div className="flex flex-col items-start justify-between gap-2 text-[12px] text-[#8a9082] md:flex-row md:items-center">
            <p>{t('footer.copyright', { brand: COMPANY.brand })}</p>
            <p className="flex items-center gap-1.5 md:justify-end">
              <MapPin className="h-3 w-3" strokeWidth={1.5} />
              {t('footer.vatNote')}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
