'use client';

import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { useCookieConsent } from '@/lib/cookie-store';

const UMAMI_WEBSITE_ID = 'b400c97b-5e22-4645-b937-11f5428f2705';
const UMAMI_HOST = 'https://umamim.madosi.online';

declare global {
  interface Window {
    umami?: { track: (event?: string, data?: Record<string, unknown>) => void };
  }
}

function safeValue(value: string | null | undefined): string | null {
  if (!value) return null;
  return value.replace(/\s+/g, ' ').trim().slice(0, 120) || null;
}

export function UmamiTracking() {
  const pathname = usePathname();
  const { decided, preferences } = useCookieConsent();
  const enabled = decided && preferences.analytics && !pathname.startsWith('/admin');

  useEffect(() => {
    if (!enabled) return;

    const track = (event: string, data: Record<string, unknown> = {}) => {
      if (typeof window.umami?.track === 'function') window.umami.track(event, data);
    };

    const onOfferEvent = (event: Event) => {
      const detail = (event as CustomEvent<Record<string, unknown>>).detail;
      if (!detail?.event) return;
      const { event: eventName, timestamp: _timestamp, ...payload } = detail;
      track(String(eventName), payload);
    };

    const onClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest('a,button') : null;
      if (!target) return;
      const label = safeValue(
        target.getAttribute('aria-label') ||
        target.getAttribute('title') ||
        target.textContent,
      );
      const eventName = label ? `ui_click · ${label}` : 'ui_click';
      track(eventName, {
        path: window.location.pathname,
        element: target.tagName.toLowerCase(),
        id: safeValue(target.id),
        label,
        href: target instanceof HTMLAnchorElement ? safeValue(target.getAttribute('href')) : null,
      });
    };

    const seen = new Set<string>();
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const element = entry.target as HTMLElement;
        const section = element.id || element.getAttribute('aria-labelledby') || element.tagName.toLowerCase();
        const key = `${window.location.pathname}:${section}`;
        if (seen.has(key)) continue;
        seen.add(key);
        track('section_view', { path: window.location.pathname, section });
      }
    }, { threshold: 0.2 });

    document.querySelectorAll('main, section, form, header, footer').forEach((element) => observer.observe(element));
    window.addEventListener('ecom:analytics', onOfferEvent);
    document.addEventListener('click', onClick, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener('ecom:analytics', onOfferEvent);
      document.removeEventListener('click', onClick);
    };
  }, [enabled, pathname]);

  if (!enabled) return null;

  return (
    <>
      <Script
        id="umami-analytics"
        src={`${UMAMI_HOST}/script.js`}
        data-website-id={UMAMI_WEBSITE_ID}
        strategy="afterInteractive"
        defer
      />
      <Script
        id="umami-recorder"
        src={`${UMAMI_HOST}/recorder.js`}
        data-website-id={UMAMI_WEBSITE_ID}
        strategy="afterInteractive"
        defer
      />
    </>
  );
}
