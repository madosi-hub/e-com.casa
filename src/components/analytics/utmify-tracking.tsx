'use client';

import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { captureOfferAttribution } from '@/lib/offers/attribution';

// Public pixel configuration from the supplied UTMify script.
const UTMIFY_PIXEL_ID = '6a990085ab8032da69cbb97d';
const UTMIFY_IC_TRIGGER_ID = 'utmify-initiate-checkout-trigger';

export function isCheckoutEntryPath(pathname: string): boolean {
  return /\/checkout\/?$/.test(pathname);
}

export function dispatchUtmifyInitiateCheckout(): void {
  document.getElementById(UTMIFY_IC_TRIGGER_ID)?.click();
}

/** Loads UTMify automatically on every public page. */
export function UtmifyTracking() {
  const pathname = usePathname();
  const enabled = !pathname.startsWith('/admin');
  const [pixelReady, setPixelReady] = useState(false);

  useEffect(() => {
    if (enabled) captureOfferAttribution(pathname.split('/')[2] || 'storefront');
  }, [enabled, pathname]);

  useEffect(() => {
    if (!enabled || !pixelReady || !isCheckoutEntryPath(pathname)) return;

    // UTMify's public pixel identifies InitiateCheckout through checkout links
    // and buttons. Its listener starts asynchronously after the script loads,
    // so retry the inert trigger briefly. The pixel deduplicates the event in
    // the current document; retries only make SPA/direct checkout entry robust.
    const delays = [0, 1_500, 3_000, 5_000, 7_500];
    const timers = delays.map((delay) => window.setTimeout(dispatchUtmifyInitiateCheckout, delay));
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [enabled, pathname, pixelReady]);

  if (!enabled) return null;

  return (
    <>
      <Script
        id="utmify-utms"
        src="https://cdn.utmify.com.br/scripts/utms/latest.js"
        data-utmify-prevent-subids=""
        async
        defer
      />
      <Script
        id="utmify-pixel-config"
        strategy="afterInteractive"
      >
        {`window.pixelId = ${JSON.stringify(UTMIFY_PIXEL_ID)};`}
      </Script>
      <Script
        id="utmify-pixel"
        src="https://cdn.utmify.com.br/scripts/pixel/pixel.js"
        strategy="afterInteractive"
        async
        defer
        onReady={() => setPixelReady(true)}
      />
      <button
        id={UTMIFY_IC_TRIGGER_ID}
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        className="hidden"
      >
        Iniciar checkout
      </button>
    </>
  );
}
