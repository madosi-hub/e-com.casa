import Link from 'next/link';
import { db } from '@/lib/db';
import { EmptyState, PageHeader, StatusBadge, money } from '../../_components/ui';

export const dynamic = 'force-dynamic';

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ q?: string; payment?: string }> }) {
  const { q = '', payment = '' } = await searchParams;
  const orders = await db.order.findMany({
    where: {
      ...(payment ? { paymentStatus: payment } : {}),
      ...(q ? { OR: [
        { orderNumber: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { firstName: { contains: q, mode: 'insensitive' } },
        { lastName: { contains: q, mode: 'insensitive' } },
        { trackingNumber: { contains: q, mode: 'insensitive' } },
      ] } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: 300,
  });

  return (
    <>
      <PageHeader title="Orders" description="Checkout, payment and fulfilment records." />
      <form className="mb-5 grid gap-2 sm:max-w-3xl sm:grid-cols-[1fr_220px_auto]">
        <input name="q" defaultValue={q} placeholder="Order, customer, email or tracking" className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm" />
        <select name="payment" defaultValue={payment} className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm"><option value="">All payment states</option><option value="PENDING_PAYMENT">Pending payment</option><option value="PAYMENT_PROCESSING">Processing</option><option value="PAID">Paid</option><option value="PAYMENT_FAILED">Failed</option><option value="REFUNDED">Refunded</option><option value="PARTIALLY_REFUNDED">Partially refunded</option></select>
        <button className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium">Filter</button>
      </form>

      {!orders.length ? <EmptyState>No orders found.</EmptyState> : (
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
          <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500"><tr><th className="px-4 py-3">Order</th><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Total</th><th className="px-4 py-3">Payment</th><th className="px-4 py-3">Fulfilment</th><th className="px-4 py-3">Created</th></tr></thead><tbody className="divide-y divide-neutral-100">
            {orders.map((order) => <tr key={order.id}><td className="px-4 py-3"><Link href={`/admin/orders/${order.orderNumber}`} className="font-medium hover:underline">{order.orderNumber}</Link>{order.trackingNumber ? <div className="mt-0.5 text-xs text-neutral-400">{order.trackingNumber}</div> : null}</td><td className="px-4 py-3">{order.firstName} {order.lastName}<div className="mt-0.5 text-xs text-neutral-400">{order.email}</div></td><td className="px-4 py-3">{money(order.total, order.currency)}</td><td className="px-4 py-3"><StatusBadge value={order.paymentStatus} /></td><td className="px-4 py-3"><StatusBadge value={order.status} /></td><td className="px-4 py-3 text-xs text-neutral-500">{order.createdAt.toLocaleString('en-GB')}</td></tr>)}
          </tbody></table></div>
        </div>
      )}
    </>
  );
}
