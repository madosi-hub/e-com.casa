'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { RefreshCcw } from 'lucide-react';
import { NURALTA_OFFER_ALIAS, panelOfferPath, panelOfferSlugFromPathname } from '@/lib/offers/route-policy';

export default function PainelRipadoCheckoutError({ reset }: { reset: () => void }) {
  const pathname = usePathname();
  const offerSlug = panelOfferSlugFromPathname(pathname) ?? NURALTA_OFFER_ALIAS;
  return (
    <div className="mx-auto flex min-h-[55vh] max-w-lg flex-col items-center justify-center px-5 py-16 text-center">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8a5a2b]">Não foi possível carregar</p>
      <h1 className="font-display mt-3 text-[30px] font-medium text-[#201a17]">Ocorreu um erro inesperado.</h1>
      <p className="mt-3 text-[14px] leading-relaxed text-[#74685f]">
        O seu carrinho está guardado. Tente novamente ou regresse ao carrinho da oferta.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button type="button" onClick={reset} className="inline-flex h-11 items-center gap-2 rounded-md bg-[#201a17] px-5 text-[13px] font-semibold text-white">
          <RefreshCcw className="h-4 w-4" aria-hidden />
          Tentar novamente
        </button>
        <Link href={`${panelOfferPath(offerSlug)}?carrinho=aberto`} className="inline-flex h-11 items-center rounded-md border border-[#201a17] px-5 text-[13px] font-semibold text-[#201a17]">
          Voltar ao carrinho
        </Link>
      </div>
    </div>
  );
}
