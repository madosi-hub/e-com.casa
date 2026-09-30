import { db } from '@/lib/db';
import { EmptyState, PageHeader } from '../../_components/ui';

export const dynamic = 'force-dynamic';

type XPaymentsWebhookPayload = {
  event?: unknown;
  status?: unknown;
  transaction_id?: unknown;
  reference?: unknown;
  amount?: unknown;
  currency?: unknown;
  method?: unknown;
};

function text(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number' ? String(value) : '';
}

export default async function WebhooksPage() {
  const events = await db.webhookEvent.findMany({
    where: { provider: 'xpayments_stripe' },
    orderBy: { processedAt: 'desc' },
    take: 100,
    select: { id: true, type: true, payloadJson: true, processedAt: true },
  });

  const rows = events.map((event) => {
    let payload: XPaymentsWebhookPayload = {};
    try {
      const parsed: unknown = JSON.parse(event.payloadJson);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        payload = parsed as XPaymentsWebhookPayload;
      }
    } catch {
      // Keep the event visible even if an old or malformed payload was stored.
    }
    return { event, payload };
  });

  return (
    <>
      <PageHeader
        title="XPayments webhooks"
        description="Eventos aceitos pela rota do E-com.casa (até os 100 mais recentes)."
      />
      <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        Esta lista mostra apenas eventos que passaram pela validação e foram mantidos pelo E-com.casa. Tentativas rejeitadas por assinatura inválida e falhas de processamento não ficam registradas aqui; para essas, consulte o histórico de entregas na XPayments.
      </div>
      {!rows.length ? <EmptyState>Nenhum evento XPayments aceito foi registrado.</EmptyState> : (
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
                <tr>
                  <th className="px-4 py-3">Recebido</th>
                  <th className="px-4 py-3">Evento / status</th>
                  <th className="px-4 py-3">Referência</th>
                  <th className="px-4 py-3">Transação XPayments</th>
                  <th className="px-4 py-3">Valor</th>
                  <th className="px-4 py-3">Método</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {rows.map(({ event, payload }) => {
                  const status = text(payload.status);
                  const amount = text(payload.amount);
                  const currency = text(payload.currency).toUpperCase();
                  return (
                    <tr key={event.id}>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-neutral-500">{event.processedAt.toLocaleString('pt-PT')}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{text(payload.event) || event.type}</div>
                        {status ? <div className="mt-0.5 text-xs text-neutral-500">{status}</div> : null}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{text(payload.reference) || '—'}</td>
                      <td className="px-4 py-3 font-mono text-xs">{text(payload.transaction_id) || '—'}</td>
                      <td className="whitespace-nowrap px-4 py-3">{amount ? `${amount} ${currency}`.trim() : '—'}</td>
                      <td className="px-4 py-3 text-neutral-600">{text(payload.method) || '—'}</td>
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
