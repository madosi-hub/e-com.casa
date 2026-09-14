// Partner-only import: validate first, atomically upsert and archive/remove mocks.
import { PrismaClient } from '@prisma/client';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const db = new PrismaClient();

interface ArtifactProduct {
  sku: string;
  slug: string;
  name: string;
  subtitle: string;
  shortDescription: string;
  description: string;
  price: string;
  priceCents: number;
  comparePrice: string | null;
  currency: string;
  categorySlug: string;
  subcategorySlugs: string;
  spaceSlugs: string;
  styleSlugs: string;
  collectionSlugs: string;
  image: string;
  hoverImage: string | null;
  gallery: string;
  imageStatus: string;
  badge: string | null;
  rating: number;
  reviewCount: number;
  stock: number;
  stockKnown: boolean;
  stockUnlimited: boolean;
  brand: string | null;
  manufacturer: string | null;
  supplierKey: string | null;
  supplierProductId: string | null;
  mediaRights: string | null;

  availability: string;
  isBestSeller: boolean;
  isNew: boolean;
  featured: boolean;
  materials: string;
  dimensions: string;
  weight: string | null;
  care: string;
  color: string;
  shippingClass: string;
  variants: unknown[];
  electrical: boolean;
  battery: boolean;
  complianceStatus: string;
  reviewMode: string;
  documentationStatus: string;
  safetyJson: string;
  requiresComplianceReview: boolean;
  isDemo: boolean;
  sourceResearchId: string | null;
  sourceDomain: string | null;
  sourceUrl: string | null;
}

function readArtifact(file: string): unknown | null {
  const p = path.join(process.cwd(), 'data', 'catalog', file);
  if (!existsSync(p)) return null;
  return JSON.parse(readFileSync(p, 'utf-8'));
}

async function main() {
  console.log('E-com.casa seed — idempotent partner catalogue import');

  const catalog = readArtifact('generated-provider-catalog.json') as { categories?: Array<{ slug: string; name: string; type: string; image: string; subtitle?: string }> } | null;
  const products = (readArtifact('generated-provider-products.json') as ArtifactProduct[] | null)?.filter(p => p.categorySlug !== 'amostras' && !/\b(amostras?|samples?)\b/i.test(p.name)) ?? null;

  if (!products || !Array.isArray(products) || products.length === 0) {
    console.error('No /data/catalog/generated-provider-products.json found. Run `npm run catalog:sync:partners` first.');
    process.exit(1);
  }

  if (products.length < 240 || products.filter(p => p.supplierKey === 'odem').length < 40 || products.filter(p => p.supplierKey === 'woodupp').length < 200) throw new Error('Incomplete partner snapshot');
  if (products.some(p => p.isDemo || !p.stockUnlimited || !['odem', 'woodupp', 'nuralta'].includes(p.supplierKey ?? '') || !p.supplierProductId || !p.sku || !p.slug)) throw new Error('Invalid partner identity or stock policy');
  if (new Set(products.map(p => p.sku)).size !== products.length || new Set(products.map(p => p.slug)).size !== products.length) throw new Error('Duplicate SKU/slug');
  if (!catalog?.categories?.length || products.some(p => !catalog.categories!.some(c => c.slug === p.categorySlug))) throw new Error('Missing categories');
  console.log(`Validated ${products.length} products`);
  if (process.argv.includes('--dry-run')) return;

  await db.$transaction(async (tx) => {
  // Categories
  const categories = catalog?.categories ?? [];
  for (const [i, c] of categories.entries()) {
    await tx.category.upsert({
      where: { type_slug: { type: c.type, slug: c.slug } },
      create: {
        slug: c.slug,
        name: c.name,
        type: c.type,
        image: c.image,
        subtitle: c.subtitle ?? null,
        sortOrder: i + 1,
      },
      update: { name: c.name, image: c.image, subtitle: c.subtitle ?? null },
    });
  }
  console.log(`✔ categories: ${categories.length} upserted`);

  // Products (stable SKU identity — idempotent)
  let created = 0;
  let updated = 0;
  for (const [i, p] of products.entries()) {
    const data = {
      slug: p.slug,
      sku: p.sku,
      name: p.name,
      subtitle: p.subtitle,
      shortDescription: p.shortDescription,
      description: p.description,
      price: p.price,
      priceCents: p.priceCents,
      comparePrice: p.comparePrice,
      currency: p.currency,
      categorySlug: p.categorySlug,
      subcategorySlugs: p.subcategorySlugs,
      spaceSlugs: p.spaceSlugs,
      styleSlugs: p.styleSlugs,
      collectionSlugs: p.collectionSlugs,
      image: p.image,
      hoverImage: p.hoverImage,
      gallery: p.gallery,
      imageStatus: p.imageStatus,
      badge: p.badge,
      rating: p.rating,
      reviewCount: p.reviewCount,
      stock: p.stock,
      stockKnown: p.stockKnown,
      stockUnlimited: p.stockUnlimited,
      brand: p.brand,
      manufacturer: p.manufacturer,
      supplierKey: p.supplierKey,
      supplierProductId: p.supplierProductId,
      mediaRights: p.mediaRights,

      availability: p.availability,
      isBestSeller: p.isBestSeller,
      isNew: p.isNew,
      featured: p.featured,
      materials: p.materials,
      dimensions: p.dimensions,
      weight: p.weight,
      care: p.care,
      color: p.color,
      shippingClass: p.shippingClass,
      variantsJson: JSON.stringify(p.variants ?? []),
      electrical: p.electrical,
      battery: p.battery,
      complianceStatus: p.complianceStatus,
      reviewMode: p.reviewMode,
      documentationStatus: p.documentationStatus,
      safetyJson: p.safetyJson,
      requiresComplianceReview: p.requiresComplianceReview,
      isDemo: p.isDemo,
      sourceResearchId: p.sourceResearchId,
      sourceDomain: p.sourceDomain,
      sourceUrl: p.sourceUrl,
      sortOrder: i + 1,
    };
    const existing = await tx.product.findUnique({ where: { sku: p.sku } });
    if (existing) {
      await tx.product.update({ where: { sku: p.sku }, data });
      updated++;
    } else {
      await tx.product.create({ data });
      created++;
    }
  }
  const offerSeeds = readArtifact('product-offers.json') as Array<{ productSlug: string; slug: string; enabled: boolean; discountPct: number | null; fixedPriceCents: number | null; startsAt: string; endsAt: string; version: number }> | null;
  if (offerSeeds) {
    await tx.productOffer.createMany({ data: offerSeeds.map(o => ({ ...o, startsAt: new Date(o.startsAt), endsAt: new Date(o.endsAt) })), skipDuplicates: true });
    console.log(`✔ offer configuration seeded without overwriting merchant settings`);
  }
  console.log(`✔ products: ${products.length} processed (${created} created, ${updated} updated)`);

  // Keep an internal recoverable copy of mock catalogue rows, then remove them.
  // Orders/reviews are separate records and are never rewritten or deleted.
  await tx.$executeRawUnsafe('CREATE TABLE IF NOT EXISTS "CatalogMockArchive" ("id" TEXT PRIMARY KEY, "row" JSONB NOT NULL, "archivedAt" TIMESTAMPTZ NOT NULL DEFAULT now())');
  await tx.$executeRaw`INSERT INTO "CatalogMockArchive" ("id", "row") SELECT "id", to_jsonb(p) FROM "Product" p WHERE "isDemo" = true OR "sku" = 'EC-WAL-001' OR "categorySlug" = 'amostras' OR "name" ~* '(amostra|sample)' ON CONFLICT ("id") DO NOTHING`;
  const removed = await tx.product.deleteMany({ where: { OR: [{ isDemo: true }, { sku: 'EC-WAL-001' }, { categorySlug: 'amostras' }, { name: { contains: 'amostra', mode: 'insensitive' } }, { name: { contains: 'sample', mode: 'insensitive' } }] } });
  console.log(`Removed ${removed.count} mock products (recoverable archive retained)`);

  await tx.category.deleteMany({ where: { type: 'shop', slug: { in: ['amostras', 'acessorios', 'produtos-instalacao', 'acessorios-divisorias'] } } });

  // Integrity checks (idempotency + data quality)
  const total = await tx.product.count();
  const dupSkus = await tx.$queryRaw<Array<{ sku: string; n: number }>>`
    SELECT sku, COUNT(*)::int AS n FROM "Product" GROUP BY sku HAVING COUNT(*) > 1`;
  const withoutSku = await tx.product.count({ where: { sku: '' } });
  const demoCount = await tx.product.count({ where: { isDemo: true } });
  const missing = await tx.product.count({
    where: { OR: [{ image: '' }, { description: '' }, { categorySlug: '' }, { price: '' }] },
  });

  console.log(`✔ integrity: total=${total} duplicateSKUs=${dupSkus.length} missingSku=${withoutSku} demo=${demoCount} incomplete=${missing}`);
  if (dupSkus.length > 0) throw new Error('Duplicate SKUs detected — seed identity violated');
  if (missing > 0) console.warn('⚠ some products are missing required display data (image/description/category/price)');

  }, { timeout: 120000 });
  console.log('Seed complete ✔ (safe to re-run)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
