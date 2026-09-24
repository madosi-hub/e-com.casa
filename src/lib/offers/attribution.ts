'use client';

export interface OfferAttribution {
  offerSlug: string;
  src: string | null;
  sck: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  referrer: string | null;
  landingPage: string;
  firstSeenAt: string;
  lastSeenAt: string;
}

const STORAGE_KEY = 'ecom-casa-offer-attribution-v1';
const TRACKING_KEYS = ['src', 'sck', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const;
let memory: OfferAttribution | null = null;

export function captureOfferAttribution(offerSlug: string): OfferAttribution | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const saved = getOfferAttribution();
  // A new campaign/source starts a new attribution set; never mix ad IDs.
  const changed = ['utm_campaign', 'utm_source', 'sck'].some(key => {
    const value = params.get(key);
    return value && saved?.[key as keyof OfferAttribution] && value !== saved[key as keyof OfferAttribution];
  });
  const previous = changed ? null : saved;
  const now = new Date().toISOString();
  const next: OfferAttribution = {
    offerSlug,
    src: params.get('src') || previous?.src || null,
    sck: params.get('sck') || previous?.sck || null,
    utm_source: params.get('utm_source') || previous?.utm_source || null,
    utm_medium: params.get('utm_medium') || previous?.utm_medium || null,
    utm_campaign: params.get('utm_campaign') || previous?.utm_campaign || null,
    utm_content: params.get('utm_content') || previous?.utm_content || null,
    utm_term: params.get('utm_term') || previous?.utm_term || null,
    referrer: document.referrer || previous?.referrer || null,
    landingPage: `${window.location.pathname}${window.location.search}`,
    firstSeenAt: previous?.firstSeenAt ?? now,
    lastSeenAt: now,
  };
  memory = next;
  // Each fallback is independent: blocked storage must not break checkout.
  for (const name of ['sessionStorage', 'localStorage'] as const) {
    try { window[name].setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* memory + URL fallback */ }
  }
  return next;
}

export function getOfferAttribution(): OfferAttribution | null {
  if (typeof window === 'undefined') return null;
  if (memory) return memory;
  for (const name of ['sessionStorage', 'localStorage'] as const) {
    try {
      const raw = window[name].getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) as OfferAttribution : null;
      if (parsed?.offerSlug) return parsed;
    } catch { /* try the next fallback */ }
  }
  return memory;
}

export function offerTrackingParameters(offerSlug: string): Record<string, string | null> {
  const attribution = captureOfferAttribution(offerSlug);
  return Object.fromEntries(TRACKING_KEYS.map(key => [key, attribution?.[key] || null]));
}

/** Carry only attribution fields, never checkout tokens or payment secrets. */
export function withOfferAttribution(path: string, offerSlug: string): string {
  if (typeof window === 'undefined') return path;
  const url = new URL(path, window.location.origin);
  if (url.origin !== window.location.origin) return path;
  for (const [key, value] of Object.entries(offerTrackingParameters(offerSlug))) {
    if (value && !url.searchParams.has(key)) url.searchParams.set(key, value);
  }
  return `${url.pathname}${url.search}${url.hash}`;
}

export function clearOfferAttribution(): void {
  memory = null;
  if (typeof window !== 'undefined') {
    for (const name of ['sessionStorage', 'localStorage'] as const) {
      try { window[name].removeItem(STORAGE_KEY); } catch { /* storage unavailable */ }
    }
  }
}
