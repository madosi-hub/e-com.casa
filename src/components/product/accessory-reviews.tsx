import { useId } from 'react';
import { MessageSquareText } from 'lucide-react';

const ACCESSORY_ASSESSMENTS: Partial<Record<string, { title: string; body: string }>> = {
  'nuralta-cola-montagem-500g': {
    title: 'Prática para dar continuidade à montagem',
    body: 'Uma escolha útil quando já tem o aplicador e só precisa de repor a cola. A embalagem de 500 g permite comprar este consumível à parte; a quantidade necessária depende da superfície e da forma de aplicação.',
  },
  'nuralta-estilete-retratil': {
    title: 'Um apoio útil na preparação',
    body: 'Vale a pena ter à mão para abrir embalagens e fazer pequenos ajustes em materiais finos. A lâmina retrátil permite recolhê-la depois de usar. Para cortar os painéis de MDF, conte com uma ferramenta própria.',
  },
  'nuralta-aplicador-cola-reutilizavel': {
    title: 'Uma ferramenta para voltar a usar',
    body: 'Uma boa opção para quem pretende aplicar a cola com mais controlo e guardar a ferramenta para outros projetos. É especialmente útil se já tem cola em cartucho compatível e lhe falta apenas o aplicador.',
  },
  'nuralta-fita-led-rgb-3m': {
    title: 'Um toque de luz que muda o ambiente',
    body: 'Uma opção interessante para dar destaque ao painel e variar o ambiente ao longo do dia. O ajuste de cor e intensidade permite passar de uma luz discreta a um efeito mais expressivo, conforme a divisão e o momento.',
  },
  'nuralta-kit-instalacao-completo': {
    title: 'Prático para a primeira instalação',
    body: 'Faz sentido para quem vai começar e ainda não tem os acessórios de montagem. Reúne cola, aplicador, guia e x-ato num só conjunto, para preparar o trabalho com os principais acessórios à mão.',
  },
};

export function AccessoryReviews({ slug }: { slug: string }) {
  const headingId = useId();
  const assessment = Object.prototype.hasOwnProperty.call(ACCESSORY_ASSESSMENTS, slug) ? ACCESSORY_ASSESSMENTS[slug] : undefined;
  if (!assessment) return null;

  return <section aria-labelledby={headingId} className="border-t border-zinc-200 pt-4">
    <h3 id={headingId} className="text-sm font-semibold">A nossa opinião</h3>
    <div className="mt-3 flex items-start gap-3 rounded-lg border border-emerald-900/10 bg-emerald-50/50 p-4">
      <MessageSquareText className="mt-0.5 size-5 shrink-0 text-emerald-800" aria-hidden="true" />
      <div>
        <h4 className="text-sm font-semibold leading-6 text-zinc-800">{assessment.title}</h4>
        <p className="mt-1 text-sm leading-6 text-zinc-600">{assessment.body}</p>
      </div>
    </div>
  </section>;
}
