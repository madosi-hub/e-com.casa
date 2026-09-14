import type { MetadataRoute } from 'next';
import { getProducts } from '@/lib/catalog';
import { COMPANY } from '@/lib/company';
import { journalArticles } from '@/lib/journal-data';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = COMPANY.domain;

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: 'daily', priority: 1 },
    { url: `${base}/shop`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/journal`, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${base}/inspiration`, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${base}/about`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/contact`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/sustainability`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/shipping`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/track`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/returns`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/search`, changeFrequency: 'weekly', priority: 0.3 },
  ];

  const legalDocs = [
    'notice', 'terms', 'privacy', 'cookies', 'cookie-settings', 'returns', 'shipping',
    'warranty', 'product-safety', 'accessibility', 'complaints', 'dispute-resolution',
    'impressum', 'consumer-rights',
  ];
  const legalRoutes: MetadataRoute.Sitemap = legalDocs.map((doc) => ({
    url: `${base}/legal/${doc}`,
    changeFrequency: 'yearly',
    priority: 0.2,
  }));

  let productRoutes: MetadataRoute.Sitemap = [];
  try {
    const { products } = await getProducts({ perPage: 48 });
    productRoutes = products.map((p) => ({
      url: `${base}/product/${p.slug}`,
      lastModified: new Date(p.createdAt),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }));
  } catch {
    productRoutes = [];
  }

  const journalRoutes: MetadataRoute.Sitemap = journalArticles.map((a) => ({
    url: `${base}/journal/${a.slug}`,
    lastModified: new Date(a.date),
    changeFrequency: 'monthly',
    priority: 0.6,
  }));

  return [...staticRoutes, ...productRoutes, ...journalRoutes, ...legalRoutes];
}
