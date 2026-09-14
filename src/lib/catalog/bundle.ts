import { applyCommerce, isAccessory } from './commerce';
import type { CatalogProduct } from './types';

export function applyBundleOffer(product: CatalogProduct, _cart: CatalogProduct[], now = Date.now()): CatalogProduct {
  return applyCommerce(product, now);
}

export function rankAccessories(products: CatalogProduct[], cart: CatalogProduct[]): CatalogProduct[] {
  const brands = new Set(
    cart
      .filter((product) => !isAccessory(product))
      .map((product) => product.brand?.toLowerCase())
      .filter(Boolean),
  );

  return [...products].sort((a, b) =>
    Number(brands.has(b.brand?.toLowerCase())) - Number(brands.has(a.brand?.toLowerCase())) ||
    a.name.localeCompare(b.name)
  );
}
