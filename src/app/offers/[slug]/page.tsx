import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { ProductFunnelPage } from '@/components/offers/product-funnel-page';
import { resolveOffer } from '@/lib/offers/resolver';
import { resolveOfferMarket } from '@/lib/offers/geo';
import { isCatalogProductSaleable } from '@/lib/catalog/saleability';
import { toStorefrontProduct } from '@/lib/catalog/public-product';
import { COMPANY } from '@/lib/company';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const resolved = await resolveOffer(slug);
  if (!resolved) notFound();

  const requestHeaders = await headers();
  const market = resolveOfferMarket(requestHeaders);
  const { offer, product } = resolved;
  const seo = offer.translations?.[market.language]?.seo ?? offer.seo;
  const canonical = `/offers/${offer.slug}`;

  return {
    title: seo.title,
    description: seo.description,
    alternates: { canonical },
    openGraph: {
      title: seo.title,
      description: seo.description,
      url: canonical,
      type: 'website',
      locale: market.locale.replace('-', '_'),
      images: product.image ? [{ url: product.image }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: seo.title,
      description: seo.description,
      images: product.image ? [product.image] : undefined,
    },
    robots: {
      index: process.env.NEXT_PUBLIC_INDEXING_ENABLED === 'true' && isCatalogProductSaleable(product),
      follow: true,
    },
  };
}

export default async function OfferRoute({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const resolved = await resolveOffer(slug);
  if (!resolved) notFound();

  const requestHeaders = await headers();
  const market = resolveOfferMarket(requestHeaders);
  const { offer, product } = resolved;
  const publicProduct = toStorefrontProduct(product);
  const seo = offer.translations?.[market.language]?.seo ?? offer.seo;
  const image = product.image?.startsWith('http') ? product.image : `${COMPANY.domain}${product.image}`;

  // Campaign reviews remain presentation content. We deliberately do not emit
  // AggregateRating/Review schema until a verified review source is connected.
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: seo.title,
    description: seo.description,
    inLanguage: market.locale,
    url: `${COMPANY.domain}/offers/${offer.slug}`,
    primaryImageOfPage: image ? { '@type': 'ImageObject', url: image } : undefined,
    mainEntity: {
      '@type': 'Product',
      name: product.name.trim(),
      sku: product.sku,
      image: image ? [image] : undefined,
      description: offer.subheadline || product.description,
      brand: { '@type': 'Brand', name: product.brand ?? COMPANY.brand },
    },
  };

  const page = <ProductFunnelPage offer={offer} product={publicProduct} market={market} />;

  return (
    <>
      {page}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
    </>
  );
}
