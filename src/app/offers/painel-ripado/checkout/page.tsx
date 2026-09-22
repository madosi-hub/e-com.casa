import PainelRipadoCheckout from '@/components/checkout/painel-ripado-checkout';
import { NURALTA_OFFER_ALIAS } from '@/lib/offers/route-policy';

export default function PainelRipadoCheckoutPage() {
  return <PainelRipadoCheckout offerSlug={NURALTA_OFFER_ALIAS} />;
}
