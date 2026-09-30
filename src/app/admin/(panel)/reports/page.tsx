import Link from 'next/link';
import { db } from '@/lib/db';
import { PageHeader, StatCard, money } from '../../_components/ui';
import { buildSalesReport, dateInputValue, reportDateRange } from '@/lib/admin/reports';

export const dynamic = 'force-dynamic';

const PURCHASE_STATES = ['PAID', 'REFUNDED', 'PARTIALLY_REFUNDED'];

function percent(value: number, maximum: number): string {
  if (maximum <= 0) return '0%';
  return `${Math.max(4, Math.round((value / maximum) * 100))}%`;
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const query = await searchParams;
  const { from, to } = reportDateRange(query.from, query.to);
  const orders = await db.order.findMany({
    where: {
      paymentStatus: { in: PURCHASE_STATES },
      OR: [
        { paidAt: { gte: from, lte: to } },
        { paidAt: null, createdAt: { gte: from, lte: to } },
      ],
    },
    select: {
      orderNumber: true,
      total: true,
      currency: true,
      country: true,
      city: true,
      postalCode: true,
      itemsJson: true,
      paymentStatus: true,
      payments: {
        select: {
          refunds: { select: { amount: true, currency: true, status: true } },
        },
      },
    },
    orderBy: [{ paidAt: 'desc' }, { createdAt: 'desc' }],
  });

  const report = buildSalesReport(orders.map((order) => ({
    ...order,
    refunds: order.payments.flatMap((payment) => payment.refunds),
  })));
  const topProductQuantity = report.products[0]?.quantity ?? 0;
  const topRegionOrders = report.portugalRegions[0]?.orders ?? 0;

  return (
    <>
      <PageHeader
        title="Relatórios"
        description="Vendas confirmadas, ticket médio, produtos e distribuição geográfica por período."
      />

      <form className="mb-6 grid gap-3 rounded-xl border border-neutral-200 bg-white p-5 shadow-sm sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <label className="text-sm font-medium text-neutral-700">
          Data inicial
          <input className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2" type="date" name="from" defaultValue={dateInputValue(from)} />
        </label>
        <label className="text-sm font-medium text-neutral-700">
          Data final
          <input className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2" type="date" name="to" defaultValue={dateInputValue(to)} />
        </label>
        <button className="rounded-lg bg-neutral-950 px-5 py-2.5 text-sm font-medium text-white hover:bg-neutral-800">Aplicar período</button>
        <div className="flex flex-wrap gap-2 text-xs sm:col-span-3">
          {[7, 30, 90].map((days) => {
            const presetTo = new Date();
            const presetFrom = new Date();
            presetFrom.setDate(presetFrom.getDate() - (days - 1));
            return <Link key={days} className="rounded-full border border-neutral-200 px-3 py-1.5 hover:bg-neutral-50" href={`/admin/reports?from=${dateInputValue(presetFrom)}&to=${dateInputValue(presetTo)}`}>Últimos {days} dias</Link>;
          })}
        </div>
      </form>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Encomendas" value={report.orderCount} hint={`${report.itemsSold} unidades vendidas`} />
        <StatCard label="Vendas brutas" value={money(report.grossRevenue, 'EUR')} hint={report.nonEurOrders ? `${report.nonEurOrders} encomenda(s) noutra moeda fora do total` : 'Encomendas em EUR'} />
        <StatCard label="Ticket médio" value={money(report.averageTicket, 'EUR')} hint="Valor bruto por encomenda em EUR" />
        <StatCard label="Vendas líquidas" value={money(report.netRevenue, 'EUR')} hint={`${money(report.refundedRevenue, 'EUR')} reembolsado`} />
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <section className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
          <div className="border-b border-neutral-200 px-5 py-4">
            <h2 className="font-semibold">Produtos mais vendidos</h2>
            <p className="mt-1 text-xs text-neutral-500">Ordenados pela quantidade confirmada no período.</p>
          </div>
          {report.products.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-neutral-100 text-xs uppercase tracking-wide text-neutral-400"><tr><th className="px-5 py-3">Produto</th><th className="px-5 py-3">Unidades</th><th className="px-5 py-3">Receita EUR</th></tr></thead>
                <tbody className="divide-y divide-neutral-100">
                  {report.products.slice(0, 20).map((product) => (
                    <tr key={product.slug}>
                      <td className="min-w-72 px-5 py-3"><p className="font-medium">{product.name}</p><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-neutral-100"><div className="h-full rounded-full bg-neutral-900" style={{ width: percent(product.quantity, topProductQuantity) }} /></div><p className="mt-1 font-mono text-[10px] text-neutral-400">{product.slug}</p></td>
                      <td className="px-5 py-3 font-semibold">{product.quantity}</td>
                      <td className="px-5 py-3">{money(product.revenue, 'EUR')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="px-5 py-10 text-sm text-neutral-500">Sem produtos vendidos neste período.</p>}
        </section>

        <div className="space-y-6">
          <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold">Regiões de Portugal</h2>
            <p className="mt-1 text-xs leading-5 text-neutral-500">Agrupamento aproximado pela primeira posição do código postal. Não representa uma classificação administrativa oficial.</p>
            {report.portugalRegions.length ? <div className="mt-5 space-y-4">{report.portugalRegions.map((region) => (
              <div key={region.region}>
                <div className="flex items-center justify-between gap-3 text-sm"><span>{region.region}</span><span className="font-semibold">{region.orders}</span></div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-neutral-100"><div className="h-full rounded-full bg-emerald-600" style={{ width: percent(region.orders, topRegionOrders) }} /></div>
                <p className="mt-1 text-right text-[11px] text-neutral-400">{money(region.revenue, 'EUR')}</p>
              </div>
            ))}</div> : <p className="mt-5 text-sm text-neutral-500">Sem encomendas portuguesas neste período.</p>}
          </section>

          <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold">Perfil de género</h2>
            <p className="mt-3 text-sm leading-6 text-neutral-600">Não coletado. O sistema não tenta deduzir género pelo nome ou e-mail, porque essa inferência pode ser incorreta e invasiva.</p>
            <p className="mt-2 text-xs leading-5 text-neutral-400">Para medir esta informação no futuro, o cliente precisaria fornecê-la de forma opcional e explícita.</p>
          </section>
        </div>
      </div>
    </>
  );
}
