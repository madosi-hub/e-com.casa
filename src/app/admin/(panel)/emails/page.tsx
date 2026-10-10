import { loadEmailActivity } from '@/app/admin/email-actions';
import { PageHeader } from '../../_components/ui';
import EmailActivity from './email-activity';

export const dynamic = 'force-dynamic';

export default async function EmailsPage() {
  const initial = await loadEmailActivity();
  return <><PageHeader title="Atividade de emails" description="Consulte mensagens recebidas, envios e os estados de entrega registados." /><EmailActivity initial={initial} /></>;
}
