import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { OfferForm } from '../../../_components/offer-form';
import { AdminButton, Notice, PageHeader } from '../../../_components/ui';

export const dynamic = 'force-dynamic';

export default async function FunnelDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ productSlug: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const [{ productSlug }, query] = await Promise.all([params, searchParams]);
  const decoded = decodeURIComponent(productSlug);
  const offer = await db.productOffer.findUnique({ where: { productSlug: decoded } });
  if (!offer) notFound();
  const products = await db.product.findMany({
    orderBy: { name: 'asc' },
    select: { slug: true, name: true, price: true, currency: true, published: true },
  });

  return (
    <>
      <PageHeader title={`Funnel /${offer.slug}`} description={`Product: ${offer.productSlug}`} action={<AdminButton href={`/offers/${offer.slug}`} secondary>Open funnel</AdminButton>} />
      {query.saved ? <Notice>Funnel saved and audit entry recorded.</Notice> : null}
      <OfferForm offer={offer} products={products} />
    </>
  );
}
