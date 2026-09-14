import Link from 'next/link';
import { notFound } from 'next/navigation';
import fs from 'fs';
import path from 'path';
import type { Metadata } from 'next';
import { db } from '@/lib/db';
import { getProduct as fetchProduct, getRelatedProducts as fetchRelated, getCompleteTheLook as fetchLook } from '@/lib/catalog';
import { isCatalogProductSaleable } from '@/lib/catalog/saleability';
import { toStorefrontProduct } from '@/lib/catalog/public-product';
import { BuyBox } from '@/components/product/buy-box';
import { ProductCard } from '@/components/product/product-card';
import { Stars } from '@/components/product/product-card';
import { ProductGallery } from '@/components/product/product-gallery';
import { ReviewsSection } from '@/components/product/reviews-section';
import { RecentlyViewed } from '@/components/product/recently-viewed';
import { TrackProductView } from '@/components/product/track-product-view';
import { StickyAddToCart } from '@/components/product/sticky-add-to-cart';
import { formatPrice } from '@/lib/format';
import { COMPANY } from '@/lib/company';
import type { ReviewDTO } from '@/lib/reviews-data';
import type { Product } from '@/types';
import { ChevronRight } from 'lucide-react';

export const dynamic = 'force-dynamic';

async function getProduct(slug: string): Promise<Product | null> {
  try {
    return await fetchProduct(slug);
  } catch {
    return null;
  }
}

function absoluteProductImage(src: string): string {
  return /^https:\/\//i.test(src) ? src : `${COMPANY.domain}${src}`;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();
  const saleable = isCatalogProductSaleable(product);
  return {
    title: saleable ? `${product.name} — ${formatPrice(product.price)}` : product.name,
    description: product.description.slice(0, 155),
    alternates: { canonical: `/product/${product.slug}` },
    robots: {
      index: process.env.NEXT_PUBLIC_INDEXING_ENABLED === 'true' && saleable,
      follow: true,
    },
    openGraph: {
      title: product.name,
      description: product.description.slice(0, 155),
      images: [{ url: product.image }],
    },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();
  const saleable = isCatalogProductSaleable(product);
  const publicProduct = toStorefrontProduct(product) as Product;

  const styleSlugs = product.styleSlugs.split(',').filter(Boolean);
  const spaceSlugs = product.spaceSlugs.split(',').filter(Boolean);

  let related: Product[] = [];
  try {
    related = (await fetchRelated(product.slug, 4)) as Product[];
  } catch {
    related = [];
  }

  let completeTheLook: Product[] = [];
  try {
    const relatedSlugs = new Set(related.map((r) => r.slug));
    completeTheLook = ((await fetchLook(product.slug, 5)) as Product[]).filter((p) => !relatedSlugs.has(p.slug)).slice(0, 4);
  } catch {
    completeTheLook = [];
  }

  // Strip all internal catalogue/hold fields before related products cross the RSC boundary.
  const publicRelated = related.map((p) => toStorefrontProduct(p) as Product);
  const publicCompleteTheLook = completeTheLook.map((p) => toStorefrontProduct(p) as Product);

  const galleryCandidates = [
    product.image,
    ...(product.gallery ? product.gallery.split(',').map((s) => s.trim()) : []),
  ].filter((src, i, arr) => src && arr.indexOf(src) === i);
  const galleryImages = galleryCandidates.filter((src) => {
    if (/^https:\/\//i.test(src)) return true;
    try {
      return fs.existsSync(path.join(process.cwd(), 'public', src));
    } catch {
      return false;
    }
  });

  let dbReviews: ReviewDTO[] = [];
  try {
    const rows = await db.review.findMany({
      where: { productSlug: slug, status: 'APPROVED' },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    dbReviews = rows.map((r) => ({
      id: r.id,
      author: r.author,
      country: r.country,
      rating: r.rating,
      title: r.title,
      body: r.body,
      verified: r.verified,
      createdAt: r.createdAt.toISOString(),
      source: 'customer' as const,
    }));
  } catch {
    dbReviews = [];
  }
  const verifiedRating = dbReviews.length > 0
    ? dbReviews.reduce((sum, review) => sum + review.rating, 0) / dbReviews.length
    : null;

  return (
    <div className="container-ecom py-8 lg:py-12">
      <nav aria-label="Breadcrumb" className="text-[12px] text-muted-foreground">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li><Link href="/" className="hover:text-foreground">Home</Link></li>
          <li aria-hidden><ChevronRight className="h-3 w-3" /></li>
          <li><Link href="/shop" className="hover:text-foreground">Shop</Link></li>
          <li aria-hidden><ChevronRight className="h-3 w-3" /></li>
          <li><Link href={`/shop?category=${product.categorySlug}`} className="capitalize hover:text-foreground">{product.categorySlug.replace(/-/g, ' ')}</Link></li>
          <li aria-hidden><ChevronRight className="h-3 w-3" /></li>
          <li className="text-foreground/80">{product.name}</li>
        </ol>
      </nav>

      <div className="mt-6 grid gap-10 lg:grid-cols-2 lg:gap-14">
        <div>
          <ProductGallery images={galleryImages} productName={product.name} badge={product.badge} />
        </div>

        <div>
          <h1 className="font-display text-[30px] font-medium leading-tight tracking-tight sm:text-[36px]">
            {product.name}
          </h1>
          {product.subtitle && <p className="mt-1.5 text-[14px] text-muted-foreground">{product.subtitle}</p>}
          {verifiedRating !== null && (
            <div className="mt-3 flex items-center gap-2">
              <Stars rating={verifiedRating} />
              <span className="text-[13px] font-medium">{verifiedRating.toFixed(1)}</span>
              <span className="text-[13px] text-muted-foreground">
                · {dbReviews.length} customer review{dbReviews.length === 1 ? '' : 's'}
              </span>
            </div>
          )}

          <p className="mt-5 whitespace-pre-line text-[14.5px] leading-relaxed text-foreground/85">{product.shortDescription || product.description}</p>

          <div className="mt-7">
            <BuyBox product={publicProduct} />
          </div>
          <StickyAddToCart product={publicProduct} />

          {(styleSlugs.length > 0 || spaceSlugs.length > 0) && (
            <div className="mt-7 flex flex-wrap gap-2 border-t border-border pt-5">
              {styleSlugs.map((s) => (
                <Link
                  key={s}
                  href={`/shop?style=${s}`}
                  className="rounded-full border border-border bg-cream/60 px-3 py-1.5 text-[12px] font-medium capitalize text-foreground/75 transition-colors hover:border-olive hover:text-olive"
                >
                  {s.replace(/-/g, ' ')}
                </Link>
              ))}
              {spaceSlugs.map((s) => (
                <Link
                  key={s}
                  href={`/shop?space=${s}`}
                  className="rounded-full border border-border bg-cream/60 px-3 py-1.5 text-[12px] font-medium capitalize text-foreground/75 transition-colors hover:border-olive hover:text-olive"
                >
                  {s.replace(/-/g, ' ')}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-14 max-w-3xl">
        <section aria-labelledby="details-heading">
          <h2 id="details-heading" className="font-display text-[22px] font-medium">Product details</h2>
          <dl className="mt-5 divide-y divide-border rounded-lg border border-border">
            {[
              { label: 'Materials', value: product.materials },
              { label: 'Dimensions', value: product.dimensions },
              { label: 'Care', value: product.care },
              { label: 'Colour', value: product.color },
            ]
              .filter((row) => row.value)
              .map((row) => (
                <div key={row.label} className="grid grid-cols-[130px_1fr] gap-4 px-5 py-3.5">
                  <dt className="text-[12px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{row.label}</dt>
                  <dd className="text-[13.5px] leading-relaxed text-foreground/85">{row.value}</dd>
                </div>
              ))}
            <div className="grid grid-cols-[130px_1fr] gap-4 px-5 py-3.5">
              <dt className="text-[12px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Delivery</dt>
              <dd className="text-[13.5px] leading-relaxed text-foreground/85">
                Standard 3–5 working days (free over €50) · Express 1–2 days ·{' '}
                <Link href="/shipping" className="text-olive underline underline-offset-2">shipping details</Link>
              </dd>
            </div>
            <div className="grid grid-cols-[130px_1fr] gap-4 px-5 py-3.5">
              <dt className="text-[12px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Returns</dt>
              <dd className="text-[13.5px] leading-relaxed text-foreground/85">
                14-day right of withdrawal ·{' '}
                <Link href="/returns" className="text-olive underline underline-offset-2">how to return</Link>
              </dd>
            </div>
          </dl>
        </section>
      </div>

      {publicCompleteTheLook.length >= 2 && (
        <section aria-labelledby="ctl-heading" className="mt-16 border-t border-border pt-12">
          <div className="flex items-end justify-between">
            <div>
              <h2 id="ctl-heading" className="font-display text-[24px] font-medium">Complete the Look</h2>
              <p className="mt-1 text-[13.5px] text-muted-foreground">
                Pieces that pair beautifully with this one — curated for your{' '}
                <span className="capitalize">{spaceSlugs[0]?.replace(/-/g, ' ') ?? 'space'}</span>.
              </p>
            </div>
            <Link href={`/shop?space=${spaceSlugs[0] ?? ''}`} className="hidden text-[13px] font-medium text-foreground/70 hover:text-foreground sm:block">
              Shop the space →
            </Link>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-4">
            {publicCompleteTheLook.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {publicRelated.length > 0 && (
        <section aria-labelledby="related-heading" className="mt-16 border-t border-border pt-12">
          <div className="flex items-end justify-between">
            <h2 id="related-heading" className="font-display text-[24px] font-medium">You may also like</h2>
            <Link href="/shop" className="text-[13px] font-medium text-foreground/70 hover:text-foreground">
              View all →
            </Link>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-4">
            {publicRelated.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      <ReviewsSection slug={product.slug} dbReviews={dbReviews} />
      <RecentlyViewed excludeSlug={product.slug} />
      <TrackProductView slug={product.slug} />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Product',
            name: product.name,
            image: absoluteProductImage(product.image),
            description: product.description,
            sku: product.sku,
            brand: { '@type': 'Brand', name: COMPANY.brand },
            ...(verifiedRating !== null
              ? {
                  aggregateRating: {
                    '@type': 'AggregateRating',
                    ratingValue: Number(verifiedRating.toFixed(2)),
                    reviewCount: dbReviews.length,
                  },
                }
              : {}),
            ...(saleable
              ? {
                  offers: {
                    '@type': 'Offer',
                    url: `${COMPANY.domain}/product/${product.slug}`,
                    priceCurrency: product.currency,
                    price: product.price,
                    availability: product.stockUnlimited ? 'https://schema.org/PreOrder' : product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
                    itemCondition: 'https://schema.org/NewCondition',
                  },
                }
              : {}),
          }),
        }}
      />
    </div>
  );
}
