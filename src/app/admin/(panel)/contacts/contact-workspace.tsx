'use client';

import { startTransition, useRef, useState } from 'react';
import { linkContactOrder, searchContactOrders, replyToContact, loadContact, loadContacts } from '@/app/admin/email-actions';
import type { ActionResult, ContactDetail, ContactSummary, IntegrationStatus, OrderSummary, EmailSummary } from '@/lib/email/operations-types';

type ContactsData = { messages: ContactSummary[]; total: number; page: number; pageSize: number; subscribers: number; integration: IntegrationStatus };
export const buttonClass = 'inline-flex min-h-10 items-center justify-center rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium hover:bg-neutral-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 disabled:cursor-not-allowed disabled:opacity-50';
export const fieldClass = 'w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm focus:outline-2 focus:outline-neutral-500';
export function dateLabel(value: string) { return new Date(value).toLocaleString('pt-PT', { timeZone: 'Europe/Lisbon', dateStyle: 'medium', timeStyle: 'short' }); }

export function OrderCard({ order, action }: { order: OrderSummary; action?: React.ReactNode }) {
  return <article className="rounded-lg border border-neutral-200 p-4"><div className="flex flex-wrap items-start justify-between gap-2"><a href={`/admin/orders/${encodeURIComponent(order.orderNumber)}`} className="text-sm font-semibold underline underline-offset-4">{order.orderNumber}</a><span className="text-sm font-medium">{new Intl.NumberFormat('pt-PT', { style: 'currency', currency: order.currency }).format(Number(order.total))}</span></div><p className="mt-2 text-xs text-neutral-500">{order.customerName} · {order.email}</p><p className="mt-2 text-xs text-neutral-500">Criada: {dateLabel(order.createdAt)}{order.paidAt ? ` · Paga: ${dateLabel(order.paidAt)}` : ''}</p><p className="mt-2 text-xs">Encomenda: {order.status} · Pagamento: {order.paymentStatus}</p>{order.trackingNumber && <p className="mt-2 text-xs">Seguimento: {order.trackingNumber}</p>}<ul className="mt-3 space-y-1 text-sm text-neutral-700">{order.items.map((item, i) => <li key={i}>{item.quantity} × {item.name}{item.price ? ` · ${item.price} ${order.currency}` : ''}</li>)}</ul>{action && <div className="mt-3">{action}</div>}</article>;
}
export function EmailCard({ email }: { email: EmailSummary }) {
  const statuses: Record<string, string> = { reserved: 'Reservado (envio não confirmado)', failed_or_uncertain: 'Resultado incerto (verificar no Resend)', provider_unknown: 'Estado não disponível', accepted: 'Aceite para envio (não confirma entrega)', scheduled: 'Agendado', sent: 'Enviado (não confirma entrega)', delivered: 'Entregue', opened: 'Abertura registada', clicked: 'Clique registado', complained: 'Marcado como spam', suppressed: 'Envio suprimido', bounced: 'Devolvido', failed: 'Falhou', delayed: 'Entrega atrasada', delivery_delayed: 'Entrega atrasada', received: 'Recebido', pending: 'Pendente', queued: 'Em fila' };
  const key = email.status.toLowerCase().replace(/^email\./, '');
  const negative = ['bounced', 'failed', 'failed_or_uncertain', 'complained', 'suppressed'].includes(key);
  return <article className="rounded-lg border border-neutral-200 p-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span className="text-xs font-medium uppercase tracking-wide text-neutral-500">{email.direction === 'inbound' ? 'Entrada' : 'Saída'} · {email.type}</span>
      <span className={`rounded-full px-2 py-1 text-xs ${negative ? 'bg-red-50 text-red-800' : key === 'delivered' ? 'bg-emerald-50 text-emerald-800' : 'bg-neutral-100 text-neutral-700'}`}>{statuses[key] ?? email.status}</span>
    </div>
    <h4 className="mt-3 text-sm font-semibold">{email.subject || '(Sem assunto)'}</h4>
    <p className="mt-1 break-all text-xs text-neutral-500">De: {email.from} · Para: {email.to.join(', ')}</p>
    <p className="mt-2 text-xs text-neutral-400">{dateLabel(email.createdAt)} · Hora de Lisboa{email.orderNumber ? ` · ${email.orderNumber}` : ''}</p>
    <details className="mt-3"><summary className="cursor-pointer text-sm font-medium">Ver mensagem</summary><p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-neutral-700">{email.text || 'Sem conteúdo de texto disponível.'}</p></details>
    {email.error && <p className="mt-3 text-xs text-red-800">{email.error}</p>}
  </article>;
}

export default function ContactWorkspace({ initial }: { initial: ActionResult<ContactsData> }) {
  const [data, setData] = useState(initial.ok ? initial.data : null);
  const [error, setError] = useState(initial.ok ? '' : initial.error);
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<ContactDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [listBusy, setListBusy] = useState(false);
  const selection = useRef(0);
  const drafts = useRef<Record<string, { text: string; requestId: string; ambiguous: boolean; failed?: boolean }>>({});
  const [draftText, setDraftText] = useState('');
  const [draftLocked, setDraftLocked] = useState(false);
  const [failedSend, setFailedSend] = useState(false);
  const [preview, setPreview] = useState(false);
  const [sending, setSending] = useState(false);
  const sendingLock = useRef(false);
  const [notice, setNotice] = useState('');
  function editDraft(value: string) {
    if (!selected) return;
    const previous = drafts.current[selected];
    if (previous?.ambiguous) return;
    drafts.current[selected] = { text: value, requestId: crypto.randomUUID(), ambiguous: false };
    setDraftText(value); setPreview(false); setFailedSend(false);
  }
  function sendReply() {
    if (!detail || sendingLock.current || !data?.integration.sendingConfigured) return;
    const contactId = detail.contact.id;
    const draft = drafts.current[contactId];
    if (!draft?.text.trim() || !preview) return;
    const version = selection.current;
    sendingLock.current = true; setSending(true); setError(''); setNotice('');
    startTransition(async () => {
      try {
        const result = await replyToContact({ contactId, message: draft.text, requestId: draft.requestId });
        if (result.ok) {
          const email = result.data.email;
          const accepted = ['accepted', 'sent', 'delivered', 'opened', 'clicked'].includes(email.status);
          if (accepted) delete drafts.current[contactId];
          else { draft.failed = email.status === 'failed'; draft.ambiguous = !draft.failed; }
          if (version === selection.current) {
            setDetail(current => current ? { ...current, emails: [email, ...current.emails.filter(previous => previous.id !== email.id)] } : current);
            if (accepted) { setDraftText(''); setDraftLocked(false); setFailedSend(false); setPreview(false); setNotice('Email aceite para envio. A aceitação não confirma a entrega; consulte o estado no histórico.'); }
            else {
              setDraftLocked(true); setFailedSend(!!draft.failed);
              setError(draft.failed ? 'O envio falhou e não foi aceite pelo fornecedor. Corrija a configuração ou o problema antes de preparar uma nova tentativa.' : 'Envio não confirmado. Verifique o histórico e o Resend; repetir esta confirmação mantém o mesmo identificador e não inicia outro envio.');
            }
          }
        } else if (version === selection.current) setError(result.error);
      } catch {
        draft.ambiguous = true;
        if (version === selection.current) { setDraftLocked(true); setError('Resultado do envio desconhecido. Repita a confirmação com a mesma mensagem para evitar duplicados. O rascunho fica bloqueado até obter confirmação.'); }
      } finally { sendingLock.current = false; setSending(false); }
    });
  }
  const [orderQuery, setOrderQuery] = useState('');
  const [orderResults, setOrderResults] = useState<OrderSummary[] | null>(null);
  const [orderBusy, setOrderBusy] = useState(false);
  const orderLock = useRef(false);
  const orderVersion = useRef(0);
  const [association, setAssociation] = useState<{ order: OrderSummary | null } | null>(null);
  const [mismatchConfirmed, setMismatchConfirmed] = useState(false);
  const mismatch = !!association?.order && association.order.email.trim().toLowerCase() !== detail?.contact.email.trim().toLowerCase();
  function searchOrders() {
    if (!detail || !orderQuery.trim() || orderLock.current) return;
    const id = detail.contact.id, version = selection.current, request = ++orderVersion.current;
    setOrderBusy(true); setError('');
    startTransition(async () => {
      try { const result = await searchContactOrders({ contactId: id, query: orderQuery }); if (version !== selection.current || request !== orderVersion.current) return; if (result.ok) setOrderResults(result.data); else setError(result.error); }
      catch { if (version === selection.current) setError('Não foi possível pesquisar encomendas.'); }
      finally { if (version === selection.current && request === orderVersion.current) setOrderBusy(false); }
    });
  }
  function confirmAssociation() {
    if (!detail || !association || orderLock.current || (mismatch && !mismatchConfirmed)) return;
    const id = detail.contact.id, version = selection.current, orderNumber = association.order?.orderNumber ?? null;
    orderLock.current = true; setOrderBusy(true); setError('');
    startTransition(async () => {
      try { const result = await linkContactOrder({ contactId: id, orderNumber }); if (version !== selection.current) return; if (result.ok) { setDetail(result.data); setAssociation(null); setData(current => current ? { ...current, messages: current.messages.map(c => c.id === id ? result.data.contact : c) } : current); } else setError(result.error); }
      catch { if (version === selection.current) setError('Não foi possível confirmar a associação. Recarregue o contacto antes de repetir.'); }
      finally { orderLock.current = false; setOrderBusy(false); }
    });
  }
  const listVersion = useRef(0);
  function select(id: string) {
    const version = ++selection.current;
    setOrderQuery(''); setOrderResults(null); setAssociation(null); setMismatchConfirmed(false); setOrderBusy(orderLock.current);
    setSelected(id); setDraftLocked(!!(drafts.current[id]?.ambiguous || drafts.current[id]?.failed)); setFailedSend(!!drafts.current[id]?.failed); setDraftText(drafts.current[id]?.text ?? ''); setPreview(false); setNotice(''); setDetail(null); setError(''); setLoading(true);
    startTransition(async () => {
      try { const result = await loadContact(id); if (version !== selection.current) return; if (result.ok) setDetail(result.data); else setError(result.error); }
      catch { if (version === selection.current) setError('Não foi possível carregar o contacto. Tente novamente.'); }
      finally { if (version === selection.current) setLoading(false); }
    });
  }
  function refresh(page = 1) {
    const version = ++listVersion.current;
    setListBusy(true); setError('');
    startTransition(async () => {
      try { const result = await loadContacts({ query, page }); if (version !== listVersion.current) return; if (result.ok) setData(result.data); else setError(result.error); }
      catch { if (version === listVersion.current) setError('Não foi possível carregar os contactos.'); }
      finally { if (version === listVersion.current) setListBusy(false); }
    });
  }
  return <div className="space-y-5">
    <div className="flex flex-wrap items-center gap-3 text-sm text-neutral-500"><span>{data?.total ?? '—'} contactos</span><span aria-hidden="true">·</span><span>{data?.subscribers ?? '—'} subscritores da newsletter</span><a href="/admin/emails" className="ml-auto font-medium text-neutral-800 underline underline-offset-4">Monitorizar emails →</a></div>
    {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(260px,340px)_minmax(0,1fr)]">
      <section aria-label="Lista de contactos" className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
        <form onSubmit={e => { e.preventDefault(); refresh(); }} className="space-y-2 border-b border-neutral-200 p-4"><label htmlFor="contacts-query" className="text-sm font-medium">Pesquisar contactos</label><div className="flex gap-2"><input id="contacts-query" className={fieldClass} value={query} onChange={e => setQuery(e.target.value)} placeholder="Nome, email ou assunto" /><button className={buttonClass} disabled={listBusy}>Pesquisar</button></div></form>
        <div aria-busy={listBusy} className="divide-y divide-neutral-100">{data?.messages.map(contact => <button key={contact.id} type="button" aria-label={`Abrir contacto de ${contact.name || contact.email}`} aria-pressed={selected === contact.id} onClick={() => select(contact.id)} className={`block w-full border-l-2 p-4 text-left transition focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-neutral-900 ${selected === contact.id ? 'border-neutral-900 bg-neutral-100' : 'border-transparent hover:bg-neutral-50'}`}><div className="flex items-center justify-between gap-2"><span className="truncate text-sm font-semibold">{contact.name || contact.email}</span><span className="rounded bg-neutral-100 px-2 py-0.5 text-[10px] uppercase tracking-wide text-neutral-500">{contact.source === 'email' ? 'Email' : 'Formulário'}</span></div><p className="mt-1 truncate text-xs text-neutral-500">{contact.email}</p><p className="mt-3 truncate text-sm">{contact.subject || '(Sem assunto)'}</p><p className="mt-1 line-clamp-2 text-xs leading-5 text-neutral-500">{contact.message}</p><time className="mt-3 block text-xs text-neutral-400">{dateLabel(contact.createdAt)}</time></button>)}{!data?.messages.length && <p className="p-8 text-center text-sm text-neutral-500">Nenhum contacto encontrado.</p>}</div>
        <div className="flex items-center justify-between gap-2 border-t border-neutral-200 p-3"><button className={buttonClass} disabled={listBusy || !data || data.page <= 1} onClick={() => refresh((data?.page ?? 1) - 1)}>Anterior</button><span className="text-xs text-neutral-500">Página {data?.page ?? 1}</span><button className={buttonClass} disabled={listBusy || !data || data.page * data.pageSize >= data.total} onClick={() => refresh((data?.page ?? 1) + 1)}>Seguinte</button></div>
      </section>
      <section aria-label="Detalhes do contacto" aria-busy={loading} aria-live="polite" className="min-w-0 rounded-xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-6">
        {loading ? <p className="py-12 text-center text-sm text-neutral-500">A carregar contacto…</p> : detail ? <><header className="border-b border-neutral-200 pb-5"><h2 className="text-xl font-semibold">{detail.contact.name || 'Contacto'}</h2><p className="mt-1 break-all text-sm text-neutral-500">{detail.contact.email}</p><p className="mt-3 text-xs text-neutral-400">Recebido em {dateLabel(detail.contact.createdAt)} · Hora de Lisboa</p></header><h3 className="mt-5 font-medium">{detail.contact.subject || '(Sem assunto)'}</h3><p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-neutral-700">{detail.contact.message}</p>
          <section className="mt-6 space-y-4 border-t border-neutral-200 pt-5"><h3 className="font-semibold">Encomenda associada</h3>{detail.linkedOrder ? <OrderCard order={detail.linkedOrder} action={<button className={buttonClass} disabled={orderBusy} onClick={() => { setAssociation({ order: null }); setMismatchConfirmed(false); }}>Desassociar encomenda</button>} /> : <div><p className="text-sm text-neutral-500">{detail.contact.orderRef ? `Referência guardada: ${detail.contact.orderRef}. Encomenda não encontrada.` : 'Sem encomenda associada.'}</p>{detail.contact.orderRef && <button className={`${buttonClass} mt-3`} disabled={orderBusy} onClick={() => { setAssociation({ order: null }); setMismatchConfirmed(false); }}>Desassociar encomenda</button>}</div>}
          <h3 className="font-semibold">Compras com este email</h3><p className="text-xs text-neutral-500">Correspondência por email; não cria associações automaticamente.</p>{detail.orders.length ? detail.orders.map(order => <OrderCard key={order.id} order={order} action={detail.contact.orderRef !== order.orderNumber ? <button className={buttonClass} disabled={orderBusy} onClick={() => { setAssociation({ order }); setMismatchConfirmed(false); }}>Associar {order.orderNumber}</button> : undefined} />) : <p className="text-sm text-neutral-500">Nenhuma compra encontrada para este email.</p>}
          <form aria-label="Pesquisa de encomendas" onSubmit={e => { e.preventDefault(); searchOrders(); }} className="space-y-2"><label htmlFor="order-search" className="text-sm font-medium">Pesquisar encomendas</label><p className="text-xs text-neutral-500">Procure pelo número da encomenda, nome ou email.</p><div className="flex gap-2"><input id="order-search" aria-label="Pesquisar encomendas" className={fieldClass} value={orderQuery} onChange={e => setOrderQuery(e.target.value)} /><button className={buttonClass} disabled={orderBusy || !orderQuery.trim()}>{orderBusy ? 'A pesquisar…' : 'Pesquisar'}</button></div></form>
          {orderResults?.map(order => <OrderCard key={order.id} order={order} action={<button className={buttonClass} disabled={orderBusy || detail.contact.orderRef === order.orderNumber} onClick={() => { setAssociation({ order }); setMismatchConfirmed(false); }}>Associar {order.orderNumber}</button>} />)}{orderResults?.length === 0 && <p className="text-sm text-neutral-500">Nenhuma encomenda encontrada.</p>}
          {association && <div role="group" aria-label="Confirmar alteração da associação" className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-4"><p className="text-sm font-medium">{association.order ? `Associar ${association.order.orderNumber} a ${detail.contact.email}?` : `Desassociar ${detail.contact.orderRef}?`}</p>{mismatch && <><p className="text-sm text-amber-900">Esta encomenda tem um email diferente: {association.order?.email}. Confirme que pertence à pessoa correta.</p><label className="flex items-start gap-2 text-sm"><input type="checkbox" aria-label="Confirmo a associação a um email diferente" checked={mismatchConfirmed} onChange={e => setMismatchConfirmed(e.target.checked)} />Confirmo a associação a um email diferente</label></>}<div className="flex flex-wrap gap-2"><button className={buttonClass} disabled={orderBusy || (mismatch && !mismatchConfirmed)} onClick={confirmAssociation}>{association.order ? 'Confirmar associação' : 'Confirmar desassociação'}</button><button className={buttonClass} disabled={orderBusy} onClick={() => setAssociation(null)}>Cancelar</button></div></div>}</section>
          <section className="mt-6 space-y-3 border-t border-neutral-200 pt-5"><h3 className="font-semibold">Histórico de emails</h3><p className="text-xs leading-5 text-neutral-500">{data?.integration.historyNotice || 'Apenas os registos disponíveis. Não é um histórico completo de mensagens enviadas ou recebidas.'}{detail.historyLimited ? ' O histórico deste contacto é limitado.' : ''}</p>{detail.emails.length ? detail.emails.map(email => <EmailCard key={email.id} email={email} />) : <p className="text-sm text-neutral-500">Sem emails registados para este contacto.</p>}</section>
          <section className="mt-6 border-t border-neutral-200 pt-5">
            <h3 className="font-semibold">Responder por email</h3>
            <p className="mt-1 text-xs text-neutral-500">Destinatário: {detail.contact.email}</p>
            {!data?.integration.sendingConfigured && <p className="mt-2 text-sm text-amber-800">Envio não configurado.</p>}
            <label htmlFor="contact-reply" className="mt-4 block text-sm font-medium">Mensagem de resposta</label>
            <textarea id="contact-reply" aria-label="Mensagem de resposta" maxLength={20_000} className={`${fieldClass} mt-2 min-h-36`} value={draftText} disabled={sending || draftLocked} onChange={e => editDraft(e.target.value)} />
            {failedSend && <button type="button" className={`${buttonClass} mt-3 mr-3`} disabled={sending} onClick={() => {
              if (!selected) return;
              drafts.current[selected] = { text: draftText, requestId: crypto.randomUUID(), ambiguous: false };
              setDraftLocked(false); setFailedSend(false); setPreview(false); setError('');
            }}>Preparar nova tentativa</button>}
            <button type="button" className={`${buttonClass} mt-3`} disabled={sending || failedSend || !draftText.trim() || !data?.integration.sendingConfigured} onClick={() => setPreview(true)}>Rever resposta</button>
            {preview && <div className="mt-4 rounded-lg border border-neutral-300 bg-neutral-50 p-4">
              <p className="text-sm font-medium">Para: {detail.contact.email}</p><p className="mt-3 whitespace-pre-wrap break-words text-sm">{draftText}</p>
              <p className="mt-3 text-xs text-neutral-500">Confirme o destinatário e a mensagem antes de enviar.</p>
              <button type="button" className={`${buttonClass} mt-3 bg-neutral-950 text-white hover:bg-neutral-800`} disabled={sending || failedSend || !data?.integration.sendingConfigured} onClick={sendReply}>{sending ? 'A enviar…' : 'Confirmar e enviar email'}</button>
            </div>}
            {notice && <p role="status" className="mt-3 text-sm text-emerald-800">{notice}</p>}
          </section>
        </> : <div className="py-20 text-center"><p className="font-medium">A sua caixa de contactos</p><p className="mt-2 text-sm text-neutral-500">Selecione um contacto para consultar compras e mensagens.</p>{selected && <button className={`${buttonClass} mt-4`} onClick={() => select(selected)}>Tentar novamente</button>}</div>}
      </section>
    </div>
  </div>;
}
