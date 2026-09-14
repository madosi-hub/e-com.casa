'use client';

export type OfferAnalyticsEvent =
  | 'offer_view'
  | 'product_view'
  | 'variant_selected'
  | 'quantity_changed'
  | 'review_interaction'
  | 'faq_open'
  | 'video_play'
  | 'calculator_used'
  | 'locale_changed'
  | 'add_to_cart'
  | 'begin_checkout'
  | 'purchase';

export interface OfferAnalyticsPayload {
  offerSlug?: string;
  productSlug?: string;
  variantId?: string;
  quantity?: number;
  value?: number;
  currency?: string;
  [key: string]: string | number | boolean | null | undefined;
}

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
  }
}

/**
 * One neutral event bus for Offers. Provider-specific integrations can subscribe
 * to `ecom:analytics` or consume dataLayer later without coupling UI components
 * to Meta, Google, TikTok, Pinterest or any other vendor.
 */
export function trackOfferEvent(event: OfferAnalyticsEvent, payload: OfferAnalyticsPayload = {}): void {
  if (typeof window === 'undefined') return;
  const detail = {
    event,
    ...payload,
    timestamp: new Date().toISOString(),
  };
  window.dispatchEvent(new CustomEvent('ecom:analytics', { detail }));
  if (Array.isArray(window.dataLayer)) window.dataLayer.push(detail);
}
