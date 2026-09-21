import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  PAINEL_LEGAL_LINKS,
  PainelLegalContent,
  getPainelLegalPage,
} from '@/components/offers/painel-ripado/legal-content';

export const dynamicParams = false;

export function generateStaticParams() {
  return PAINEL_LEGAL_LINKS.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const page = getPainelLegalPage(slug);
  if (!page) return {};
  return {
    title: `${page.title} | Painel Ripado`,
    description: page.subtitle,
    robots: { index: false, follow: false },
  };
}

export default async function PainelRipadoInformationPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = getPainelLegalPage(slug);
  if (!page) notFound();
  return <PainelLegalContent page={page} slug={slug} />;
}
