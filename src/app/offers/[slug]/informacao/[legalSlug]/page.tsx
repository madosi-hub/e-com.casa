import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  PainelLegalContent,
  getPainelLegalPage,
} from '@/components/offers/painel-ripado/legal-content';
import { isPanelOfferSlug } from '@/lib/offers/route-policy';

type InformationParams = Promise<{ slug: string; legalSlug: string }>;

export async function generateMetadata({ params }: { params: InformationParams }): Promise<Metadata> {
  const { slug, legalSlug } = await params;
  if (!isPanelOfferSlug(slug)) return {};
  const page = getPainelLegalPage(legalSlug);
  if (!page) return {};
  return {
    title: `${page.title} | Painel Ripado`,
    description: page.subtitle,
    robots: { index: false, follow: false },
  };
}

export default async function PanelOfferInformationPage({ params }: { params: InformationParams }) {
  const { slug, legalSlug } = await params;
  if (!isPanelOfferSlug(slug)) notFound();
  const page = getPainelLegalPage(legalSlug);
  if (!page) notFound();

  return <PainelLegalContent page={page} slug={legalSlug} offerSlug={slug} />;
}
