'use client';

import Link from 'next/link';
import { ChevronDown, Globe2, MapPin } from 'lucide-react';
import { useEffect, useState } from 'react';
import { LANGUAGES_UI, type Lang } from '@/lib/i18n';
import { useLanguage } from '@/lib/language-store';
import type { OfferMarketContext } from '@/lib/offers/types';
import { getOfferUICopy } from '@/lib/offers/i18n';

export function OfferMarketHeader({ market }: { market: OfferMarketContext }) {
  const lang = useLanguage((state) => state.lang);
  const setLang = useLanguage((state) => state.setLang);
  const [open, setOpen] = useState(false);
  const effectiveLang = (['en', 'pt', 'fr', 'de', 'es', 'it', 'nl'].includes(lang) ? lang : market.language) as Lang;
  const copy = getOfferUICopy(effectiveLang);

  useEffect(() => {
    try {
      if (!window.localStorage.getItem('ecom-language')) setLang(market.language as Lang);
    } catch {
      // Storage can be unavailable in hardened browsers; GEO remains the fallback.
    }
  }, [market.language, setLang]);

  const current = LANGUAGES_UI.find((item) => item.code === effectiveLang) ?? LANGUAGES_UI[0];

  return (
    <div className="border-b border-border/70 bg-background/95 backdrop-blur">
      <div className="container-ecom flex min-h-16 items-center justify-between gap-4 py-3">
        <Link href="/" className="flex items-center gap-2.5" aria-label="E-com.casa — home">
          <span className="grid h-9 w-9 place-items-center rounded-md bg-ink text-cream">
            <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
              <path d="M3.5 10.5 12 3.5l8.5 7" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M5.5 9.5V20h13V9.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M10 20v-5.5h4V20" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span className="font-display text-[20px] font-semibold tracking-tight">E-com<span className="text-olive">.</span>casa</span>
        </Link>

        <div className="flex items-center gap-3 text-[11.5px] text-foreground/70 sm:gap-5">
          <span className="hidden items-center gap-1.5 sm:inline-flex" title={copy.marketNote}>
            <MapPin className="h-3.5 w-3.5 text-olive" />
            {copy.shipTo}: <strong className="font-semibold text-foreground">{market.countryName}</strong>
          </span>
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-background px-3 font-medium text-foreground transition hover:border-olive/50"
              aria-expanded={open}
              aria-haspopup="menu"
            >
              <Globe2 className="h-3.5 w-3.5 text-olive" />
              <span className="hidden xs:inline">{current.native}</span>
              <span className="uppercase">{effectiveLang}</span>
              <ChevronDown className="h-3 w-3" />
            </button>
            {open && (
              <div role="menu" className="absolute right-0 top-full z-50 mt-2 w-44 rounded-xl border border-border bg-background p-1.5 shadow-xl">
                {LANGUAGES_UI.map((item) => (
                  <button
                    key={item.code}
                    type="button"
                    role="menuitemradio"
                    aria-checked={item.code === effectiveLang}
                    onClick={() => {
                      setLang(item.code);
                      setOpen(false);
                    }}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[12.5px] hover:bg-muted"
                  >
                    <span>{item.native}</span>
                    <span className="text-[10px] uppercase text-muted-foreground">{item.code}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
