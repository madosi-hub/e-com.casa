'use client';

import Script from 'next/script';
import { usePathname } from 'next/navigation';

// Public pixel configuration from the supplied UTMify script.
const UTMIFY_PIXEL_ID = '6a990085ab8032da69cbb97d';

/** Loads UTMify automatically on every public page. */
export function UtmifyTracking() {
  const pathname = usePathname();
  const enabled = !pathname.startsWith('/admin');

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
      />
    </>
  );
}
