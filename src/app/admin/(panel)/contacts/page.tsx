import { loadContacts } from '@/app/admin/email-actions';
import { PageHeader } from '../../_components/ui';
import ContactWorkspace from './contact-workspace';

export const dynamic = 'force-dynamic';

export default async function ContactsPage() {
  const initial = await loadContacts();
  return <><PageHeader title="Contactos" description="Mensagens, compras e respostas num único espaço de trabalho." /><ContactWorkspace initial={initial} /></>;
}