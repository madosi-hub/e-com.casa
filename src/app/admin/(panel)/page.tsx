import Link from 'next/link';
import { db } from '@/lib/db';
import { PageHeader, StatCard, StatusBadge, money } from '../_components/ui';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const now = new Date();
  const [
    totalProducts,
    publishedProducts,
    activeFunnels,
    totalOrders,
    paidOrders,
    pendingOrders,
    contacts,
    recentOrders,
    paidTotals,
  ] = await Promise.all([
    db.product.count(),
    db.product.count({ where: { published: true } }),
    db.productOffer.count({ where: { enabled: true, startsAt: { lte: now }, endsAt: { gt: now } } }),
    db.order.count(),
    db.order.count({ where: { paymentStatus: { in: ['PAID', 'PARTIALLY_REFUNDED'] } } }),
    db.order.count({ where: { paymentStatus: { in: ['PENDING_PAYMENT', 'PAYMENT_PROCESSING'] } } }),
    db.contactMessage.count(),
    db.order.findMany({ orderBy: { createdAt: 'desc' }, take: 8 }),
    db.order.findMany({
      where: { currency: 'EUR', paymentStatus: { in: ['PAID', 'PARTIALLY_REFUNDED'] } },
      select: { total: true },
    }),
  ]);

  const revenue = paidTotals.reduce((sum, order) => sum + (Number.parseFloat(order.total) || 0), 0);

  return (
    <>
      <PageHeader title="Dashboard" description="Current catalogue, sales and operational status." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Products" value={publishedProducts} hint={`${totalProducts - publishedProducts} draft / archived`} />
        <StatCard label="Active funnels" value={activeFunnels} hint="Enabled and inside schedule" />
        <StatCard label="Orders" value={totalOrders} hint={`${pendingOrders} awaiting payment`} />
        <StatCard label="Captured sales" value={money(revenue, 'EUR')} hint={`${paidOrders} paid or partially refunded orders`} />
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[2fr_1fr]">
        <section className="rounded-xl border border-neutral-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
            <h2 className="font-semibold">Recent orders</h2>
            <Link href="/admin/orders" className="text-sm font-medium text-neutral-600 hover:text-neutral-950">View all</Link>
          </div>
          {recentOrders.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-neutral-100 text-xs uppercase tracking-wide text-neutral-400"><tr><th className="px-5 py-3">Order</th><th className="px-5 py-3">Customer</th><th className="px-5 py-3">Total</th><th className="px-5 py-3">Payment</th></tr></thead>
                <tbody className="divide-y divide-neutral-100">
                  {recentOrders.map((order) => (
                    <tr key={order.id}>
                      <td className="px-5 py-3"><Link className="font-medium hover:underline" href={`/admin/orders/${order.orderNumber}`}>{order.orderNumber}</Link></td>
                      <td className="px-5 py-3 text-neutral-600">{order.firstName} {order.lastName}</td>
                      <td className="px-5 py-3">{money(order.total, order.currency)}</td>
                      <td className="px-5 py-3"><StatusBadge value={order.paymentStatus} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <div className="px-5 py-10 text-sm text-neutral-500">No orders yet.</div>}
        </section>

        <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold">Operations</h2>
          <div className="mt-5 space-y-3 text-sm">
            <Link href="/admin/products/new" className="block rounded-lg border border-neutral-200 px-4 py-3 hover:bg-neutral-50">Add a product</Link>
            <Link href="/admin/funnels/new" className="block rounded-lg border border-neutral-200 px-4 py-3 hover:bg-neutral-50">Create a funnel</Link>
            <Link href="/admin/payments" className="block rounded-lg border border-neutral-200 px-4 py-3 hover:bg-neutral-50">Review payments and refunds</Link>
            <Link href="/admin/contacts" className="block rounded-lg border border-neutral-200 px-4 py-3 hover:bg-neutral-50">Customer messages <span className="float-right text-neutral-400">{contacts}</span></Link>
          </div>
        </section>
      </div>
    </>
  );
}
