import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { AdminButton, Notice, PageHeader } from '../../../_components/ui';
import { ProductForm } from '../../../_components/product-form';

export const dynamic = 'force-dynamic';

export default async function ProductDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; archived?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const product = await db.product.findUnique({ where: { id } });
  if (!product) notFound();

  return (
    <>
      <PageHeader
        title={product.name}
        description={`${product.sku} · /${product.slug}`}
        action={<AdminButton href={`/product/${product.slug}`} secondary>Open storefront page</AdminButton>}
      />
      {query.saved ? <Notice>Product saved.</Notice> : null}
      {query.archived ? <Notice>Product removed from storefront publication.</Notice> : null}
      <ProductForm product={product} />
    </>
  );
}
