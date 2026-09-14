import Link from 'next/link';
import { COMPANY } from '@/lib/company';

export function OfferCompactFooter() {
  const office = COMPANY.registeredOffice;
  return (
    <footer className="border-t border-[#d8d3ca] bg-[#f4f0e8] px-4 py-10 text-[#504b44] sm:px-6 sm:py-12">
      <div className="mx-auto max-w-[1080px]">
        <div className="grid gap-7 md:grid-cols-[1fr_auto] md:items-start md:gap-10">
          <div>
            <p className="font-display text-[22px] font-semibold tracking-[-0.02em] text-[#292824]">E-com<span className="text-[#667057]">.</span>casa</p>
            <p className="mt-3 max-w-2xl text-[11px] leading-5 text-[#716b62]">
              {COMPANY.legalName} · Company No. {COMPANY.companyNumber}<br />
              {office.line1}, {office.line2} · {office.city} {office.postcode} · {office.country}<br />
              {COMPANY.emails.support} · {COMPANY.telephone}
            </p>
          </div>
          <nav className="flex flex-wrap gap-x-5 gap-y-2 text-[10.5px] font-medium md:max-w-[360px] md:justify-end" aria-label="Offer legal links">
            <Link href="/shipping" className="hover:text-[#292824]">Envio</Link>
            <Link href="/legal/privacy" className="hover:text-[#292824]">Privacidade</Link>
            <Link href="/returns" className="hover:text-[#292824]">Trocas e devolução</Link>
            <Link href="/legal/terms" className="hover:text-[#292824]">Termos de uso</Link>
            <Link href="/contact" className="hover:text-[#292824]">Contacto</Link>
          </nav>
        </div>
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-[#d8d3ca] pt-5 text-[9.5px] text-[#878077]">
          <span>© {new Date().getFullYear()} E-com.casa. All rights reserved.</span>
          <span>A trading brand operated by {COMPANY.legalName}.</span>
        </div>
      </div>
    </footer>
  );
}
