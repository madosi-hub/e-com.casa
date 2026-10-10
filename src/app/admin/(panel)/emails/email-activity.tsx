'use client';

import { startTransition, useRef, useState } from 'react';
import { loadEmailActivity, syncEmailInbox } from '@/app/admin/email-actions';
import type { ActionResult, EmailSummary, IntegrationStatus } from '@/lib/email/operations-types';
import { buttonClass, fieldClass, EmailCard } from '../contacts/contact-workspace';

type ActivityData = { emails: EmailSummary[]; total: number; page: number; pageSize: number; integration: IntegrationStatus };
const statusOptions = [['', 'Todos os estados'], ['received', 'Recebido'], ['reserved', 'Reservado (não confirmado)'], ['failed_or_uncertain', 'Resultado incerto'], ['accepted', 'Aceite para envio'], ['scheduled', 'Agendado'], ['sent', 'Enviado'], ['delivered', 'Entregue'], ['opened', 'Abertura registada'], ['clicked', 'Clique registado'], ['bounced', 'Devolvido'], ['failed', 'Falhou'], ['delivery_delayed', 'Entrega atrasada'], ['complained', 'Marcado como spam'], ['suppressed', 'Envio suprimido'], ['provider_unknown', 'Estado indisponível']] as const;

export default function EmailActivity({ initial }: { initial: ActionResult<ActivityData> }) {
  const [data, setData] = useState(initial.ok ? initial.data : null);
  const [error, setError] = useState(initial.ok ? '' : initial.error);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const syncLock = useRef(false);
  const version = useRef(0);
  const [applied, setApplied] = useState({ query: '', status: '' });
  const [batch, setBatch] = useState<{ imported: number; hasMore: boolean; nextCursor?: string } | null>(null);
  function refresh(page = 1, filters = applied) {
    const request = ++version.current;
    setBusy(true); setError('');
    startTransition(async () => {
      try {
        const result = await loadEmailActivity({ ...filters, page });
        if (request !== version.current) return;
        if (result.ok) { setData(result.data); setApplied(filters); } else setError(result.error);
      } catch { if (request === version.current) setError('Não foi possível carregar a atividade. Tente novamente.'); }
      finally { if (request === version.current) setBusy(false); }
    });
  }
  function syncInbox() {
    if (syncLock.current || busy || !data?.integration.sendingConfigured) return;
    if (batch?.hasMore && !batch.nextCursor) { setError('O servidor indicou mais resultados sem fornecer um cursor. Recarregue a página antes de continuar.'); return; }
    syncLock.current = true; setSyncing(true); setError('');
    startTransition(async () => {
      try {
        const result = await syncEmailInbox(batch?.hasMore ? { cursor: batch.nextCursor } : {});
        if (!result.ok) { setError(result.error); return; }
        setBatch({ ...result.data, imported: (batch?.hasMore ? batch.imported : 0) + result.data.imported });
        refresh(1);
      } catch { setError('Não foi possível concluir este lote de importação. Pode repetir; não foi iniciada uma importação contínua.'); }
      finally { syncLock.current = false; setSyncing(false); }
    });
  }
  return <div className="space-y-5">
    <div className="grid gap-3 sm:grid-cols-2"><div className="rounded-xl border border-neutral-200 bg-white p-4"><p className="text-xs uppercase tracking-wide text-neutral-500">Envio de emails</p><p className="mt-2 text-sm font-medium">{data ? data.integration.sendingConfigured ? 'Configuração presente' : 'Não configurado' : 'Estado indisponível'}</p></div><div className="rounded-xl border border-neutral-200 bg-white p-4"><p className="text-xs uppercase tracking-wide text-neutral-500">Eventos de entrega</p><p className="mt-2 text-sm font-medium">{data ? data.integration.webhookConfigured ? 'Configuração de webhook presente' : 'Webhook não configurado' : 'Estado indisponível'}</p></div></div>
    <p className="text-xs leading-5 text-neutral-500">A presença de configuração não verifica a ligação em tempo real. Aceite para envio não significa entregue. {data?.integration.historyNotice || 'Só estão disponíveis os registos guardados; o histórico não é completo.'}</p>
    <section className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-sm font-semibold">Importar histórico do Resend</h2><p className="mt-1 text-xs text-neutral-500">Primeiro mensagens recebidas, depois registos de envios anteriores. Cada clique importa apenas um lote.</p>{batch && <p role="status" className="mt-2 text-sm">{batch.imported} emails importados · {batch.hasMore ? 'Existem mais resultados para importar.' : 'Importação concluída para os resultados disponíveis.'}</p>}</div><button type="button" className={buttonClass} disabled={syncing || busy || !data?.integration.sendingConfigured || !!(batch?.hasMore && !batch.nextCursor)} onClick={syncInbox}>{syncing ? 'A importar…' : batch?.hasMore ? 'Continuar importação' : 'Importar emails recebidos'}</button></section>
    {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-6">
      <form aria-label="Filtrar atividade" onSubmit={e => { e.preventDefault(); refresh(1, { query, status }); }} className="grid items-end gap-3 sm:grid-cols-[minmax(0,1fr)_220px_auto]"><div><label htmlFor="activity-query" className="mb-2 block text-sm font-medium">Pesquisar emails</label><input id="activity-query" aria-label="Pesquisar emails" className={fieldClass} value={query} onChange={e => setQuery(e.target.value)} placeholder="Email, assunto ou encomenda" /></div><div><label htmlFor="activity-status" className="mb-2 block text-sm font-medium">Estado do email</label><select id="activity-status" aria-label="Estado do email" className={fieldClass} value={status} onChange={e => setStatus(e.target.value)}>{statusOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div><button className={buttonClass} disabled={busy || syncing}>Filtrar</button></form>
      <div className="mt-5 flex items-center justify-between border-t border-neutral-200 pt-4"><h2 className="text-sm font-semibold">Atividade registada</h2><span className="text-xs text-neutral-500">{data?.total ?? '—'} registos</span><button type="button" className={buttonClass} disabled={busy || syncing} onClick={() => refresh(data?.page ?? 1)}>Atualizar</button></div>
      <div aria-busy={busy} className="mt-4 space-y-3">{busy && <p role="status" className="text-sm text-neutral-500">A carregar atividade…</p>}{data?.emails.map(email => <EmailCard key={email.id} email={email} />)}{!data?.emails.length && <p className="rounded-lg border border-dashed border-neutral-300 py-12 text-center text-sm text-neutral-500">Nenhum email registado com estes filtros.</p>}</div>
      <div className="mt-5 flex items-center justify-between gap-3 border-t border-neutral-200 pt-4"><button className={buttonClass} disabled={busy || syncing || !data || data.page <= 1} onClick={() => refresh((data?.page ?? 1) - 1)}>Anterior</button><span className="text-xs text-neutral-500">Página {data?.page ?? 1}</span><button className={buttonClass} disabled={busy || syncing || !data || data.page * data.pageSize >= data.total} onClick={() => refresh((data?.page ?? 1) + 1)}>Seguinte</button></div>
    </section>
  </div>;
}
