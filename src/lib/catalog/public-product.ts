import type { CatalogProduct, ProductVariant } from './types';
import { isCatalogProductSaleable } from './saleability';

/**
 * Remove operational/supplier/compliance fields before a product crosses the
 * server -> browser boundary (API JSON or React Server Component props).
 *
 * Brand/manufacturer and customer-facing stock state remain public. Supplier
 * identifiers, source URLs, raw media rights and compliance holds do not.
 */
export function toStorefrontProduct(product: CatalogProduct): CatalogProduct {
  const {
    complianceStatus: _complianceStatus,
    documentationStatus: _documentationStatus,
    safetyJson: _safetyJson,
    requiresComplianceReview: _requiresComplianceReview,
    reviewMode: _reviewMode,
    sourceResearchId: _sourceResearchId,
    isDemo: _isDemo,
    imageStatus: _imageStatus,
    supplierKey: _supplierKey,
    supplierProductId: _supplierProductId,
    mediaRights: _mediaRights,
    sourceDomain: _sourceDomain,
    sourceUrl: _sourceUrl,
    sourceImageUrls: _sourceImageUrls,
    sortOrder: _sortOrder,
    variants,
    ...publicProduct
  } = product;

  const publicVariants: ProductVariant[] = variants.map((variant) => ({
    id: variant.id,
    type: variant.type,
    name: variant.name,
    value: variant.value,
    priceDeltaCents: variant.priceDeltaCents,
    regularPriceDeltaCents: variant.regularPriceDeltaCents,
    image: variant.image,
    availability: variant.availability,
  }));

  return {
    ...publicProduct,
    variants: publicVariants,
    canPurchase: isCatalogProductSaleable(product),
  } as CatalogProduct;
}
