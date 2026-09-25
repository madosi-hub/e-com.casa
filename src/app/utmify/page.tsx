import type { Metadata } from 'next';
import Link from 'next/link';
import { reprocessUtmifyAction, loginUtmify, logoutUtmify } from '@/app/utmify/actions';
import { PageHeader, StatCard, money } from '@/app/admin/_components/ui';
import { ReprocessUtmifyButton } from '@/app/utmify/reprocess-button';
import { getUtmifySession } from '@/lib/utmify-auth';
import { getUtmifyAuditPage } from '@/lib/utmify-admin';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'UTMify',
  robots: { index: false, follow: false },
};

type SearchParams = Promise<{
  page?: string;
  synced?: string;
  failed?: string;
  error?: string;
  login?: string;
}>;

function pageNumber(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? '1', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function hasCampaign(row: Awaited<ReturnType<typeof getUtmifyAuditPage>>['rows'][number]): boolean {
  return Boolean(row.tracking.utm_campaign || row.tracking.utm_source || row.tracking.src);
}

function Message({ kind, orderNumber }: { kind: 'success' | 'failure' | 'error'; orderNumber: string }) {
  const success = kind === 'success';
  const styles = success
    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
    : 'border-red-200 bg-red-50 text-red-800';
  const text = success
    ? `A venda ${orderNumber} foi enviada novamente para a UTMify.`
    : kind === 'failure'
      ? `A UTMify recusou ou não respondeu ao envio da venda ${orderNumber}.`
      : `Não foi possível reprocessar a venda ${orderNumber}.`;

  return <div className={`mb-6 rounded-lg border px-4 py-3 text-sm ${styles}`}>{text}</div>;
}

export default async function UtmifyPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const session = await getUtmifySession();
  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-100 px-4 py-12">
        <div className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">E-com.casa</p>
            <h1 className="mt-2 text-2xl font-semibold text-neutral-950">UTMify</h1>
            <p className="mt-2 text-sm text-neutral-500">Acesso reservado ao acompanhamento de vendas e campanhas.</p>
          </div>

          {params.login ? (
            <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              Senha inválida, sessão expirada ou tentativas em excesso.
            </div>
          ) : null}

          <form action={loginUtmify} className="space-y-5">
            <label className="block text-sm font-medium text-neutral-700">
              Senha
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                required
                autoFocus
                className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-neutral-500 focus:ring-2 focus:ring-neutral-200"
              />
            </label>
            <button type="submit" className="w-full rounded-lg bg-neutral-950 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800">
              Entrar
            </button>
          </form>
        </div>
      </div>
    );
  }

  const requestedPage = pageNumber(params.page);
  let audit: Awaited<ReturnType<typeof getUtmifyAuditPage>>;
  try {
    audit = await getUtmifyAuditPage(requestedPage);
  } catch (error) {
    console.error('UTMify dashboard data unavailable', error instanceof Error ? error.message : 'unknown');
    return (
      <div className="min-h-screen bg-neutral-100 px-4 py-8 text-neutral-950 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-[1500px]">
          <PageHeader
            title="UTMify"
            description="Acompanhamento de vendas e campanhas."
            action={(
              <form action={logoutUtmify}>
                <button type="submit" className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50">Sair</button>
              </form>
            )}
          />
          <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800">
            Não foi possível consultar as vendas agora. Verifique a ligação do servidor ao banco de dados e tente novamente.
          </div>
        </div>
      </div>
    );
  }
  const { rows, total, pageCount } = audit;
  const currentPage = Math.min(requestedPage, pageCount);
  const withCampaign = rows.filter(hasCampaign).length;
  const withoutMetadata = rows.filter((row) => !row.metadataAvailable).length;

  return (
    <div className="min-h-screen bg-neutral-100 px-4 py-8 text-neutral-950 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-[1500px]">
      <PageHeader
        title="UTMify"
        description="Vendas pagas, valor e campanha recuperados do histórico da loja e dos metadados do pagamento. O banco de dados é somente consultado; nenhum estado de sincronização é gravado."
        action={(
          <form action={logoutUtmify}>
            <button type="submit" className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50">Sair</button>
          </form>
        )}
      />

      {params.synced ? <Message kind="success" orderNumber={params.synced} /> : null}
      {params.failed ? <Message kind="failure" orderNumber={params.failed} /> : null}
      {params.error ? <Message kind="error" orderNumber={params.error === 'invalid' ? 'informada' : params.error} /> : null}

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Vendas no histórico" value={total} hint="Somente pagamentos confirmados" />
        <StatCard label="Com campanha nesta página" value={withCampaign} hint={`De ${rows.length} vendas exibidas`} />
        <StatCard label="Metadados indisponíveis" value={withoutMetadata} hint="Falha ou ausência do pagamento externo" />
      </div>

      <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Sem gravar no banco, não é possível reconstruir com certeza quais vendas já existem na UTMify. Por isso, o estado aparece como <strong>Não verificável</strong>. Use “Reprocessar” somente para uma venda ausente ou incorreta; o envio reutiliza o mesmo ID do pedido e mostra o resultado imediatamente.
      </div>

      {!rows.length ? (
        <div className="rounded-xl border border-dashed border-neutral-300 bg-white px-6 py-12 text-center text-sm text-neutral-500">
          Nenhuma venda paga foi encontrada.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left text-sm">
              <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
                <tr>
                  <th className="px-4 py-3">Venda</th>
                  <th className="px-4 py-3">Valor</th>
                  <th className="px-4 py-3">Campanha</th>
                  <th className="px-4 py-3">Origem / conjunto / anúncio</th>
                  <th className="px-4 py-3">UTMify</th>
                  <th className="px-4 py-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {rows.map((row) => {
                  const tracking = row.tracking;
                  const justSynced = params.synced === row.order.orderNumber;
                  const justFailed = params.failed === row.order.orderNumber || params.error === row.order.orderNumber;
                  return (
                    <tr key={row.order.id} className="align-top">
                      <td className="px-4 py-4">
                        <span className="font-semibold text-neutral-950">{row.order.orderNumber}</span>
                        <div className="mt-1 text-xs text-neutral-500">
                          {(row.order.paidAt ?? row.order.createdAt).toLocaleString('pt-PT')}
                        </div>
                      </td>
                      <td className="px-4 py-4 font-semibold text-neutral-950">{money(row.order.total, row.order.currency)}</td>
                      <td className="max-w-72 px-4 py-4">
                        <div className="break-words font-medium text-neutral-900">{tracking.utm_campaign || 'Sem UTM de campanha'}</div>
                        {tracking.utm_term ? <div className="mt-1 text-xs text-neutral-500">Posicionamento: {tracking.utm_term}</div> : null}
                      </td>
                      <td className="max-w-80 px-4 py-4 text-xs text-neutral-600">
                        <div><span className="text-neutral-400">Origem:</span> {tracking.utm_source || tracking.src || '—'}</div>
                        <div className="mt-1"><span className="text-neutral-400">Conjunto:</span> {tracking.utm_medium || '—'}</div>
                        <div className="mt-1"><span className="text-neutral-400">Anúncio:</span> {tracking.utm_content || '—'}</div>
                        {!row.metadataAvailable ? <div className="mt-2 text-red-600">{row.metadataError}</div> : null}
                      </td>
                      <td className="px-4 py-4">
                        {justSynced ? (
                          <span className="inline-flex rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">Enviado agora</span>
                        ) : justFailed ? (
                          <span className="inline-flex rounded-full bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/20">Falhou agora</span>
                        ) : (
                          <span className="inline-flex rounded-full bg-neutral-100 px-2 py-1 text-xs font-medium text-neutral-700 ring-1 ring-inset ring-neutral-500/20">Não verificável</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-right">
                        {justSynced ? (
                          <span className="text-xs text-neutral-400">Concluído</span>
                        ) : (
                          <form action={reprocessUtmifyAction}>
                            <input type="hidden" name="orderId" value={row.order.id} />
                            <input type="hidden" name="orderNumber" value={row.order.orderNumber} />
                            <input type="hidden" name="page" value={currentPage} />
                            <ReprocessUtmifyButton />
                          </form>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {pageCount > 1 ? (
        <div className="mt-6 flex items-center justify-between text-sm">
          <span className="text-neutral-500">Página {currentPage} de {pageCount}</span>
          <div className="flex gap-2">
            {currentPage > 1 ? <Link href={`/utmify?page=${currentPage - 1}`} className="rounded-lg border border-neutral-300 bg-white px-3 py-2 font-medium hover:bg-neutral-50">Anterior</Link> : null}
            {currentPage < pageCount ? <Link href={`/utmify?page=${currentPage + 1}`} className="rounded-lg border border-neutral-300 bg-white px-3 py-2 font-medium hover:bg-neutral-50">Próxima</Link> : null}
          </div>
        </div>
      ) : null}
      </div>
    </div>
  );
}
