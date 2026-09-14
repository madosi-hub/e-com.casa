// E-com.casa — Product recommendations engine
// Relational merchandising for the demo catalogue:
// COMPLETE_THE_LOOK / SAME_STYLE / SAME_SPACE / CROSS_SELL
// Relationships are computed from catalogue metadata so they
// work identically on the Prisma and demo adapters. The
// research pipeline additionally writes generated-relations.json
// as a reproducibility artifact of the curated relationships.

import type { CatalogProduct } from './types';

function split(s: string | null | undefined): string[] {
  return s ? s.split(',').map((x) => x.trim()).filter(Boolean) : [];
}

function overlap(a: string[], b: string[]): number {
  return a.filter((x) => b.includes(x)).length;
}

function priceBand(cents: number): number {
  if (cents < 4000) return 0; // entry
  if (cents < 10000) return 1; // core
  return 2; // premium
}

/**
 * COMPLETE_THE_LOOK — products that visually/functionally complete the
 * anchor product's room story: different category, shared space/style,
 * comparable price positioning. Deterministic ordering.
 */
export function getCompleteTheLook(anchor: CatalogProduct, all: CatalogProduct[], limit = 4): CatalogProduct[] {
  const anchorSpaces = split(anchor.spaceSlugs);
  const anchorStyles = split(anchor.styleSlugs);
  const anchorBand = priceBand(anchor.priceCents);

  const scored = all
    .filter((p) => p.slug !== anchor.slug && p.categorySlug !== anchor.categorySlug)
    .map((p) => {
      const spaces = overlap(anchorSpaces, split(p.spaceSlugs));
      const styles = overlap(anchorStyles, split(p.styleSlugs));
      const bandMatch = priceBand(p.priceCents) === anchorBand ? 1 : 0;
      const featured = Number(p.featured || p.isBestSeller);
      const score = spaces * 3 + styles * 2 + bandMatch * 2 + featured;
      return { p, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.p.name.localeCompare(b.p.name));

  // one product per category for a varied "look"
  const seenCategories = new Set<string>();
  const picked: CatalogProduct[] = [];
  for (const { p } of scored) {
    if (seenCategories.has(p.categorySlug)) continue;
    seenCategories.add(p.categorySlug);
    picked.push(p);
    if (picked.length >= limit) break;
  }
  return picked;
}

/**
 * Related products — RELATED / SAME_STYLE / SAME_SPACE blend.
 * Prefers same category, then shared styles, then shared spaces.
 */
export function getRelatedProducts(anchor: CatalogProduct, all: CatalogProduct[], limit = 6): CatalogProduct[] {
  const anchorStyles = split(anchor.styleSlugs);
  const anchorSpaces = split(anchor.spaceSlugs);

  return all
    .filter((p) => p.slug !== anchor.slug)
    .map((p) => {
      const sameCategory = p.categorySlug === anchor.categorySlug ? 4 : 0;
      const styles = overlap(anchorStyles, split(p.styleSlugs)) * 2;
      const spaces = overlap(anchorSpaces, split(p.spaceSlugs));
      const collections = overlap(split(anchor.collectionSlugs), split(p.collectionSlugs)) * 2;
      return { p, score: sameCategory + styles + spaces + collections };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.p.priceCents - b.p.priceCents)
    .slice(0, limit)
    .map((x) => x.p);
}

/** Cross-sell hints for cart/checkout surfaces. */
export function getCrossSell(items: CatalogProduct[], all: CatalogProduct[], limit = 4): CatalogProduct[] {
  const inCart = new Set(items.map((i) => i.slug));
  const categoriesInCart = new Set(items.map((i) => i.categorySlug));
  const spaces = new Set(items.flatMap((i) => split(i.spaceSlugs)));

  return all
    .filter((p) => !inCart.has(p.slug))
    .map((p) => {
      const newCategory = categoriesInCart.has(p.categorySlug) ? 0 : 2;
      const sharedSpaces = overlap([...spaces], split(p.spaceSlugs)) * 2;
      const bundleFriendly = Number(p.isBestSeller || p.featured);
      return { p, score: newCategory + sharedSpaces + bundleFriendly };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.p.priceCents - b.p.priceCents)
    .slice(0, limit)
    .map((x) => x.p);
}
