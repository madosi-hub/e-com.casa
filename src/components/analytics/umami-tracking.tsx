'use client';

import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

const UMAMI_WEBSITE_ID = 'b400c97b-5e22-4645-b937-11f5428f2705';
const UMAMI_HOST = 'https://umamim.madosi.online';
const VIEW_DEDUP_MS = 30 * 60_000;
const PAGEVIEW_KEY = 'ecom-umami-last-pageview-v1';
const recentViews = new Map<string, { value: string; at: number }>();
type UmamiPayload = Record<string, unknown>;
type PendingCustomEvent = { name: string; data: UmamiPayload; url: string; dedupKey?: string };
const pendingCustomEvents: PendingCustomEvent[] = [];

declare global {
  interface Window {
    umami?: { track: (event?: string | ((props: UmamiPayload) => UmamiPayload), data?: UmamiPayload) => void };
  }
}

function safeValue(value: string | null | undefined): string | null {
  if (!value) return null;
  return value.replace(/\s+/g, ' ').trim().slice(0, 120) || null;
}

function trackOnce(key: string, value: string, send: () => void) {
  const now = Date.now();
  let previous = recentViews.get(key);
  try {
    const stored = window.sessionStorage.getItem(key);
    if (stored) previous = JSON.parse(stored) as { value: string; at: number };
  } catch { /* Memory still deduplicates within this document. */ }
  if (previous?.value === value && now - previous.at < VIEW_DEDUP_MS) return;

  send();
  const current = { value, at: now };
  recentViews.set(key, current);
  try { window.sessionStorage.setItem(key, JSON.stringify(current)); } catch { /* Storage may be unavailable. */ }
}

export function trackPageView() {
  if (window.location.pathname.startsWith('/admin')) return;
  if (typeof window.umami?.track !== 'function') return;
  // Count route visits, not query/hash rewrites or repeated mounts/reloads.
  trackOnce(PAGEVIEW_KEY, window.location.pathname, () => window.umami?.track());
}

export function flushOfferEvents() {
  const umami = window.umami;
  if (typeof umami?.track !== 'function') return;
  const queue = window.ecomOfferAnalyticsQueue ?? [];
  window.ecomOfferAnalyticsQueue = [];
  for (const { detail, url, path } of queue) {
    const { event, timestamp: _timestamp, ...data } = detail;
    if (!event) continue;
    const name = String(event);
    const send = () => umami.track((props) => ({ ...props, url, name, data }));
    if (name === 'offer_view' || name === 'product_view') {
      const key = `ecom-umami-impression-v1:${path}:${name}:${String(data.offerSlug ?? '')}:${String(data.productSlug ?? '')}`;
      trackOnce(key, 'seen', send);
    } else {
      send();
    }
  }
}

function sendCustomEvent(event: PendingCustomEvent) {
  const umami = window.umami;
  if (typeof umami?.track !== 'function') return;
  const send = () => umami.track((props) => ({ ...props, url: event.url, name: event.name, data: event.data }));
  if (event.dedupKey) trackOnce(event.dedupKey, 'seen', send);
  else send();
}

export function trackCustomEvent(name: string, data: UmamiPayload, dedupKey?: string) {
  const event = { name, data, dedupKey, url: window.location.href };
  if (typeof window.umami?.track === 'function') {
    sendCustomEvent(event);
    return;
  }
  pendingCustomEvents.push(event);
  if (pendingCustomEvents.length > 100) pendingCustomEvents.shift();
}

export function flushCustomEvents() {
  if (typeof window.umami?.track !== 'function') return;
  for (const event of pendingCustomEvents.splice(0)) sendCustomEvent(event);
}

function onUmamiReady() {
  trackPageView();
  flushOfferEvents();
  flushCustomEvents();
}

export function UmamiTracking() {
  const pathname = usePathname();
  const enabled = !pathname.startsWith('/admin');

  useEffect(() => {
    if (!enabled) return;

    onUmamiReady();

    const onClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest('a,button') : null;
      if (!target) return;
      const label = safeValue(
        target.getAttribute('aria-label') ||
        target.getAttribute('title') ||
        target.textContent,
      );
      const eventName = label ? `ui_click · ${label}` : 'ui_click';
      trackCustomEvent(eventName, {
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
        const path = window.location.pathname;
        trackCustomEvent('section_view', { path, section }, `ecom-umami-section-v1:${path}:${section}`);
      }
    }, { threshold: 0.2 });

    document.querySelectorAll('main, section, form, header, footer').forEach((element) => observer.observe(element));
    window.addEventListener('ecom:analytics', flushOfferEvents);
    document.addEventListener('click', onClick, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener('ecom:analytics', flushOfferEvents);
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
        data-auto-pageview="false"
        data-exclude-hash="true"
        strategy="afterInteractive"
        defer
        onReady={onUmamiReady}
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
