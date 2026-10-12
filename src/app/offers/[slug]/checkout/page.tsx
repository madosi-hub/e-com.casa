import { notFound } from 'next/navigation';
import PainelRipadoCheckout from '@/components/checkout/painel-ripado-checkout';
import { isFadoOfferSlug, isPanelOfferSlug } from '@/lib/offers/route-policy';

export default async function PanelOfferCheckoutPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!isPanelOfferSlug(slug) && !isFadoOfferSlug(slug)) notFound();

  return <PainelRipadoCheckout key={slug} offerSlug={slug} />;
}
