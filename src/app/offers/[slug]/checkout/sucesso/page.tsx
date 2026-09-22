import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import CheckoutSuccessPage from '@/app/checkout/success/page';
import { isPanelOfferSlug } from '@/lib/offers/route-policy';

export const metadata: Metadata = {
  title: 'Estado da encomenda',
  robots: { index: false, follow: false },
};

export default async function PanelOfferCheckoutSuccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ order?: string; token?: string }>;
}) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  if (!isPanelOfferSlug(slug)) notFound();

  return (
    <CheckoutSuccessPage
      searchParams={Promise.resolve({ ...query, offer: slug })}
    />
  );
}
