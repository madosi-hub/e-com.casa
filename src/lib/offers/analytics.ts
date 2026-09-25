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
  | 'calculator_opened'
  | 'calculator_closed'
  | 'locale_changed'
  | 'add_to_cart'
  | 'begin_checkout'
  | 'checkout_blocked'
  | 'checkout_payment_attempt'
  | 'checkout_payment_error'
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
    ecomOfferAnalyticsQueue?: Array<{ detail: Record<string, unknown>; url: string; path: string }>;
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
  const queue = window.ecomOfferAnalyticsQueue ??= [];
  queue.push({ detail, url: window.location.href, path: window.location.pathname });
  if (queue.length > 100) queue.splice(0, queue.length - 100);
  window.dispatchEvent(new CustomEvent('ecom:analytics', { detail }));
  if (Array.isArray(window.dataLayer)) window.dataLayer.push(detail);
}
