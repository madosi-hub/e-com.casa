import type { CatalogProduct } from './types';
import { hasStock } from './inventory';

const BLOCKED_COMPLIANCE = new Set(['DEMO', 'BLOCKED']);
const BLOCKED_DOCUMENTATION = new Set(['DEMO', 'BLOCKED']);

type SaleabilityProduct = Pick<
  CatalogProduct,
  'isDemo' | 'complianceStatus' | 'documentationStatus' | 'availability' | 'stock' | 'stockKnown' | 'stockUnlimited'
> & Pick<CatalogProduct, 'canPurchase'> & Partial<Pick<CatalogProduct, 'priceCents'>>;

export function isCatalogProductSaleable(product: SaleabilityProduct): boolean {
  if (typeof product.canPurchase === 'boolean') return product.canPurchase;
  if (product.priceCents !== undefined && product.priceCents <= 0) return false;
  if (product.isDemo) return false;
  if (BLOCKED_COMPLIANCE.has(String(product.complianceStatus || '').toUpperCase())) return false;
  if (BLOCKED_DOCUMENTATION.has(String(product.documentationStatus || '').toUpperCase())) return false;
  return hasStock(product);
}

export function getCatalogSaleabilityLabel(product: SaleabilityProduct): string {
  if (typeof product.canPurchase === 'boolean') {
    if (product.canPurchase) return product.stockUnlimited ? 'Made to order' : 'Available';
    if (!product.stockUnlimited && product.stockKnown === false && product.availability !== 'outOfStock') return 'Availability to confirm';
    if (product.availability === 'outOfStock') return 'Out of stock';
    return 'Temporarily unavailable';
  }

  if (isCatalogProductSaleable(product)) return product.stockUnlimited ? 'Made to order' : 'Available';
  if (product.isDemo) return 'Preview';
  if (!product.stockUnlimited && product.stockKnown === false && product.availability !== 'outOfStock') return 'Availability to confirm';
  if (product.availability === 'outOfStock' || !hasStock(product)) return 'Out of stock';
  return 'Temporarily unavailable';
}
