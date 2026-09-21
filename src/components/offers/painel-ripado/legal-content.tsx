import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { LEGAL_PAGES, type LegalPage } from '@/components/offers/nuralta/legal-data';

const SOURCE_BY_SLUG: Record<string, string> = {
  envios: 'envio',
  'trocas-e-devolucoes': 'troca-devolucao',
  privacidade: 'privacidade',
  'termos-e-condicoes': 'termos',
  contacto: 'contacto',
  'dados-da-empresa': 'dados-empresa',
};

const FREE_RESOLUTION_PAGE: LegalPage = {
  id: 'livre-resolucao',
  title: 'Direito de livre resolução',
  subtitle: 'Como cancelar uma compra à distância no prazo legal',
  updated: 'Atualizado em setembro de 2026',
  blocks: [
    {
      kind: 'p',
      text: 'Nas compras celebradas à distância, dispõe de 14 dias corridos após a receção da encomenda para exercer o direito de livre resolução, sem necessidade de indicar um motivo, salvo as exceções previstas na lei.',
    },
    { kind: 'h3', text: 'Como exercer este direito' },
    {
      kind: 'ul',
      items: [
        'Envie uma declaração inequívoca para o nosso apoio, indicando o número da encomenda e a decisão de resolver o contrato.',
        'Após a comunicação, receberá as instruções e o endereço do centro logístico para a devolução.',
        'O artigo deve ser expedido no prazo de 14 dias após a comunicação da sua decisão.',
      ],
    },
    { kind: 'h3', text: 'Estado do artigo e custos de devolução' },
    {
      kind: 'p',
      text: 'O artigo deve ser devolvido no estado em que foi recebido, com a embalagem e os acessórios. Os custos diretos da devolução ficam a cargo do cliente, salvo quando exista defeito, dano ou erro no envio.',
    },
    { kind: 'h3', text: 'Reembolso' },
    {
      kind: 'p',
      text: 'O reembolso é efetuado pelo mesmo meio de pagamento utilizado na compra, sem custos adicionais, nos termos e prazos legalmente aplicáveis. Podemos aguardar pela receção dos bens ou pela apresentação de prova do envio antes de concluir o reembolso.',
    },
    {
      kind: 'external',
      label: 'Exercer o direito de livre resolução',
      href: 'mailto:suporte@e-com.casa?subject=Direito%20de%20livre%20resolu%C3%A7%C3%A3o',
    },
  ],
};

export const PAINEL_LEGAL_LINKS = [
  { slug: 'envios', label: 'Envios' },
  { slug: 'trocas-e-devolucoes', label: 'Trocas e devoluções' },
  { slug: 'livre-resolucao', label: 'Livre resolução' },
  { slug: 'privacidade', label: 'Privacidade' },
  { slug: 'termos-e-condicoes', label: 'Termos e condições' },
  { slug: 'contacto', label: 'Contacto' },
  { slug: 'dados-da-empresa', label: 'Dados da empresa' },
] as const;

export function getPainelLegalPage(slug: string): LegalPage | undefined {
  if (slug === 'livre-resolucao') return FREE_RESOLUTION_PAGE;
  const sourceId = SOURCE_BY_SLUG[slug];
  return sourceId ? LEGAL_PAGES.find((page) => page.id === sourceId) : undefined;
}

export function PainelLegalContent({ page, slug }: { page: LegalPage; slug: string }) {
  return (
    <div className="mx-auto w-full max-w-[1100px] px-4 py-8 sm:px-6 sm:py-12">
      <header className="border-b border-[#d9cfc4] pb-6 sm:pb-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7d6f64]">Informação da oferta Painel Ripado</p>
        <h1 className="font-display mt-2 text-[30px] font-medium text-[#201a17] sm:text-[38px]">{page.title}</h1>
        {page.subtitle && <p className="mt-2 max-w-2xl text-[14px] leading-6 text-[#6f6259]">{page.subtitle}</p>}
        {page.updated && <p className="mt-3 text-[11px] text-[#8b7e74]">{page.updated}</p>}
      </header>

      <div className="grid gap-8 py-7 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-12 lg:py-10">
        <nav aria-label="Páginas de informação" className="flex gap-2 overflow-x-auto pb-2 lg:sticky lg:top-5 lg:block lg:self-start lg:space-y-1 lg:overflow-visible lg:pb-0">
          {PAINEL_LEGAL_LINKS.map((item) => (
            <Link
              key={item.slug}
              href={`/offers/painel-ripado/informacao/${item.slug}`}
              aria-current={item.slug === slug ? 'page' : undefined}
              className={`block shrink-0 border-b-2 px-2 py-2 text-[12.5px] font-medium transition-colors lg:border-b-0 lg:border-l-2 lg:px-3 ${item.slug === slug ? 'border-[#201a17] text-[#201a17]' : 'border-transparent text-[#7d6f64] hover:text-[#201a17]'}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <article className="min-w-0 space-y-5 text-[14px] leading-7 text-[#5f554e]">
          {page.blocks.map((block, index) => {
            if (block.kind === 'h3') {
              return <h2 key={`${block.text}-${index}`} className="font-display pt-3 text-[21px] font-medium text-[#201a17]">{block.text}</h2>;
            }
            if (block.kind === 'ul') {
              return <ul key={index} className="list-disc space-y-2 pl-5 marker:text-[#8a5a2b]">{block.items.map((item) => <li key={item}>{item}</li>)}</ul>;
            }
            if (block.kind === 'address') {
              return <address key={index} className="border-l-2 border-[#c9b7a7] pl-4 not-italic">{block.lines.map((line) => <span key={line} className="block">{line}</span>)}</address>;
            }
            if (block.kind === 'external') {
              return <a key={block.href} href={block.href} target={block.href.startsWith('http') ? '_blank' : undefined} rel={block.href.startsWith('http') ? 'noreferrer' : undefined} className="inline-flex items-center gap-2 font-semibold text-[#201a17] underline decoration-[#b7a596] underline-offset-4"><ExternalLink className="h-4 w-4" />{block.label}</a>;
            }
            return <p key={index}>{block.text}</p>;
          })}
        </article>
      </div>
    </div>
  );
}
