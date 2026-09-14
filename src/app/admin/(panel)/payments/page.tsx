import Link from 'next/link';
import { db } from '@/lib/db';
import { EmptyState, PageHeader, StatusBadge, money } from '../../_components/ui';

export const dynamic = 'force-dynamic';

export default async function PaymentsPage() {
  const payments = await db.payment.findMany({
    include: { order: true, refunds: true, attempts: true },
    orderBy: { createdAt: 'desc' },
    take: 300,
  });

  const captured = payments.filter((payment) => ['PAID', 'SUCCEEDED'].includes(payment.status.toUpperCase())).reduce((sum, payment) => sum + (Number.parseFloat(payment.amount) || 0), 0);
  const refunded = payments.flatMap((payment) => payment.refunds).filter((refund) => refund.status === 'SUCCEEDED').reduce((sum, refund) => sum + (Number.parseFloat(refund.amount) || 0), 0);

  return (
    <>
      <PageHeader title="Payments" description={`Captured ${money(captured, 'EUR')} · Refunded ${money(refunded, 'EUR')}. Payment success is controlled by verified gateway events, not manual admin changes.`} />
      {!payments.length ? <EmptyState>No payment records yet.</EmptyState> : (
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
          <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500"><tr><th className="px-4 py-3">Order</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Provider</th><th className="px-4 py-3">Payment status</th><th className="px-4 py-3">Refunds</th><th className="px-4 py-3">Updated</th></tr></thead><tbody className="divide-y divide-neutral-100">
            {payments.map((payment) => <tr key={payment.id}><td className="px-4 py-3"><Link href={`/admin/orders/${payment.order.orderNumber}`} className="font-medium hover:underline">{payment.order.orderNumber}</Link><div className="mt-0.5 max-w-52 truncate font-mono text-[11px] text-neutral-400">{payment.paymentIntentId}</div></td><td className="px-4 py-3">{money(payment.amount, payment.currency)}</td><td className="px-4 py-3 text-neutral-600">{payment.provider}<div className="text-xs text-neutral-400">{payment.paymentMethodType || '—'}</div></td><td className="px-4 py-3"><StatusBadge value={payment.status} /></td><td className="px-4 py-3">{payment.refunds.length ? payment.refunds.map((refund) => <div key={refund.id} className="mb-1"><span className="text-xs">{money(refund.amount, refund.currency)}</span> <StatusBadge value={refund.status} /></div>) : '—'}</td><td className="px-4 py-3 text-xs text-neutral-500">{payment.updatedAt.toLocaleString('en-GB')}</td></tr>)}
          </tbody></table></div>
        </div>
      )}
    </>
  );
}
