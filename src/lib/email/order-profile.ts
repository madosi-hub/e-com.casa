import type { OrderEmailLine } from './types';

export type OrderEmailProfile = 'store' | 'nuralta';

export function parseOrderEmailLines(itemsJson: string): OrderEmailLine[] {
  try {
    const value = JSON.parse(itemsJson) as unknown;
    if (!Array.isArray(value)) return [];

    return value.flatMap((item) => {
      if (!item || typeof item !== 'object') return [];
      const line = item as Record<string, unknown>;
      if (typeof line.slug !== 'string' || !line.slug.trim()) return [];
      return [{
        slug: line.slug,
        name: typeof line.name === 'string' ? line.name : undefined,
        quantity: typeof line.quantity === 'number' && Number.isFinite(line.quantity) ? line.quantity : undefined,
        variantLabel: typeof line.variantLabel === 'string' ? line.variantLabel : null,
      }];
    });
  } catch {
    return [];
  }
}

/**
 * Offer routing is derived from the server-priced order lines already stored on
 * Order. This works for webhook and background reconciliation where no browser
 * URL or offer query string exists.
 */
export function resolveOrderEmailProfile(items: OrderEmailLine[]): OrderEmailProfile {
  return items.some((item) => item.slug.startsWith('nuralta-')) ? 'nuralta' : 'store';
}
