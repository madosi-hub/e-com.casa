import type { ProductOffer } from '../offers/promotion';
// E-com.casa — Catalog domain types
// The storefront UI NEVER talks to Prisma directly for catalogue
// reads. It consumes these abstractions so supplier snapshots and
// the future normalized production catalogue share one contract.

export type VariantType = 'colour' | 'size' | 'material' | 'pack';

export interface ProductVariant {
  id: string;
  type: VariantType;
  /** Display label, e.g. "Natural Oak" or "Set of 2" */
  name: string;
  /** Machine value, e.g. "oak" or "set-2" */
  value: string;
  /** Added cost in cents (0 = no delta) */
  priceDeltaCents: number;
  regularPriceDeltaCents?: number;
  /** Optional per-variant image override */
  image?: string;
  availability?: 'inStock' | 'lowStock' | 'outOfStock';
  /** Supplier traceability: server/admin data, never a saleability shortcut. */
  sku?: string | null;
  barcode?: string | null;
  supplierVariantId?: string;
  optionValues?: Record<string, string>;
}

export interface ProductSafety {
  manufacturerName: string;
  manufacturerAddress: string;
  manufacturerEmail: string;
  euResponsiblePerson: string;
  productIdentifier: string;
  countryOfOrigin: string | null;
  warnings: string[];
  safetyInstructions: string[];
  ceMarking: string;
  weee: string;
}

/** UI-facing product shape (serialized, JSON-safe after public projection). */
export interface CatalogProduct {
  id: string;
  slug: string;
  sku: string;
  name: string;
  subtitle: string | null;
  shortDescription: string;
  description: string;
  price: string;
  priceCents: number;
  regularPriceCents?: number;
  funnelOffer?: ProductOffer | null;
  offerSlug?: string | null;
  comparePrice: string | null;
  currency: string;
  /** Observed EU retail benchmark. This is NOT a statutory previous price. */
  marketReferencePrice?: string | null;
  marketReferenceSampleCount?: number;
  marketReferenceConfidence?: 'HIGH' | 'MEDIUM' | 'LOW' | null;
  marketReferenceBasis?: 'EXACT' | 'COMPARABLE' | null;
  marketReferenceReviewedAt?: string | null;
  /** Real, fixed-ended campaign metadata. Timers must never reset per visitor. */
  promoDiscountPct?: number | null;
  promoEndsAt?: string | null;
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
  /** False when a public supplier page only exposes available/unavailable, not an exact sellable quantity. */
  stockKnown?: boolean;
  /** Direct manufacture: no inventory quantity is tracked or decremented. */
  stockUnlimited?: boolean;
  availability: 'inStock' | 'lowStock' | 'outOfStock';
  /** Customer-safe API projection; internal hold reasons remain private. */
  canPurchase?: boolean;
  isBestSeller: boolean;
  isNew: boolean;
  featured: boolean;
  materials: string | null;
  dimensions: string | null;
  weight: string | null;
  care: string | null;
  color: string | null;
  shippingClass: string;
  variants: ProductVariant[];
  /** Commercial identity shown on PDPs. */
  brand?: string | null;
  manufacturer?: string | null;
  electrical: boolean;
  battery: boolean;
  complianceStatus: string;
  reviewMode: string;
  documentationStatus: string;
  safetyJson: string | null;
  requiresComplianceReview: boolean;
  isDemo: boolean;
  sourceResearchId: string | null;
  /** Internal supplier traceability. Public projection strips these fields. */
  supplierKey?: string | null;
  supplierProductId?: string | null;
  mediaRights?: string | null;
  sourceDomain?: string | null;
  sourceUrl?: string | null;
  sourceImageUrls?: string[];
  sortOrder?: number;
  createdAt: string;
}

export interface CatalogCategory {
  id: string;
  slug: string;
  name: string;
  type: 'space' | 'style' | 'collection' | 'shop';
  image: string | null;
  subtitle: string | null;
  sortOrder: number;
}

export interface ProductQuery {
  funnelOnly?: boolean;
  category?: string;
  subcategory?: string;
  space?: string;
  style?: string;
  collection?: string;
  material?: string;
  colour?: string;
  q?: string;
  minPrice?: number;
  maxPrice?: number;
  availability?: string;
  sort?: 'featured' | 'best' | 'new' | 'price-asc' | 'price-desc' | 'rating';
  page?: number;
  perPage?: number;
}

export interface ProductListResult {
  products: CatalogProduct[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

/** Storage-agnostic catalogue adapter contract. */
export interface CatalogAdapter {
  readonly name: string;
  list(query: ProductQuery): Promise<ProductListResult>;
  getBySlug(slug: string): Promise<CatalogProduct | null>;
  getCategories(type?: CatalogCategory['type']): Promise<CatalogCategory[]>;
  count(): Promise<number>;
}
