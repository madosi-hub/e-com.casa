import { db } from '@/lib/db';
import { EmptyState, PageHeader, money } from '../../_components/ui';

export const dynamic = 'force-dynamic';

type CustomerSummary = {
  email: string;
  name: string;
  orders: number;
  paidOrders: number;
  revenue: number;
  currency: string;
  country: string;
  lastOrderAt: Date;
};

export default async function CustomersPage() {
  const orders = await db.order.findMany({ orderBy: { createdAt: 'desc' } });
  const customers = new Map<string, CustomerSummary>();

  for (const order of orders) {
    const key = order.email.trim().toLowerCase();
    const current = customers.get(key) ?? {
      email: order.email,
      name: `${order.firstName} ${order.lastName}`.trim(),
      orders: 0,
      paidOrders: 0,
      revenue: 0,
      currency: order.currency,
      country: order.country,
      lastOrderAt: order.createdAt,
    };
    current.orders += 1;
    if (['PAID', 'PARTIALLY_REFUNDED'].includes(order.paymentStatus)) {
      current.paidOrders += 1;
      if (order.currency === current.currency) current.revenue += Number.parseFloat(order.total) || 0;
    }
    if (order.createdAt > current.lastOrderAt) current.lastOrderAt = order.createdAt;
    customers.set(key, current);
  }

  const rows = [...customers.values()].sort((a, b) => b.lastOrderAt.getTime() - a.lastOrderAt.getTime());

  return (
    <>
      <PageHeader title="Customers" description="Operational customer view derived from order history. No separate CRM profile is created until a customer has commercial activity." />
      {!rows.length ? <EmptyState>No customer orders yet.</EmptyState> : (
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm"><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500"><tr><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Country</th><th className="px-4 py-3">Orders</th><th className="px-4 py-3">Paid orders</th><th className="px-4 py-3">Recorded sales</th><th className="px-4 py-3">Last order</th></tr></thead><tbody className="divide-y divide-neutral-100">
          {rows.map((customer) => <tr key={customer.email}><td className="px-4 py-3"><p className="font-medium">{customer.name || 'Customer'}</p><p className="mt-0.5 text-xs text-neutral-400">{customer.email}</p></td><td className="px-4 py-3">{customer.country}</td><td className="px-4 py-3">{customer.orders}</td><td className="px-4 py-3">{customer.paidOrders}</td><td className="px-4 py-3">{money(customer.revenue, customer.currency)}</td><td className="px-4 py-3 text-xs text-neutral-500">{customer.lastOrderAt.toLocaleString('en-GB')}</td></tr>)}
        </tbody></table></div></div>
      )}
    </>
  );
}
