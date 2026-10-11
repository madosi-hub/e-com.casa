import { readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { PrismaClient } from '@prisma/client';
import nextEnv from '@next/env';

export function readStorefrontCatalog() {
  const directory = path.resolve('data/catalog');
  const products = [
    ...JSON.parse(readFileSync(path.join(directory, 'storefront-products.json'), 'utf8')),
    ...JSON.parse(readFileSync(path.join(directory, 'lighting-preview-products.json'), 'utf8')),
  ];
  const { categories } = JSON.parse(readFileSync(path.join(directory, 'storefront-catalog.json'), 'utf8'));
  if (!Array.isArray(products) || !Array.isArray(categories)) throw new Error('Invalid storefront catalogue');
  const slugs = new Set();
  const skus = new Set();
  for (const product of products) {
    if (!product.sku || skus.has(product.sku) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(product.slug) || slugs.has(product.slug)) throw new Error('Invalid or duplicate storefront identity');
    if (!Number.isSafeInteger(product.priceCents) || product.priceCents <= 0 || product.price !== (product.priceCents / 100).toFixed(2) || product.currency !== 'EUR') throw new Error('Invalid storefront price');
    if (!Number.isSafeInteger(product.stock) || product.stock < 0 || !product.stockKnown || product.stockUnlimited) throw new Error('Storefront products require confirmed, finite stock');
    if (!categories.some(category => category.type === 'shop' && category.slug === product.categorySlug)) throw new Error('Missing storefront category');
    if (product.isDemo || !product.sourceUrl || !product.image || !Array.isArray(product.variants)) throw new Error('Incomplete storefront product');
    slugs.add(product.slug);
    skus.add(product.sku);
  }
  return { products, categories };
}

/** First import initializes stock; subsequent imports never replenish sold units. */
export async function importStorefrontCatalog(client) {
  const { products, categories } = readStorefrontCatalog();
  for (const category of categories) {
    const { id: _id, ...data } = category;
    await client.category.upsert({ where: { type_slug: { type: category.type, slug: category.slug } }, create: data, update: data });
  }
  for (const product of products) {
    const { id: _id, createdAt: _createdAt, variants, ...fields } = product;
    const create = { ...fields, published: true, variantsJson: JSON.stringify(variants) };
    const { stock: _stock, stockKnown: _known, stockUnlimited: _unlimited, availability: _availability, published: _published, ...update } = create;
    await client.product.upsert({ where: { sku: product.sku }, create, update });
  }
  return products.length;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const { products } = readStorefrontCatalog();
  if (process.argv.includes('--dry-run')) {
    console.log(`Validated ${products.length} storefront product(s): ${products.map(product => `${product.slug} · ${product.price} EUR · ${product.stock} units`).join(', ')}`);
  } else {
    nextEnv.loadEnvConfig(process.cwd());
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required to import storefront products. Use --dry-run to validate without a database.');
    const client = new PrismaClient();
    try {
      const count = await client.$transaction(tx => importStorefrontCatalog(tx));
      console.log(`Imported ${count} storefront product(s). Existing stock preserved.`);
    } finally {
      await client.$disconnect();
    }
  }
}
