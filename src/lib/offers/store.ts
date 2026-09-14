import { db } from '@/lib/db';
import type { ProductOffer as Row } from '@prisma/client';
import { validateProductOffer, type ProductOffer } from './promotion';
function project(row: Row): ProductOffer {
  return { ...row, startsAt: row.startsAt.toISOString(), endsAt: row.endsAt.toISOString() };
}
/** No stale cache or file fallback: a disabled campaign must never reactivate after a DB outage. */
export async function getProductOffers(): Promise<ProductOffer[]> {
  try { return (await db.productOffer.findMany()).map(project); } catch (error) {
    if ((error as { code?: string }).code === 'P2021') return [];
    throw error;
  }
}
/** Server-only admin application service. Call after authenticating the operator. */
export async function saveProductOffer(offer: ProductOffer, actor: string): Promise<ProductOffer> {
  validateProductOffer(offer);
  if (!actor.trim()) throw Error('Operator identity required');
  return db.$transaction(async tx => {
    const product = await tx.product.findUniqueOrThrow({ where: { slug: offer.productSlug } });
    if (product.isDemo || product.priceCents <= 0) throw Error('Product has no valid sale price');
    if (offer.fixedPriceCents !== null && offer.fixedPriceCents >= product.priceCents) throw Error('Promotional fixed price must be below regular price');
    const before = await tx.productOffer.findUnique({ where: { productSlug: offer.productSlug } });
    if (!before) {
      if (offer.version !== 0) throw Error('Offer changed; reload before saving');
      const after = await tx.productOffer.create({ data: { ...offer, version: 1, startsAt: new Date(offer.startsAt), endsAt: new Date(offer.endsAt) } });
      await tx.productOfferAudit.create({ data: { productSlug: offer.productSlug, actor, beforeJson: 'null', afterJson: JSON.stringify(after) } });
      return project(after);
    }
    if (before.version !== offer.version) throw Error('Offer changed; reload before saving');
    const changed = await tx.productOffer.updateMany({ where: { productSlug: offer.productSlug, version: offer.version }, data: { slug: offer.slug, enabled: offer.enabled, discountPct: offer.discountPct, fixedPriceCents: offer.fixedPriceCents, startsAt: new Date(offer.startsAt), endsAt: new Date(offer.endsAt), version: { increment: 1 } } });
    if (changed.count !== 1) throw Error('Concurrent offer update');
    const after = await tx.productOffer.findUniqueOrThrow({ where: { productSlug: offer.productSlug } });
    await tx.productOfferAudit.create({ data: { productSlug: offer.productSlug, actor, beforeJson: JSON.stringify(before), afterJson: JSON.stringify(after) } });
    return project(after);
  }, { timeout: 15000 });
}
