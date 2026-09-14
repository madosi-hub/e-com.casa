import type { MetadataRoute } from 'next';
import { COMPANY } from '@/lib/company';

export default function robots(): MetadataRoute.Robots {
  // Demo catalogue is synthetic — keep it out of search results until
  // NEXT_PUBLIC_INDEXING_ENABLED=true signals a real, production catalogue.
  const indexingEnabled = process.env.NEXT_PUBLIC_INDEXING_ENABLED === 'true';
  return {
    rules: [
      {
        userAgent: '*',
        ...(indexingEnabled
          ? { allow: '/', disallow: ['/api/', '/checkout/success', '/account/'] }
          : { disallow: '/' }),
      },
    ],
    ...(indexingEnabled ? { sitemap: `${COMPANY.domain}/sitemap.xml` } : {}),
    host: COMPANY.domain,
  };
}
