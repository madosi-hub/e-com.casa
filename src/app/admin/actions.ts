'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import {
  clearAdminSession,
  createAdminSession,
  requireAdmin,
  verifyAdminPassword,
} from '@/lib/admin/auth';
import { saveProductOffer } from '@/lib/offers/store';
import { refundPayment } from '@/lib/payments/refunds';
import { ensureCancelledEvent } from '@/lib/tracking';

function value(formData: FormData, key: string): string {
  return String(formData.get(key) ?? '').trim();
}

function optional(formData: FormData, key: string): string | null {
  const result = value(formData, key);
  return result || null;
}

function checked(formData: FormData, key: string): boolean {
  return formData.get(key) === 'on' || formData.get(key) === 'true';
}

function integer(formData: FormData, key: string, fallback = 0): number {
  const parsed = Number.parseInt(value(formData, key), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function priceToCents(raw: string): number {
  const normalized = raw.replace(',', '.');
  const amount = Number.parseFloat(normalized);
  if (!Number.isFinite(amount) || amount < 0) throw new Error('Invalid price');
  return Math.round(amount * 100);
}

function centsToPrice(cents: number): string {
  return (cents / 100).toFixed(2);
}

function validateSlug(slug: string): string {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error('Invalid slug');
  return slug;
}

function validateVariants(raw: string): string {
  const text = raw.trim() || '[]';
  const parsed = JSON.parse(text);
  if (!Array.isArray(parsed)) throw new Error('Variants must be a JSON array');
  return JSON.stringify(parsed);
}

function productData(formData: FormData) {
  const priceCents = priceToCents(value(formData, 'price'));
  const stockUnlimited = checked(formData, 'stockUnlimited');

  return {
    slug: validateSlug(value(formData, 'slug')),
    sku: value(formData, 'sku'),
    name: value(formData, 'name'),
    subtitle: optional(formData, 'subtitle'),
    shortDescription: value(formData, 'shortDescription'),
    description: value(formData, 'description'),
    price: centsToPrice(priceCents),
    priceCents,
    comparePrice: optional(formData, 'comparePrice'),
    currency: value(formData, 'currency') || 'EUR',
    categorySlug: value(formData, 'categorySlug'),
    subcategorySlugs: value(formData, 'subcategorySlugs'),
    spaceSlugs: value(formData, 'spaceSlugs'),
    styleSlugs: value(formData, 'styleSlugs'),
    collectionSlugs: value(formData, 'collectionSlugs'),
    image: value(formData, 'image'),
    hoverImage: optional(formData, 'hoverImage'),
    gallery: value(formData, 'gallery'),
    imageStatus: value(formData, 'imageStatus') || 'READY',
    badge: optional(formData, 'badge'),
    stock: stockUnlimited ? 0 : Math.max(0, integer(formData, 'stock')),
    stockKnown: stockUnlimited ? false : checked(formData, 'stockKnown'),
    stockUnlimited,
    brand: optional(formData, 'brand'),
    manufacturer: optional(formData, 'manufacturer'),
    supplierKey: optional(formData, 'supplierKey'),
    supplierProductId: optional(formData, 'supplierProductId'),
    mediaRights: optional(formData, 'mediaRights'),
    availability: value(formData, 'availability') || 'inStock',
    isBestSeller: checked(formData, 'isBestSeller'),
    isNew: checked(formData, 'isNew'),
    featured: checked(formData, 'featured'),
    materials: optional(formData, 'materials'),
    dimensions: optional(formData, 'dimensions'),
    weight: optional(formData, 'weight'),
    care: optional(formData, 'care'),
    color: optional(formData, 'color'),
    shippingClass: value(formData, 'shippingClass') || 'STANDARD',
    variantsJson: validateVariants(value(formData, 'variantsJson')),
    electrical: checked(formData, 'electrical'),
    battery: checked(formData, 'battery'),
    complianceStatus: value(formData, 'complianceStatus') || 'PENDING_REVIEW',
    reviewMode: value(formData, 'reviewMode') || 'live',
    documentationStatus: value(formData, 'documentationStatus') || 'PENDING',
    safetyJson: optional(formData, 'safetyJson'),
    requiresComplianceReview: checked(formData, 'requiresComplianceReview'),
    isDemo: false,
    published: checked(formData, 'published'),
    sortOrder: integer(formData, 'sortOrder'),
  };
}

export async function loginAdmin(formData: FormData) {
  const password = value(formData, 'password');
  if (!(await verifyAdminPassword(password))) redirect('/admin/login?error=1');
  await createAdminSession();
  redirect('/admin');
}

export async function logoutAdmin() {
  await clearAdminSession();
  redirect('/admin/login');
}

export async function createProductAction(formData: FormData) {
  await requireAdmin();
  const data = productData(formData);
  if (!data.name || !data.sku || !data.slug || !data.categorySlug || !data.image) {
    throw new Error('Name, SKU, slug, category and image are required');
  }

  const product = await db.product.create({ data });
  revalidatePath('/admin');
  revalidatePath('/admin/products');
  revalidatePath('/shop');
  redirect(`/admin/products/${product.id}?saved=1`);
}

export async function updateProductAction(formData: FormData) {
  await requireAdmin();
  const id = value(formData, 'id');
  const data = productData(formData);
  const current = await db.product.findUniqueOrThrow({ where: { id } });

  await db.$transaction(async (tx) => {
    if (current.slug !== data.slug) {
      const existingOffer = await tx.productOffer.findUnique({ where: { productSlug: current.slug } });
      if (existingOffer) {
        await tx.productOffer.update({
          where: { productSlug: current.slug },
          data: { productSlug: data.slug },
        });
        await tx.productOfferAudit.updateMany({
          where: { productSlug: current.slug },
          data: { productSlug: data.slug },
        });
      }
    }
    await tx.product.update({ where: { id }, data });
  });

  revalidatePath('/admin');
  revalidatePath('/admin/products');
  revalidatePath(`/product/${data.slug}`);
  revalidatePath('/shop');
  redirect(`/admin/products/${id}?saved=1`);
}

export async function archiveProductAction(formData: FormData) {
  await requireAdmin();
  const id = value(formData, 'id');
  await db.product.update({
    where: { id },
    data: { published: false, availability: 'outOfStock' },
  });
  revalidatePath('/admin/products');
  revalidatePath('/shop');
  redirect(`/admin/products/${id}?archived=1`);
}

export async function saveOfferAction(formData: FormData) {
  const session = await requireAdmin();
  const productSlug = validateSlug(value(formData, 'productSlug'));
  const discountMode = value(formData, 'discountMode') || 'none';

  const discountPct = discountMode === 'percentage' ? integer(formData, 'discountPct') : null;
  const fixedPriceCents = discountMode === 'fixed' ? priceToCents(value(formData, 'fixedPrice')) : null;
  const startsAt = new Date(value(formData, 'startsAt'));
  const endsAt = new Date(value(formData, 'endsAt'));

  await saveProductOffer(
    {
      productSlug,
      slug: validateSlug(value(formData, 'slug')),
      enabled: checked(formData, 'enabled'),
      discountPct,
      fixedPriceCents,
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
      version: integer(formData, 'version'),
    },
    session.operator,
  );

  revalidatePath('/admin');
  revalidatePath('/admin/funnels');
  revalidatePath('/offers');
  revalidatePath(`/offers/${value(formData, 'slug')}`);
  revalidatePath('/shop');
  redirect(`/admin/funnels/${productSlug}?saved=1`);
}

const ORDER_STATUSES = new Set([
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'SHIPPED',
  'IN_TRANSIT',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
]);

export async function updateOrderStatusAction(formData: FormData) {
  await requireAdmin();
  const orderNumber = value(formData, 'orderNumber');
  const status = value(formData, 'status').toUpperCase();
  if (!ORDER_STATUSES.has(status)) throw new Error('Invalid order status');

  const order = await db.order.findUniqueOrThrow({ where: { orderNumber } });
  const paidEnough = order.paymentStatus === 'PAID' || order.paymentStatus === 'PARTIALLY_REFUNDED';

  if (status !== 'PENDING' && status !== 'CANCELLED' && !paidEnough) {
    throw new Error('Fulfilment cannot advance before payment is verified');
  }
  if (status === 'CANCELLED' && order.paymentStatus === 'PAID') {
    throw new Error('Refund the paid order before cancelling fulfilment');
  }

  await db.order.update({ where: { orderNumber }, data: { status } });
  if (status === 'CANCELLED') await ensureCancelledEvent(order.id);

  revalidatePath('/admin');
  revalidatePath('/admin/orders');
  revalidatePath(`/admin/orders/${orderNumber}`);
  redirect(`/admin/orders/${orderNumber}?saved=1`);
}

export async function updateTrackingAction(formData: FormData) {
  await requireAdmin();
  const orderNumber = value(formData, 'orderNumber');
  const estimated = optional(formData, 'estimatedDeliveryAt');

  await db.order.update({
    where: { orderNumber },
    data: {
      trackingNumber: optional(formData, 'trackingNumber'),
      carrier: optional(formData, 'carrier'),
      originWarehouse: optional(formData, 'originWarehouse'),
      estimatedDeliveryAt: estimated ? new Date(estimated) : null,
    },
  });

  revalidatePath('/admin/orders');
  revalidatePath(`/admin/orders/${orderNumber}`);
  redirect(`/admin/orders/${orderNumber}?tracking=1`);
}

export async function refundOrderAction(formData: FormData) {
  await requireAdmin();
  const orderId = value(formData, 'orderId');
  const orderNumber = value(formData, 'orderNumber');
  const amount = optional(formData, 'amount') ?? undefined;
  const reason = optional(formData, 'reason') ?? undefined;

  await refundPayment(orderId, amount, reason);

  revalidatePath('/admin');
  revalidatePath('/admin/payments');
  revalidatePath('/admin/orders');
  revalidatePath(`/admin/orders/${orderNumber}`);
  redirect(`/admin/orders/${orderNumber}?refunded=1`);
}
