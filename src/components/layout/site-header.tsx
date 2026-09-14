'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import {
  Search,
  Heart,
  User,
  ShoppingBag,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  Truck,
  RotateCcw,
  ShieldCheck,
  Globe,
  Gem,
  Star,
  PackageCheck,
  Check,
} from 'lucide-react';
import { useCart } from '@/lib/cart-store';
import { useWishlist } from '@/lib/wishlist-store';
import { useCartDrawer } from '@/lib/cart-drawer-store';
import { useT } from '@/hooks/use-t';
import { useLanguage } from '@/lib/language-store';
import { LANGUAGES_UI } from '@/lib/i18n';
import { SEARCH_SUGGESTIONS } from '@/lib/constants';
import { cn } from '@/lib/utils';

const SHOP_MENU: { labelKey: string; href: string; items: { labelKey: string; href: string }[] }[] = [
  {
    labelKey: 'nav.shop',
    href: '/shop',
    items: [
      { labelKey: 'shop.all', href: '/shop' },
      { labelKey: 'shop.wallPanels', href: '/shop?category=wall-panels' },
      { labelKey: 'shop.lighting', href: '/shop?category=lighting' },
      { labelKey: 'shop.garden', href: '/shop?category=garden' },
      { labelKey: 'shop.outdoor', href: '/shop?category=outdoor' },
      { labelKey: 'shop.decoration', href: '/shop?category=decoration' },
      { labelKey: 'shop.organisation', href: '/shop?category=organisation' },
      { labelKey: 'shop.interior', href: '/shop?category=interior' },
    ],
  },
  {
    labelKey: 'nav.inspiration',
    href: '/inspiration',
    items: [
      { labelKey: 'insp.gallery', href: '/inspiration' },
      { labelKey: 'insp.bySpace', href: '/shop?filter=space' },
      { labelKey: 'insp.byStyle', href: '/shop?filter=style' },
      { labelKey: 'nav.journal', href: '/journal' },
    ],
  },
];

const ANNOUNCEMENTS: { icon: typeof Truck; key: string }[] = [
  { icon: Truck, key: 'ann.freeShipping' },
  { icon: RotateCcw, key: 'ann.returns' },
  { icon: ShieldCheck, key: 'ann.secure' },
  { icon: Gem, key: 'ann.newIn' },
];

export function SiteHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const t = useT();
  const lang = useLanguage((s) => s.lang);
  const setLang = useLanguage((s) => s.setLang);
  const cartCount = useCart((s) => s.lines.reduce((a, l) => a + l.quantity, 0));
  const wishlistCount = useWishlist((s) => s.slugs.length);
  const openCartDrawer = useCartDrawer((s) => s.open);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [scrolled, setScrolled] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const langRef = useRef<HTMLDivElement>(null);
  const [prevPath, setPrevPath] = useState(pathname);
  const [msgIndex, setMsgIndex] = useState(0);

  // Close overlays when navigation happens (render-time state adjustment)
  if (prevPath !== pathname) {
    setPrevPath(pathname);
    if (mobileOpen) setMobileOpen(false);
    if (searchOpen) setSearchOpen(false);
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false);
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  // Rotate announcement messages (disabled for reduced-motion users)
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = setInterval(() => setMsgIndex((i) => (i + 1) % ANNOUNCEMENTS.length), 4500);
    return () => clearInterval(id);
  }, []);

  const submitSearch = (q: string) => {
    if (!q.trim()) return;
    setSearchOpen(false);
    setQuery('');
    router.push(`/search?q=${encodeURIComponent(q.trim())}`);
  };

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href.split('?')[0]);

  const currentLang = LANGUAGES_UI.find((l) => l.code === lang) ?? LANGUAGES_UI[0];

  return (
    <header className="sticky top-0 z-50">
      {/* Announcement bar — rotating message + static trust trio (desktop) */}
      <div className="bg-ink text-[#d6d9d2]">
        <div className="container-ecom flex h-9 items-center justify-between gap-4 text-[11px] tracking-wide">
          <div className="flex min-w-0 items-center gap-4 overflow-hidden">
            {/* Rotating message (all breakpoints) */}
            <span key={msgIndex} className="flex items-center gap-1.5 whitespace-nowrap transition-opacity duration-500" aria-live="off">
              {(() => {
                const Msg = ANNOUNCEMENTS[msgIndex];
                return (
                  <>
                    <Msg.icon className="h-3.5 w-3.5 shrink-0 text-[#e0a03c]" strokeWidth={1.5} />
                    {t(Msg.key)}
                  </>
                );
              })()}
            </span>
            {/* Static trust trio — distinct from the rotating messages to avoid duplication */}
            <span className="hidden h-3 w-px bg-white/20 lg:block" aria-hidden />
            <span className="hidden items-center gap-1.5 whitespace-nowrap lg:flex">
              <Star className="h-3.5 w-3.5 shrink-0 fill-[#e0a03c] text-[#e0a03c]" strokeWidth={1.5} />
              {t('trust.rated')}
            </span>
            <span className="hidden h-3 w-px bg-white/20 xl:block" aria-hidden />
            <span className="hidden items-center gap-1.5 whitespace-nowrap xl:flex">
              <PackageCheck className="h-3.5 w-3.5 shrink-0 text-[#e0a03c]" strokeWidth={1.5} />
              {t('trust.dispatched')}
            </span>
          </div>
          <nav aria-label="Utility" className="flex shrink-0 items-center gap-4">
            {/* Language switcher */}
            <div ref={langRef} className="relative">
              <button
                type="button"
                onClick={() => setLangOpen((v) => !v)}
                className="flex items-center gap-1 transition-colors hover:text-white"
                aria-label={t('util.language', { lang: currentLang.native })}
                aria-expanded={langOpen}
                aria-haspopup="menu"
              >
                <Globe className="h-3.5 w-3.5" strokeWidth={1.5} />
                {lang.toUpperCase()}
                <ChevronDown className={cn('h-3 w-3 transition-transform', langOpen && 'rotate-180')} strokeWidth={1.5} />
              </button>
              {langOpen && (
                <div
                  role="menu"
                  aria-label="Language"
                  className="absolute right-0 top-full z-50 mt-2 w-44 overflow-hidden rounded-lg border border-border bg-background p-1.5 shadow-[0_12px_32px_rgba(33,30,27,0.12)]"
                >
                  {LANGUAGES_UI.map((l) => (
                    <button
                      key={l.code}
                      type="button"
                      role="menuitemradio"
                      aria-checked={l.code === lang}
                      onClick={() => {
                        setLang(l.code);
                        setLangOpen(false);
                      }}
                      className={cn(
                        'flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-[13px] transition-colors hover:bg-accent',
                        l.code === lang ? 'font-semibold text-foreground' : 'text-foreground/80'
                      )}
                    >
                      <span>
                        {l.native}
                        <span className="ml-1.5 text-[10.5px] uppercase tracking-wide text-muted-foreground">{l.code}</span>
                      </span>
                      {l.code === lang && <Check className="h-3.5 w-3.5 text-olive" strokeWidth={2} />}
                    </button>
                  ))}
                  <p className="mt-1 border-t border-border/70 px-3 pb-1 pt-2 text-[10.5px] leading-relaxed text-muted-foreground">
                    {t('util.langNote')}
                  </p>
                </div>
              )}
            </div>
            <span className="h-3 w-px bg-white/20" aria-hidden />
            <Link href="/wishlist" className="flex items-center gap-1.5 transition-colors hover:text-white">
              <Heart className="h-3.5 w-3.5" strokeWidth={1.5} />
              <span className="hidden sm:inline">{t('util.wishlist')}</span>
              {wishlistCount > 0 && <span className="tabular-nums">({wishlistCount})</span>}
            </Link>
            <span className="h-3 w-px bg-white/20" aria-hidden />
            <Link href="/account" className="flex items-center gap-1.5 transition-colors hover:text-white">
              <User className="h-3.5 w-3.5" strokeWidth={1.5} />
              <span className="hidden sm:inline">{t('util.account')}</span>
            </Link>
            <span className="h-3 w-px bg-white/20" aria-hidden />
            <button
              type="button"
              onClick={openCartDrawer}
              className="flex items-center gap-1.5 transition-colors hover:text-white"
              aria-label={t('util.openCart', { n: cartCount })}
            >
              <ShoppingBag className="h-3.5 w-3.5" strokeWidth={1.5} />
              {t('util.cart')} (<span key={cartCount} className="tabular-nums animate-in zoom-in-50 duration-300" aria-live="polite">{cartCount}</span>)
            </button>
          </nav>
        </div>
      </div>

      {/* Main header */}
      <div
        className={cn(
          'border-b border-border/70 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/90 transition-shadow',
          scrolled && 'shadow-[0_1px_12px_rgba(33,30,27,0.06)]'
        )}
      >
        <div className="container-ecom flex h-[72px] items-center gap-4 lg:h-[76px]">
          {/* Mobile menu button */}
          <button
            type="button"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-accent lg:hidden"
            onClick={() => setMobileOpen((v) => !v)}
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? t('menu.close') : t('menu.open')}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" strokeWidth={1.75} />}
          </button>

          {/* Logo */}
          <Link href="/" className="group flex shrink-0 items-center gap-2.5" aria-label="E-com.casa — home">
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-ink text-cream transition-transform group-hover:scale-105">
              {/* House mark */}
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
                <path d="M3.5 10.5 12 3.5l8.5 7" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M5.5 9.5V20h13V9.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M10 20v-5.5h4V20" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="leading-none">
              <span className="font-display block text-[22px] font-semibold tracking-tight text-foreground">
                E-com<span className="text-olive">.</span>casa
              </span>
              <span className="mt-1 block text-[10.5px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                {t('util.brandTagline')}
              </span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav aria-label="Primary" className="ml-6 hidden flex-1 items-center justify-center gap-7 lg:flex">
            <Link
              href="/"
              className={cn(
                'link-underline text-[14px] font-medium transition-colors hover:text-foreground',
                isActive('/') ? 'text-foreground after:w-full' : 'text-foreground/75'
              )}
            >
              {t('nav.home')}
            </Link>
            {SHOP_MENU.map((menu) => (
              <div key={menu.labelKey} className="group relative">
                <Link
                  href={menu.href}
                  className={cn(
                    'flex items-center gap-1 text-[14px] font-medium text-foreground/75 transition-colors group-hover:text-foreground',
                    isActive(menu.href) && 'text-foreground'
                  )}
                  aria-haspopup="true"
                >
                  {t(menu.labelKey)}
                  <ChevronDown className="h-3.5 w-3.5 transition-transform group-hover:rotate-180" strokeWidth={1.75} />
                </Link>
                <div className="invisible absolute left-1/2 top-full z-50 w-56 -translate-x-1/2 pt-3 opacity-0 transition-all duration-200 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
                  <div className="rounded-lg border border-border bg-background p-2 shadow-[0_12px_32px_rgba(33,30,27,0.10)]">
                    {menu.items.map((item) => (
                      <Link
                        key={item.labelKey}
                        href={item.href}
                        className="flex items-center justify-between rounded-md px-3 py-2 text-[13.5px] text-foreground/80 transition-colors hover:bg-accent hover:text-foreground"
                      >
                        {t(item.labelKey)}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            ))}
            <Link
              href="/about"
              className={cn(
                'link-underline text-[14px] font-medium transition-colors hover:text-foreground',
                isActive('/about') ? 'text-foreground after:w-full' : 'text-foreground/75'
              )}
            >
              {t('nav.about')}
            </Link>
            <Link
              href="/journal"
              className={cn(
                'link-underline text-[14px] font-medium transition-colors hover:text-foreground',
                isActive('/journal') ? 'text-foreground after:w-full' : 'text-foreground/75'
              )}
            >
              {t('nav.journal')}
            </Link>
          </nav>

          {/* Search */}
          <div ref={searchRef} className="relative ml-auto hidden w-full max-w-[300px] md:block lg:max-w-[320px]">
            <form
              role="search"
              onSubmit={(e) => {
                e.preventDefault();
                submitSearch(query);
              }}
            >
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.75} />
              <input
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSearchOpen(true);
                }}
                onFocus={() => setSearchOpen(true)}
                placeholder={t('search.placeholder')}
                aria-label={t('search.aria')}
                className="h-10 w-full rounded-full border border-input bg-muted/60 pl-10 pr-4 text-[13.5px] outline-none transition-all placeholder:text-muted-foreground focus:border-ring focus:bg-background focus:ring-2 focus:ring-ring/20"
              />
            </form>
            {searchOpen && (
              <div className="absolute right-0 top-full z-50 mt-2 w-full overflow-hidden rounded-lg border border-border bg-background shadow-[0_12px_32px_rgba(33,30,27,0.10)]">
                <div className="border-b border-border/70 px-4 py-2.5">
                  <p className="eyebrow text-muted-foreground">{t('search.popular')}</p>
                </div>
                <ul className="max-h-72 overflow-y-auto thin-scrollbar p-1.5">
                  {SEARCH_SUGGESTIONS.map((s) => (
                    <li key={s}>
                      <button
                        type="button"
                        onClick={() => submitSearch(s)}
                        className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[13.5px] text-foreground/80 transition-colors hover:bg-accent hover:text-foreground"
                      >
                        <Search className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.75} />
                        {s}
                      </button>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => submitSearch(query || 'all')}
                  className="flex w-full items-center justify-between border-t border-border/70 px-4 py-2.5 text-[13px] font-medium text-olive transition-colors hover:bg-accent"
                >
                  {query ? t('search.for', { q: query }) : t('search.browseAll')}
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Mobile actions */}
          <div className="ml-auto flex items-center gap-1 md:hidden">
            <Link
              href="/search"
              className="flex h-10 w-10 items-center justify-center rounded-md transition-colors hover:bg-accent"
              aria-label={t('search.mobile')}
            >
              <Search className="h-5 w-5" strokeWidth={1.75} />
            </Link>
            <button
              type="button"
              onClick={openCartDrawer}
              className="relative flex h-10 w-10 items-center justify-center rounded-md transition-colors hover:bg-accent"
              aria-label={t('util.openCart', { n: cartCount })}
            >
              <ShoppingBag className="h-5 w-5" strokeWidth={1.75} />
              {cartCount > 0 && (
                <span
                  key={cartCount}
                  className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 animate-in zoom-in-50 duration-300 items-center justify-center rounded-full bg-terracotta px-1 text-[10px] font-semibold text-white"
                >
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="border-t border-border bg-background lg:hidden">
            <nav aria-label="Mobile" className="container-ecom max-h-[70vh] space-y-1 overflow-y-auto py-4">
              <form
                role="search"
                className="relative mb-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  submitSearch(query);
                }}
              >
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t('search.placeholder')}
                  aria-label={t('search.mobile')}
                  className="h-11 w-full rounded-full border border-input bg-muted/60 pl-10 pr-4 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
                />
              </form>
              {[
                { labelKey: 'nav.home', href: '/' },
                ...SHOP_MENU,
                { labelKey: 'nav.about', href: '/about' },
                { labelKey: 'nav.journal', href: '/journal' },
              ].map((item) => (
                <div key={item.labelKey}>
                  <Link
                    href={item.href}
                    className="flex items-center justify-between rounded-md px-3 py-3 text-[15px] font-medium transition-colors hover:bg-accent"
                  >
                    {t(item.labelKey)}
                    {'items' in item && item.items && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                  </Link>
                  {'items' in item && item.items && (
                    <div className="ml-3 border-l border-border pl-3">
                      {item.items.slice(0, 6).map((sub) => (
                        <Link
                          key={sub.labelKey}
                          href={sub.href}
                          className="block rounded-md px-3 py-2 text-[13.5px] text-foreground/70 transition-colors hover:bg-accent hover:text-foreground"
                        >
                          {t(sub.labelKey)}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border pt-4">
                <Link href="/wishlist" className="flex items-center justify-center gap-2 rounded-md border border-input px-3 py-2.5 text-sm font-medium">
                  <Heart className="h-4 w-4" /> {t('util.wishlist')} ({wishlistCount})
                </Link>
                <Link href="/account" className="flex items-center justify-center gap-2 rounded-md border border-input px-3 py-2.5 text-sm font-medium">
                  <User className="h-4 w-4" /> {t('util.account')}
                </Link>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
