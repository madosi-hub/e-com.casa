'use client';

export interface OfferAttribution {
  offerSlug: string;
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

export function captureOfferAttribution(offerSlug: string): OfferAttribution | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const previous = getOfferAttribution();
  const now = new Date().toISOString();
  const next: OfferAttribution = {
    offerSlug,
    utm_source: params.get('utm_source') ?? previous?.utm_source ?? null,
    utm_medium: params.get('utm_medium') ?? previous?.utm_medium ?? null,
    utm_campaign: params.get('utm_campaign') ?? previous?.utm_campaign ?? null,
    utm_content: params.get('utm_content') ?? previous?.utm_content ?? null,
    utm_term: params.get('utm_term') ?? previous?.utm_term ?? null,
    referrer: document.referrer || previous?.referrer || null,
    landingPage: `${window.location.pathname}${window.location.search}`,
    firstSeenAt: previous?.firstSeenAt ?? now,
    lastSeenAt: now,
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function getOfferAttribution(): OfferAttribution | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as OfferAttribution;
    return parsed?.offerSlug ? parsed : null;
  } catch {
    return null;
  }
}

export function clearOfferAttribution(): void {
  if (typeof window !== 'undefined') window.localStorage.removeItem(STORAGE_KEY);
}
