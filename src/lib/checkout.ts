import { applyBundleOffer } from './catalog/bundle';
// E-com.casa — Checkout server engine
// Server-side cart validation and repricing. Client totals are
// NEVER trusted. Also owns the pricing fingerprint (pricingHash)
// that keeps the PaymentIntent amount in sync with the order.

import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { getProduct } from '@/lib/catalog';
import { hasStock } from '@/lib/catalog/inventory';
import { isCatalogProductSaleable } from '@/lib/catalog/saleability';
import { shippingPrice } from '@/lib/shipping';
import {
  SHIPPING_OPTIONS,
  PROMO_CODES,
  GIFT_WRAP_PRICE,
  ORDER_NOTES_MAX,
  calculatePromoDiscount,
} from '@/lib/constants';
import { getCountryConfiguration } from '@/lib/countries';

export interface CheckoutItemInput {
  slug: string;
  quantity: number;
  variantId?: string | null;
}

export interface RepricedTotals {
  subtotal: number;
  discount: number;
  shipping: number;
  giftWrapFee: number;
  total: number;
  promoCode: string | null;
  lineItems: {
    slug: string;
    name: string;
    subtitle?: string | null;
    price: string;
    quantity: number;
    image: string;
    variantLabel?: string | null;
    variantId?: string | null;
  }[];
  /** Stable fingerprint of everything that influences the payable amount. */
  pricingHash: string;
  currency: string;
  country: string;
}

export function newOrderNumber(): string {
  const random = Math.floor(100000 + Math.random() * 900000);
  return `EC-${random}`;
}

export function newAccessToken(): string {
  return randomBytes(24).toString('hex');
}

/**
 * Reprice a cart entirely server-side from catalogue data.
 * Returns null-safe errors via thrown CheckoutValidationError.
 */
export class CheckoutValidationError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
  }
}

export async function repriceCart(input: {
  items: CheckoutItemInput[];
  country: string;
  shippingMethod: string;
  promoCode?: string | null;
  giftWrap?: boolean;
}): Promise<RepricedTotals> {
  if (!input.items.length || input.items.some((item) => !Number.isSafeInteger(item.quantity) || item.quantity < 1)) {
    throw new CheckoutValidationError('Invalid product quantity');
  }
  const slugs = input.items.map((i) => i.slug);
  const resolved = await Promise.all(slugs.map((s) => getProduct(s)));
  const products = resolved.filter((p): p is NonNullable<typeof p> => Boolean(p));
  const missing = slugs.filter((s) => !products.some((p) => p.slug === s));
  if (missing.length > 0) {
    throw new CheckoutValidationError('One or more products are unavailable');
  }

  const nonSaleable = products.find(product => !isCatalogProductSaleable(product));
  if (nonSaleable) {
    throw new CheckoutValidationError(
      `“${nonSaleable.name}” is still being validated for sale and is not available for purchase yet.`,
      409,
    );
  }

  for (const item of input.items) {
    const product = products.find((p) => p.slug === item.slug)!;
    if (!hasStock(product, input.items.filter((line) => line.slug === item.slug).reduce((sum, line) => sum + line.quantity, 0))) {
      throw new CheckoutValidationError(
        product.stock <= 0 || product.availability === 'outOfStock'
          ? `Sorry — “${product.name}” has just sold out.`
          : `Sorry — only ${product.stock} × “${product.name}” remain in stock.`,
        409,
      );
    }
    if (item.variantId) {
      const variant = product.variants.find((candidate) => candidate.id === item.variantId);
      if (!variant || variant.availability === 'outOfStock') {
        throw new CheckoutValidationError('The selected product option is unavailable.', 409);
      }
    }
  }

  let subtotal = 0;
  const lineItems = input.items.map((item) => {
    const product = applyBundleOffer(products.find((p) => p.slug === item.slug)!, products);
    let variantDeltaCents = 0;
    let variantLabel: string | undefined;
    if (item.variantId) {
      const v = product.variants.find((x) => x.id === item.variantId);
      if (v) {
        variantDeltaCents = v.priceDeltaCents ?? 0;
        variantLabel = v.name;
      }
    }
    const priceCents =
      (product.priceCents ?? Math.round(parseFloat(product.price) * 100)) + variantDeltaCents;
    const price = (priceCents / 100).toFixed(2);
    subtotal += (priceCents / 100) * item.quantity;
    return {
      automaticDiscountPct: product.promoDiscountPct,
      slug: product.slug,
      name: product.name,
      subtitle: product.subtitle,
      price,
      quantity: item.quantity,
      image: product.image,
      variantLabel,
      variantId: item.variantId ?? null,
    };
  });

  let discount = 0;
  let appliedPromo: string | null = null;
  if (input.promoCode && PROMO_CODES[input.promoCode.toUpperCase()]) {
    const promo = PROMO_CODES[input.promoCode.toUpperCase()];
    discount = calculatePromoDiscount(lineItems, promo);
    appliedPromo = input.promoCode.toUpperCase();
  }

  const option = SHIPPING_OPTIONS.find((o) => o.id === input.shippingMethod) ?? SHIPPING_OPTIONS[0];
  const shippingCost = shippingPrice(input.country, subtotal - discount, option.id);
  const giftWrapFee = input.giftWrap ? GIFT_WRAP_PRICE : 0;
  const total = subtotal - discount + shippingCost + giftWrapFee;

  const countryCfg = getCountryConfiguration(input.country);
  const currency = countryCfg?.currency ?? 'EUR';

  const pricingHash = createHash('sha256')
    .update(
      JSON.stringify({
        items: input.items,
        subtotal: subtotal.toFixed(2),
        discount: discount.toFixed(2),
        shipping: shippingCost.toFixed(2),
        giftWrap: giftWrapFee.toFixed(2),
        total: total.toFixed(2),
        promoCode: appliedPromo,
        currency,
      }),
    )
    .digest('hex')
    .slice(0, 32);

  return {
    subtotal,
    discount,
    shipping: shippingCost,
    giftWrapFee,
    total,
    promoCode: appliedPromo,
    lineItems,
    pricingHash,
    currency,
    country: input.country.toUpperCase(),
  };
}

export function sanitizeNotes(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim()
    .slice(0, ORDER_NOTES_MAX);
}

export function tokenMatches(stored: string | null | undefined, provided: string | null | undefined): boolean {
  if (!stored || !provided) return false;
  const a = Buffer.from(stored);
  const b = Buffer.from(provided);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
