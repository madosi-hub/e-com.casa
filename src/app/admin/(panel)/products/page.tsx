import Link from 'next/link';
import { db } from '@/lib/db';
import { AdminButton, EmptyState, PageHeader, StatusBadge } from '../../_components/ui';

export const dynamic = 'force-dynamic';

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = '' } = await searchParams;
  const products = await db.product.findMany({
    where: q ? {
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { sku: { contains: q, mode: 'insensitive' } },
        { slug: { contains: q, mode: 'insensitive' } },
        { brand: { contains: q, mode: 'insensitive' } },
      ],
    } : undefined,
    orderBy: [{ published: 'desc' }, { sortOrder: 'asc' }, { updatedAt: 'desc' }],
    take: 300,
  });

  return (
    <>
      <PageHeader title="Products" description="Catalogue records, publication, stock and base pricing." action={<AdminButton href="/admin/products/new">Add product</AdminButton>} />
      <form className="mb-5 flex max-w-xl gap-2">
        <input name="q" defaultValue={q} placeholder="Search by name, SKU, slug or brand" className="min-w-0 flex-1 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-500" />
        <button className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium hover:bg-neutral-50">Search</button>
      </form>

      {!products.length ? <EmptyState>No products match this search.</EmptyState> : (
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500"><tr><th className="px-4 py-3">Product</th><th className="px-4 py-3">SKU</th><th className="px-4 py-3">Price</th><th className="px-4 py-3">Supplier</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Availability</th></tr></thead>
              <tbody className="divide-y divide-neutral-100">
                {products.map((product) => (
                  <tr key={product.id} className="hover:bg-neutral-50/60">
                    <td className="px-4 py-3"><Link href={`/admin/products/${product.id}`} className="font-medium text-neutral-950 hover:underline">{product.name}</Link><div className="mt-0.5 text-xs text-neutral-400">/{product.slug}</div></td>
                    <td className="px-4 py-3 font-mono text-xs text-neutral-600">{product.sku}</td>
                    <td className="px-4 py-3">{product.price} {product.currency}</td>
                    <td className="px-4 py-3 text-neutral-600">{product.supplierKey || '—'}</td>
                    <td className="px-4 py-3"><StatusBadge value={product.published ? 'Published' : 'Draft'} /></td>
                    <td className="px-4 py-3"><StatusBadge value={product.availability} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
