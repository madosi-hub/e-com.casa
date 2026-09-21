import type { Metadata } from 'next';
import CheckoutSuccessPage from '@/app/checkout/success/page';

export const metadata: Metadata = {
  title: 'Estado da encomenda',
  robots: { index: false, follow: false },
};

export default async function PainelRipadoCheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string; token?: string }>;
}) {
  const params = await searchParams;
  return (
    <CheckoutSuccessPage
      searchParams={Promise.resolve({ ...params, offer: 'painel-ripado' })}
    />
  );
}
