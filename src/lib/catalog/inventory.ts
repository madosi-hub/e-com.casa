/** Inventory limits are independent of compliance and commercial approval. */
export type InventoryProduct = { stock: number; stockKnown?: boolean; stockUnlimited?: boolean; availability?: string };

export function hasStock(product: InventoryProduct, quantity = 1): boolean {
  if (!Number.isSafeInteger(quantity) || quantity < 1) return false;
  if (product.availability === 'outOfStock') return false;
  return product.stockUnlimited === true || (product.stockKnown !== false && product.stock >= quantity);
}

/** null is JSON-safe and means no stock ceiling in persisted carts. */
export function cartStockLimit(product: InventoryProduct): number | null {
  return product.stockUnlimited ? null : Math.max(0, product.stock);
}

export function quantityLimit(product: InventoryProduct): number {
  return cartStockLimit(product) ?? Number.MAX_SAFE_INTEGER;
}
