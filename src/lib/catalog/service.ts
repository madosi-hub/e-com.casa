import { db } from '@/lib/db';
import { getProductOffers } from '../offers/store';
import { applyCommerce } from './commerce';
import { PrismaCatalogAdapter } from './prisma-adapter';
import { FileCatalogAdapter, matchesCatalogProduct, sortCatalogProducts } from './file-adapter';
import {
  getCompleteTheLook as computeCompleteTheLook,
  getRelatedProducts as computeRelated,
  getCrossSell as computeCrossSell,
} from './recommendations';
import type {
  CatalogAdapter,
  CatalogCategory,
  CatalogProduct,
  ProductListResult,
  ProductQuery,
} from './types';

export type { CatalogProduct, CatalogCategory, ProductListResult, ProductQuery, ProductVariant } from './types';
export { mapProduct } from './prisma-adapter';

const prismaAdapter = new PrismaCatalogAdapter(db);
const fileAdapter = new FileCatalogAdapter();

let databaseHealthy: boolean | null = null;
let productTableReady: boolean | null = null;
let lastHealthCheck = 0;
const HEALTH_TTL_MS = 60_000;

async function activeAdapter(): Promise<CatalogAdapter> {
  if (databaseHealthy === null || Date.now() - lastHealthCheck > HEALTH_TTL_MS) {
    try {
      await db.$queryRaw`SELECT 1`;
      databaseHealthy = true;
      productTableReady = null;
    } catch {
      databaseHealthy = false;
      productTableReady = false;
    }
    lastHealthCheck = Date.now();
  }

  if (!databaseHealthy) return fileAdapter;

  if (productTableReady !== false) {
    try {
      if ((await prismaAdapter.count()) > 0) {
        productTableReady = true;
        return prismaAdapter;
      }
      productTableReady = false;
    } catch {
      productTableReady = false;
    }
  }

  return fileAdapter;
}

export async function catalogStatus(): Promise<{ adapter: string; products: number; source?: string }> {
  const adapter = await activeAdapter();
  try {
    return {
      adapter: adapter.name,
      products: await adapter.count(),
      source: adapter === fileAdapter ? fileAdapter.getSource() : 'postgresql',
    };
  } catch (error) {
    if (adapter !== fileAdapter) markDatabaseUnavailable('status read', error);
    return {
      adapter: fileAdapter.name,
      products: await fileAdapter.count(),
      source: fileAdapter.getSource(),
    };
  }
}

type RawCatalogue = { adapter: string; at: number; products: CatalogProduct[] };

let rawCache: RawCatalogue | null = null;
let rawCachePromise: { adapter: string; promise: Promise<RawCatalogue> } | null = null;

function databaseErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown catalogue database error';
}

function markDatabaseUnavailable(operation: string, error: unknown): void {
  databaseHealthy = false;
  productTableReady = false;
  lastHealthCheck = Date.now();
  if (rawCache?.adapter === prismaAdapter.name) rawCache = null;
  console.warn(`[catalog] PostgreSQL ${operation} failed; using the provider snapshot.`, databaseErrorMessage(error));
}

function mergeProducts(fallback: CatalogProduct[], primary: CatalogProduct[]): CatalogProduct[] {
  const bySlug = new Map(fallback.map((product) => [product.slug, product]));
  for (const product of primary) bySlug.set(product.slug, product);
  return [...bySlug.values()];
}

async function buildRawCatalogue(adapter: CatalogAdapter): Promise<RawCatalogue> {
  if (adapter === fileAdapter) {
    return { adapter: fileAdapter.name, at: Date.now(), products: fileAdapter.getAllProducts() };
  }

  try {
    const primary = await prismaAdapter.listAll();
    return {
      adapter: prismaAdapter.name,
      at: Date.now(),
      products: mergeProducts(fileAdapter.getAllProducts(), primary),
    };
  } catch (error) {
    markDatabaseUnavailable('catalogue read', error);
    return { adapter: fileAdapter.name, at: Date.now(), products: fileAdapter.getAllProducts() };
  }
}

async function getRawCatalogue(adapter: CatalogAdapter): Promise<RawCatalogue> {
  if (rawCache && rawCache.adapter === adapter.name && Date.now() - rawCache.at <= 30_000) return rawCache;
  if (rawCachePromise?.adapter === adapter.name) return rawCachePromise.promise;

  const promise = buildRawCatalogue(adapter);
  rawCachePromise = { adapter: adapter.name, promise };

  try {
    rawCache = await promise;
    return rawCache;
  } finally {
    if (rawCachePromise?.promise === promise) rawCachePromise = null;
  }
}

async function catalogOffers() {
  try {
    return await getProductOffers();
  } catch (error) {
    console.warn('[catalog] Product offers unavailable; using base prices.', error);
    return [];
  }
}

export async function getProducts(query: ProductQuery = {}): Promise<ProductListResult> {
  const adapter = await activeAdapter();
  const catalogue = await getRawCatalogue(adapter);

  const offers = await catalogOffers();
  const priced = catalogue.products
    .map((product) => applyCommerce({
      ...product,
      funnelOffer: offers.find((offer) => offer.productSlug === product.slug) ?? null,
    }))
    .filter((product) => (!query.funnelOnly || Boolean(product.offerSlug)) && matchesCatalogProduct(product, query));

  const sorted = sortCatalogProducts(priced, query.sort);
  const page = Math.max(1, query.page ?? 1);
  const perPage = Math.min(48, Math.max(1, query.perPage ?? 24));

  return {
    products: sorted.slice((page - 1) * perPage, page * perPage),
    total: sorted.length,
    page,
    perPage,
    totalPages: Math.max(1, Math.ceil(sorted.length / perPage)),
  };
}

export async function getProduct(slug: string): Promise<CatalogProduct | null> {
  const adapter = await activeAdapter();
  let product: CatalogProduct | null = null;

  try {
    product = await adapter.getBySlug(slug);
  } catch (error) {
    if (adapter !== fileAdapter) markDatabaseUnavailable('product read', error);
  }

  if (!product && adapter !== fileAdapter) product = await fileAdapter.getBySlug(slug);
  if (!product) return null;
  const offers = await catalogOffers();
  return applyCommerce({ ...product, funnelOffer: offers.find((offer) => offer.productSlug === product.slug) ?? null });
}

export async function getCategories(type?: CatalogCategory['type']): Promise<CatalogCategory[]> {
  const adapter = await activeAdapter();
  const fallback = await fileAdapter.getCategories(type);
  if (adapter === fileAdapter) return fallback;

  try {
    const primary = await adapter.getCategories(type);
    const byKey = new Map(fallback.map((category) => [`${category.type}:${category.slug}`, category]));
    for (const category of primary) byKey.set(`${category.type}:${category.slug}`, category);
    return [...byKey.values()].sort((a, b) => a.sortOrder - b.sortOrder);
  } catch (error) {
    markDatabaseUnavailable('category read', error);
    return fallback;
  }
}

export async function getFeaturedProducts(limit = 8): Promise<CatalogProduct[]> {
  const { products } = await getProducts({ sort: 'featured', perPage: 48 });
  return products.filter((product) => product.featured).slice(0, limit);
}

export async function getBestSellers(limit = 8): Promise<CatalogProduct[]> {
  const { products } = await getProducts({ sort: 'best', perPage: 48 });
  return products.filter((product) => product.isBestSeller).slice(0, limit);
}

export async function getNewArrivals(limit = 8): Promise<CatalogProduct[]> {
  const { products } = await getProducts({ sort: 'new', perPage: 48 });
  return products.filter((product) => product.isNew).slice(0, limit);
}

export async function getProductsByCollection(collection: string, query: ProductQuery = {}): Promise<ProductListResult> {
  return getProducts({ ...query, collection });
}

export async function getProductsByCategory(category: string, query: ProductQuery = {}): Promise<ProductListResult> {
  return getProducts({ ...query, category });
}

export async function getProductsByStyle(style: string, query: ProductQuery = {}): Promise<ProductListResult> {
  return getProducts({ ...query, style });
}

export async function getProductsBySpace(space: string, query: ProductQuery = {}): Promise<ProductListResult> {
  return getProducts({ ...query, space });
}

export async function searchProducts(q: string, query: ProductQuery = {}): Promise<ProductListResult> {
  return getProducts({ ...query, q });
}

async function fullCatalogue(): Promise<CatalogProduct[]> {
  const { products } = await getProducts({ perPage: 48 });
  if (products.length < 48) return products;
  const { total } = await getProducts({ perPage: 1 });
  const pages = Math.ceil(Math.min(total, 500) / 48);
  const rest = await Promise.all(
    Array.from({ length: pages - 1 }, (_, index) => getProducts({ perPage: 48, page: index + 2 })),
  );
  return [...products, ...rest.flatMap((result) => result.products)];
}

export async function getRelatedProducts(slug: string, limit = 6): Promise<CatalogProduct[]> {
  const anchor = await getProduct(slug);
  if (!anchor) return [];
  return computeRelated(anchor, await fullCatalogue(), limit);
}

export async function getCompleteTheLook(slug: string, limit = 4): Promise<CatalogProduct[]> {
  const anchor = await getProduct(slug);
  if (!anchor) return [];
  return computeCompleteTheLook(anchor, await fullCatalogue(), limit);
}

export async function getCrossSellForCart(slugs: string[], limit = 4): Promise<CatalogProduct[]> {
  const all = await fullCatalogue();
  const items = all.filter((product) => slugs.includes(product.slug));
  if (!items.length) return [];
  return computeCrossSell(items, all, limit);
}
