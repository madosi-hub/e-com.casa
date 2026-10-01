import { isPlacedOrder } from '@/lib/order-visibility';
import Link from 'next/link';
import { db } from '@/lib/db';
import { reconcilePaymentAction } from '../../actions';
import { EmptyState, PageHeader, StatusBadge, money } from '../../_components/ui';
import { ReconcileButton } from './reconcile-button';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type ReconcileOutcome = 'paid_sent' | 'delivery_failed' | 'mismatch' | 'contact_missing' | 'unavailable' | 'not_paid' | 'not_found';

const outcomeMessages: Record<ReconcileOutcome, string> = {
  paid_sent: 'XPayments confirmou o pagamento. O pedido foi reconciliado e o evento foi entregue à ponte Umami/UTMify.',
  delivery_failed: 'XPayments confirmou o pagamento, mas a entrega à ponte Umami/UTMify falhou. Tente novamente.',
  mismatch: 'O PaymentIntent, valor ou moeda não corresponde ao pedido. Nenhuma confirmação foi forçada.',
  contact_missing: 'XPayments confirmou o pagamento, mas faltam dados do cliente no checkout. O pedido não foi confirmado.',
  unavailable: 'Não foi possível consultar o XPayments. Nenhuma confirmação foi forçada.',
  not_paid: 'XPayments não confirmou sucesso nesta consulta. O estado local foi preservado.',
  not_found: 'Pagamento não encontrado ou provedor não suportado.',
};

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ reconcile?: string; order?: string; provider?: string }>;
}) {
  const query = await searchParams;
  const outcome = query.reconcile && query.reconcile in outcomeMessages
    ? query.reconcile as ReconcileOutcome
    : null;
  const providerStatus = query.provider && ['CREATED', 'REQUIRES_PAYMENT_METHOD', 'REQUIRES_ACTION', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'CANCELLED'].includes(query.provider)
    ? query.provider
    : null;
  const payments = await db.payment.findMany({
    include: { order: true, refunds: true },
    orderBy: { createdAt: 'desc' },
    take: 300,
  });

  const captured = payments.filter((payment) => ['PAID', 'SUCCEEDED'].includes(payment.status.toUpperCase())).reduce((sum, payment) => sum + (Number.parseFloat(payment.amount) || 0), 0);
  const refunded = payments.flatMap((payment) => payment.refunds).filter((refund) => refund.status === 'SUCCEEDED').reduce((sum, refund) => sum + (Number.parseFloat(refund.amount) || 0), 0);

  return (
    <>
      <PageHeader title="Payments" description={`Captured ${money(captured, 'EUR')} · Refunded ${money(refunded, 'EUR')}. Payment success is controlled by verified gateway events, not manual admin changes.`} />
      {outcome ? (
        <div
          role="status"
          className={`mb-6 rounded-lg border px-4 py-3 text-sm ${outcome === 'paid_sent' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-900'}`}
        >
          {query.order ? <span className="font-semibold">{query.order}: </span> : null}
          {outcomeMessages[outcome]}
          {providerStatus && outcome === 'not_paid' ? ` Estado no provedor: ${providerStatus}.` : null}
        </div>
      ) : null}
      {!payments.length ? <EmptyState>No payment records yet.</EmptyState> : (
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
                <tr>
                  <th className="px-4 py-3">Order / checkout</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Provider</th>
                  <th className="px-4 py-3">Payment status</th>
                  <th className="px-4 py-3">Refunds</th>
                  <th className="px-4 py-3">Updated</th>
                  <th className="px-4 py-3">Check payment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {payments.map((payment) => (
                  <tr key={payment.id}>
                    <td className="px-4 py-3">
                      {isPlacedOrder(payment.order)
                        ? <Link href={`/admin/orders/${payment.order.orderNumber}`} className="font-medium hover:underline">{payment.order.orderNumber}</Link>
                        : <span className="text-neutral-500">Checkout {payment.order.orderNumber}</span>}
                      <div className="mt-0.5 max-w-52 truncate font-mono text-[11px] text-neutral-400">{payment.paymentIntentId}</div>
                    </td>
                    <td className="px-4 py-3">{money(payment.amount, payment.currency)}</td>
                    <td className="px-4 py-3 text-neutral-600">{payment.provider}<div className="text-xs text-neutral-400">{payment.paymentMethodType || '—'}</div></td>
                    <td className="px-4 py-3"><StatusBadge value={payment.status} /><div className="mt-1 text-xs text-neutral-500">Pedido: {payment.order.paymentStatus}</div></td>
                    <td className="px-4 py-3">{payment.refunds.length ? payment.refunds.map((refund) => <div key={refund.id} className="mb-1"><span className="text-xs">{money(refund.amount, refund.currency)}</span> <StatusBadge value={refund.status} /></div>) : '—'}</td>
                    <td className="px-4 py-3 text-xs text-neutral-500">{payment.updatedAt.toLocaleString('en-GB')}</td>
                    <td className="px-4 py-3">
                      {payment.provider === 'xpayments_stripe' ? (
                        <form action={reconcilePaymentAction}>
                          <input type="hidden" name="paymentId" value={payment.id} />
                          <ReconcileButton />
                        </form>
                      ) : '—'}
                    </td>
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
