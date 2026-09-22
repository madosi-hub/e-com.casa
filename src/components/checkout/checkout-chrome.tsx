'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { ArrowLeft, Lock } from 'lucide-react';
import { useEffect } from 'react';
import {
  NURALTA_OFFER_ALIAS,
  panelOfferPath,
  panelOfferSlugFromPathname,
} from '@/lib/offers/route-policy';

const TICKER_ITEMS = [
  'Envio gratuito para Portugal Continental',
  'Pagamento seguro com Cartão, Apple Pay, MB WAY e Multibanco',
  'Entrega em 8 a 12 dias úteis devido à elevada procura',
];

export function CheckoutHeader() {
  const pathname = usePathname();
  const offerSlug = panelOfferSlugFromPathname(pathname) ?? NURALTA_OFFER_ALIAS;
  const offerPath = panelOfferPath(offerSlug);
  const legalPage = pathname.startsWith(panelOfferPath(offerSlug, '/informacao/'));

  useEffect(() => {
    document.documentElement.lang = 'pt-PT';
  }, []);

  return (
    <>
      <style jsx global>{`
        @keyframes ecomCheckoutTicker { to { transform: translateX(-50%); } }
        .ecom-checkout-ticker { animation: ecomCheckoutTicker 24s linear infinite; }
        @media (prefers-reduced-motion: reduce) { .ecom-checkout-ticker { animation: none; } }
      `}</style>
      <div className="overflow-hidden bg-[#201a17] py-1.5 text-[#e9dfd5]">
        <div className="ecom-checkout-ticker flex w-max text-[9px] uppercase tracking-[0.12em] sm:text-[10px]">
          {[0, 1].map((group) => (
            <div key={group} className="flex shrink-0 items-center gap-6 px-3 sm:gap-8 sm:px-4" aria-hidden={group === 1}>
              {TICKER_ITEMS.map((item) => (
                <span key={item} className="flex items-center gap-6 whitespace-nowrap sm:gap-8">
                  <span>{item}</span>
                  <span className="opacity-40">◆</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      <header className="border-b border-[#e6ded4] bg-[#f7f3ef]/95 backdrop-blur">
        <div className="mx-auto grid h-12 w-full max-w-[1180px] grid-cols-[1fr_auto_1fr] items-center px-4 sm:h-14 sm:px-6">
          <Link href={legalPage ? offerPath : `${offerPath}?carrinho=aberto`} className="flex w-fit items-center gap-1.5 text-[12px] font-medium text-[#6f6259] transition-colors hover:text-[#201a17]">
            <ArrowLeft className="h-4 w-4" aria-hidden />
            <span className="hidden sm:inline">{legalPage ? 'Voltar à oferta' : 'Voltar ao carrinho'}</span>
            <span className="sm:hidden">Voltar</span>
          </Link>

          <span className="flex h-10 w-[176px] items-center justify-center overflow-hidden">
            <Image
              src="/images/logo-e-com-casa-preto.png"
              alt="E-com.casa"
              width={204}
              height={68}
              className="h-[68px] w-[204px] max-w-none shrink-0"
            />
          </span>

          <span className="ml-auto flex items-center gap-1.5 text-[11px] font-medium text-[#6f6259]">
            <Lock className="h-3.5 w-3.5" aria-hidden />
            <span className="hidden sm:inline">Pagamento seguro</span>
          </span>
        </div>
      </header>
    </>
  );
}

export function CheckoutFooter() {
  const pathname = usePathname();
  const offerSlug = panelOfferSlugFromPathname(pathname) ?? NURALTA_OFFER_ALIAS;
  const informationPath = (slug: string) => panelOfferPath(offerSlug, `/informacao/${slug}`);

  return (
    <footer className="border-t border-[#e6ded4] bg-[#f7f3ef] px-4 py-5 text-center text-[11px] text-[#74685f]">
      <nav aria-label="Informação legal" className="flex flex-wrap justify-center gap-x-5 gap-y-2">
        <Link href={informationPath('termos-e-condicoes')}>Termos e Condições</Link>
        <Link href={informationPath('privacidade')}>Privacidade</Link>
        <Link href={informationPath('trocas-e-devolucoes')}>Trocas e devoluções</Link>
        <Link href={informationPath('contacto')}>Contacto</Link>
      </nav>
      <p className="mt-2">Pagamento seguro. IVA incluído nos preços.</p>
    </footer>
  );
}
