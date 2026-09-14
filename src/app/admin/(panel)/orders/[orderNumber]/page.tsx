import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { Notice, PageHeader, StatusBadge, inputClass, labelClass, money } from '../../../_components/ui';
import { refundOrderAction, updateOrderStatusAction, updateTrackingAction } from '../../../actions';

export const dynamic = 'force-dynamic';

export default async function OrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ orderNumber: string }>;
  searchParams: Promise<{ saved?: string; tracking?: string; refunded?: string }>;
}) {
  const [{ orderNumber }, query] = await Promise.all([params, searchParams]);
  const order = await db.order.findUnique({
    where: { orderNumber },
    include: {
      payments: { include: { attempts: { orderBy: { createdAt: 'desc' } }, refunds: { orderBy: { createdAt: 'desc' } } } },
      invoices: true,
      creditNotes: { orderBy: { issuedAt: 'desc' } },
      trackingEvents: { orderBy: { occurredAt: 'asc' } },
    },
  });
  if (!order) notFound();
  const items = (() => { try { return JSON.parse(order.itemsJson) as Array<Record<string, unknown>>; } catch { return []; } })();
  const payment = order.payments[0];

  return (
    <>
      <PageHeader title={`Order ${order.orderNumber}`} description={`${order.firstName} ${order.lastName} · ${order.email}`} />
      {query.saved ? <Notice>Fulfilment status updated.</Notice> : null}
      {query.tracking ? <Notice>Tracking data updated.</Notice> : null}
      {query.refunded ? <Notice>Refund request processed through the payment provider.</Notice> : null}

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
            <div className="grid gap-5 sm:grid-cols-3"><div><p className="text-xs uppercase tracking-wide text-neutral-400">Payment</p><div className="mt-2"><StatusBadge value={order.paymentStatus} /></div></div><div><p className="text-xs uppercase tracking-wide text-neutral-400">Fulfilment</p><div className="mt-2"><StatusBadge value={order.status} /></div></div><div><p className="text-xs uppercase tracking-wide text-neutral-400">Total</p><p className="mt-1 text-xl font-semibold">{money(order.total, order.currency)}</p></div></div>
          </section>

          <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h2 className="font-semibold">Items</h2>
            <div className="mt-4 divide-y divide-neutral-100">
              {items.map((item, index) => <div key={index} className="flex justify-between gap-4 py-3 text-sm"><div><p className="font-medium">{String(item.name ?? item.productName ?? item.slug ?? 'Product')}</p><p className="mt-0.5 text-xs text-neutral-400">{String(item.sku ?? item.productSlug ?? '')}</p></div><div className="text-right text-neutral-600">Qty {String(item.quantity ?? 1)}</div></div>)}
              {!items.length ? <p className="py-5 text-sm text-neutral-500">No parsable line items.</p> : null}
            </div>
          </section>

          <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h2 className="font-semibold">Payment record</h2>
            {payment ? <div className="mt-4 space-y-3 text-sm"><div className="grid gap-3 sm:grid-cols-2"><p><span className="text-neutral-400">Provider:</span> {payment.provider}</p><p><span className="text-neutral-400">Intent:</span> {payment.paymentIntentId}</p><p><span className="text-neutral-400">Method:</span> {payment.paymentMethodType || '—'}</p><p><span className="text-neutral-400">Amount:</span> {money(payment.amount, payment.currency)}</p></div><div className="border-t border-neutral-100 pt-3"><StatusBadge value={payment.status} /></div></div> : <p className="mt-4 text-sm text-neutral-500">No Payment row yet.</p>}

            {payment?.refunds.length ? <div className="mt-5 border-t border-neutral-100 pt-4"><h3 className="text-sm font-medium">Refunds</h3>{payment.refunds.map((refund) => <div key={refund.id} className="mt-2 flex justify-between text-sm"><span>{money(refund.amount, refund.currency)} · {refund.reason || 'No reason'}</span><StatusBadge value={refund.status} /></div>)}</div> : null}
          </section>

          <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h2 className="font-semibold">Tracking history</h2>
            <div className="mt-4 space-y-3">{order.trackingEvents.map((event) => <div key={event.id} className="border-l-2 border-neutral-200 pl-4 text-sm"><div className="flex items-center gap-2"><StatusBadge value={event.status} /><span className="text-xs text-neutral-400">{event.occurredAt.toLocaleString('en-GB')}</span></div><p className="mt-2 text-neutral-700">{event.description}</p>{event.location ? <p className="mt-1 text-xs text-neutral-400">{event.location}</p> : null}</div>)}{!order.trackingEvents.length ? <p className="text-sm text-neutral-500">No tracking events yet.</p> : null}</div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h2 className="font-semibold">Customer and delivery</h2>
            <div className="mt-4 space-y-2 text-sm text-neutral-700"><p>{order.firstName} {order.lastName}</p><p>{order.address}{order.address2 ? `, ${order.address2}` : ''}</p><p>{order.postalCode} {order.city}</p><p>{order.country}</p><p>{order.phone || 'No phone'}</p><p>{order.email}</p></div>
          </section>

          <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h2 className="font-semibold">Fulfilment</h2>
            <form action={updateOrderStatusAction} className="mt-4 space-y-4"><input type="hidden" name="orderNumber" value={order.orderNumber} /><label className={labelClass}>Status<select name="status" defaultValue={order.status} className={inputClass}>{['PENDING','CONFIRMED','PROCESSING','SHIPPED','IN_TRANSIT','OUT_FOR_DELIVERY','DELIVERED','CANCELLED'].map((status) => <option key={status}>{status}</option>)}</select></label><button className="rounded-lg bg-neutral-950 px-4 py-2 text-sm font-medium text-white">Update fulfilment</button></form>
          </section>

          <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h2 className="font-semibold">Tracking</h2>
            <form action={updateTrackingAction} className="mt-4 space-y-4"><input type="hidden" name="orderNumber" value={order.orderNumber} /><label className={labelClass}>Tracking number<input name="trackingNumber" defaultValue={order.trackingNumber ?? ''} className={inputClass} /></label><label className={labelClass}>Carrier<input name="carrier" defaultValue={order.carrier ?? ''} className={inputClass} /></label><label className={labelClass}>Origin / warehouse<input name="originWarehouse" defaultValue={order.originWarehouse ?? ''} className={inputClass} /></label><label className={labelClass}>Estimated delivery<input name="estimatedDeliveryAt" type="datetime-local" defaultValue={order.estimatedDeliveryAt ? new Date(order.estimatedDeliveryAt.getTime() - order.estimatedDeliveryAt.getTimezoneOffset() * 60000).toISOString().slice(0,16) : ''} className={inputClass} /></label><button className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium">Save tracking</button></form>
          </section>

          {payment && order.paymentStatus === 'PAID' ? <section className="rounded-xl border border-red-200 bg-white p-6 shadow-sm"><h2 className="font-semibold text-red-800">Refund</h2><p className="mt-1 text-xs text-neutral-500">This calls the payment provider. Leave amount blank for a full refund.</p><form action={refundOrderAction} className="mt-4 space-y-4"><input type="hidden" name="orderId" value={order.id} /><input type="hidden" name="orderNumber" value={order.orderNumber} /><label className={labelClass}>Amount<input name="amount" inputMode="decimal" placeholder={order.total} className={inputClass} /></label><label className={labelClass}>Reason<input name="reason" className={inputClass} /></label><button className="rounded-lg bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800">Issue refund</button></form></section> : null}
        </div>
      </div>
    </>
  );
}
