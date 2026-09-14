import { db } from '@/lib/db';
import { OfferForm } from '../../../_components/offer-form';
import { PageHeader } from '../../../_components/ui';

export const dynamic = 'force-dynamic';

export default async function NewFunnelPage({ searchParams }: { searchParams: Promise<{ product?: string }> }) {
  const { product } = await searchParams;
  const products = await db.product.findMany({
    orderBy: [{ published: 'desc' }, { name: 'asc' }],
    select: { slug: true, name: true, price: true, currency: true, published: true },
  });

  return (
    <>
      <PageHeader title="New funnel" description="Create a route and campaign rule for one product." />
      <OfferForm products={products} selectedProductSlug={product} />
    </>
  );
}
