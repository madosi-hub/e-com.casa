import Link from 'next/link';
import { db } from '@/lib/db';
import { AdminButton, EmptyState, PageHeader, StatusBadge } from '../../_components/ui';

export const dynamic = 'force-dynamic';

export default async function FunnelsPage() {
  const offers = await db.productOffer.findMany({ orderBy: { updatedAt: 'desc' } });
  const productSlugs = offers.map((offer) => offer.productSlug);
  const products = await db.product.findMany({ where: { slug: { in: productSlugs } }, select: { slug: true, name: true, published: true, price: true, currency: true } });
  const bySlug = new Map(products.map((product) => [product.slug, product]));
  const now = Date.now();

  return (
    <>
      <PageHeader title="Funnels" description="Landing-page routing, schedule and campaign pricing." action={<AdminButton href="/admin/funnels/new">Create funnel</AdminButton>} />
      {!offers.length ? <EmptyState>No funnels configured.</EmptyState> : (
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500"><tr><th className="px-4 py-3">Funnel</th><th className="px-4 py-3">Product</th><th className="px-4 py-3">Price rule</th><th className="px-4 py-3">Schedule</th><th className="px-4 py-3">State</th></tr></thead>
              <tbody className="divide-y divide-neutral-100">
                {offers.map((offer) => {
                  const product = bySlug.get(offer.productSlug);
                  const active = offer.enabled && offer.startsAt.getTime() <= now && offer.endsAt.getTime() > now;
                  const priceRule = offer.fixedPriceCents != null ? `${(offer.fixedPriceCents / 100).toFixed(2)} ${product?.currency ?? 'EUR'}` : offer.discountPct != null ? `${offer.discountPct}% off` : 'Base product price';
                  return (
                    <tr key={offer.productSlug}>
                      <td className="px-4 py-3"><Link href={`/admin/funnels/${encodeURIComponent(offer.productSlug)}`} className="font-medium hover:underline">/{offer.slug}</Link><div className="mt-0.5 text-xs text-neutral-400">v{offer.version}</div></td>
                      <td className="px-4 py-3">{product?.name ?? offer.productSlug}<div className="mt-0.5 text-xs text-neutral-400">{product?.published ? 'Published' : 'Product not published'}</div></td>
                      <td className="px-4 py-3">{priceRule}</td>
                      <td className="px-4 py-3 text-xs text-neutral-600">{offer.startsAt.toLocaleString('en-GB')}<br />to {offer.endsAt.toLocaleString('en-GB')}</td>
                      <td className="px-4 py-3"><StatusBadge value={active ? 'Active' : offer.enabled ? 'Scheduled' : 'Disabled'} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
