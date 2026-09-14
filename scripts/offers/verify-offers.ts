import { db } from '../../src/lib/db';
import { applyCommerce } from '../../src/lib/catalog/commerce';
import { mapProduct } from '../../src/lib/catalog/prisma-adapter';
import { isOfferActive, validateProductOffer } from '../../src/lib/offers/promotion';

try {
  const offers = await db.productOffer.findMany();

  for (const row of offers) {
    const offer = {
      ...row,
      startsAt: row.startsAt.toISOString(),
      endsAt: row.endsAt.toISOString(),
    };

    validateProductOffer(offer);

    const product = await db.product.findUniqueOrThrow({
      where: { slug: row.productSlug },
    });
    const priced = applyCommerce({ ...mapProduct(product), funnelOffer: offer });

    if (isOfferActive(offer) && !priced.offerSlug) {
      throw new Error(`Active offer ${row.slug} is missing from its product pricing view`);
    }
  }

  const licensedWoodUpp = await db.product.count({
    where: { supplierKey: 'woodupp', imageStatus: 'LICENSED' },
  });
  const auditRows = await db.productOfferAudit.count();

  console.log(
    JSON.stringify({
      offers: offers.length,
      enabled: offers.filter((offer) => offer.enabled).length,
      licensedWoodUpp,
      auditRows,
    }),
  );
} finally {
  await db.$disconnect();
}
