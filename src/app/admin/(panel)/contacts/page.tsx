import { db } from '@/lib/db';
import { EmptyState, PageHeader } from '../../_components/ui';

export const dynamic = 'force-dynamic';

export default async function ContactsPage() {
  const [messages, subscribers] = await Promise.all([
    db.contactMessage.findMany({ orderBy: { createdAt: 'desc' }, take: 200 }),
    db.newsletterSubscriber.count(),
  ]);

  return (
    <>
      <PageHeader title="Contacts" description={`${messages.length} recent messages · ${subscribers} newsletter subscribers.`} />
      {!messages.length ? <EmptyState>No contact messages yet.</EmptyState> : (
        <div className="space-y-4">
          {messages.map((message) => (
            <article key={message.id} className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div><h2 className="font-semibold">{message.subject}</h2><p className="mt-1 text-sm text-neutral-500">{message.name} · {message.email}{message.orderRef ? ` · ${message.orderRef}` : ''}</p></div>
                <time className="text-xs text-neutral-400">{message.createdAt.toLocaleString('en-GB')}</time>
              </div>
              <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-neutral-700">{message.message}</p>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
