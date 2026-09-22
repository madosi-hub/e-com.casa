import { notFound } from 'next/navigation';
import PainelRipadoCheckout from '@/components/checkout/painel-ripado-checkout';
import { isPanelOfferSlug } from '@/lib/offers/route-policy';

export default async function PanelOfferCheckoutPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!isPanelOfferSlug(slug)) notFound();

  return <PainelRipadoCheckout offerSlug={slug} />;
}
