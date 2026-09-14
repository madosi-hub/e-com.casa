import { readFileSync } from 'node:fs';
import path from 'node:path';
import type {
  CatalogAdapter,
  CatalogCategory,
  CatalogProduct,
  ProductListResult,
  ProductQuery,
  ProductVariant,
} from './types';

type JsonProduct = Omit<CatalogProduct, 'variants'> & { variants?: ProductVariant[] };

let cache: { products: CatalogProduct[]; categories: CatalogCategory[]; loadedAt: number } | null = null;
const CACHE_TTL_MS = 30_000;

function dataPath(file: string): string {
  return path.join(process.cwd(), 'data', 'catalog', file);
}

function readProducts(file: string): CatalogProduct[] {
  try {
    const parsed = JSON.parse(readFileSync(dataPath(file), 'utf-8')) as JsonProduct[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map((product) => ({
      ...product,
      stockKnown: product.stockKnown ?? false,
      variants: Array.isArray(product.variants) ? product.variants : [],
    }));
  } catch {
    return [];
  }
}

function readCategories(file: string): CatalogCategory[] {
  try {
    const parsed = JSON.parse(readFileSync(dataPath(file), 'utf-8')) as { categories?: CatalogCategory[] };
    if (!Array.isArray(parsed.categories)) return [];
    return parsed.categories.map((category, index) => ({
      ...category,
      id: category.id || `category-${category.type}-${category.slug}`,
      image: category.image ?? null,
      subtitle: category.subtitle ?? null,
      sortOrder: category.sortOrder ?? index,
    }));
  } catch {
    return [];
  }
}

function load(): { products: CatalogProduct[]; categories: CatalogCategory[] } {
  if (cache && Date.now() - cache.loadedAt < CACHE_TTL_MS) {
    return { products: cache.products, categories: cache.categories };
  }

  const products = [
    ...new Map(readProducts('generated-provider-products.json').map((product) => [product.sku, product])).values(),
  ];
  const categories = readCategories('generated-provider-catalog.json');
  cache = { products, categories, loadedAt: Date.now() };
  return { products, categories };
}

export function matchesCatalogProduct(product: CatalogProduct, query: ProductQuery): boolean {
  if (query.category && product.categorySlug !== query.category) return false;
  if (query.subcategory && !product.subcategorySlugs.includes(query.subcategory)) return false;
  if (query.space && !product.spaceSlugs.includes(query.space)) return false;
  if (query.style && !product.styleSlugs.includes(query.style)) return false;
  if (query.collection && !product.collectionSlugs.includes(query.collection)) return false;
  if (query.material && !(product.materials ?? '').toLowerCase().includes(query.material.toLowerCase())) return false;
  if (query.colour && !(product.color ?? '').toLowerCase().includes(query.colour.toLowerCase())) return false;
  if (query.availability && product.availability !== query.availability) return false;
  if (query.minPrice !== undefined && product.priceCents < Math.round(query.minPrice * 100)) return false;
  if (query.maxPrice !== undefined && product.priceCents > Math.round(query.maxPrice * 100)) return false;

  if (query.q) {
    const needle = query.q.toLowerCase();
    const haystack = [
      product.name,
      product.subtitle,
      product.shortDescription,
      product.description,
      product.brand,
      product.manufacturer,
      product.categorySlug,
      product.subcategorySlugs,
      product.styleSlugs,
      product.spaceSlugs,
      product.collectionSlugs,
      product.materials,
      product.color,
      product.sku,
    ].filter(Boolean).join(' ').toLowerCase();
    if (!haystack.includes(needle)) return false;
  }

  return true;
}

export function sortCatalogProducts(products: CatalogProduct[], sort: ProductQuery['sort']): CatalogProduct[] {
  const result = [...products];
  switch (sort) {
    case 'price-asc': return result.sort((a, b) => a.priceCents - b.priceCents);
    case 'price-desc': return result.sort((a, b) => b.priceCents - a.priceCents);
    case 'rating': return result.sort((a, b) => b.rating - a.rating);
    case 'best': return result.sort((a, b) => b.reviewCount - a.reviewCount);
    case 'new': return result.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    default:
      return result.sort((a, b) =>
        Number(b.featured) - Number(a.featured) ||
        Number(b.isBestSeller) - Number(a.isBestSeller) ||
        (a.sortOrder ?? 0) - (b.sortOrder ?? 0) ||
        a.name.localeCompare(b.name)
      );
  }
}

export class FileCatalogAdapter implements CatalogAdapter {
  readonly name = 'provider-file-fallback';

  private getProducts(): CatalogProduct[] {
    return load().products.filter((product) =>
      product.categorySlug !== 'amostras' &&
      !product.isDemo &&
      !['BLOCKED', 'DEMO'].includes(product.complianceStatus.toUpperCase())
    );
  }

  getSource(): string {
    return 'bundled-provider-snapshot';
  }

  async list(query: ProductQuery): Promise<ProductListResult> {
    const sorted = sortCatalogProducts(this.getProducts().filter((product) => matchesCatalogProduct(product, query)), query.sort);
    const page = Math.max(1, query.page ?? 1);
    const perPage = Math.min(48, Math.max(1, query.perPage ?? 24));
    const start = (page - 1) * perPage;
    return {
      products: sorted.slice(start, start + perPage),
      total: sorted.length,
      page,
      perPage,
      totalPages: Math.ceil(sorted.length / perPage) || 1,
    };
  }

  async getBySlug(slug: string): Promise<CatalogProduct | null> {
    return this.getProducts().find((product) => product.slug === slug) ?? null;
  }

  async getCategories(type?: CatalogCategory['type']): Promise<CatalogCategory[]> {
    const categories = load().categories;
    return (type ? categories.filter((category) => category.type === type) : categories)
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async count(): Promise<number> {
    return this.getProducts().length;
  }
}
