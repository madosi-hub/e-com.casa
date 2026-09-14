"use client";

import { useState } from "react";
import { LegalModal } from "./legal-modal";
import { LEGAL_PAGES, getLegalPage, type LegalPage } from "./legal-data";
import { COMPANY } from "@/lib/company";

const LEGAL_LINKS: { id: string; label: string }[] = [
  { id: "envio", label: "Envio" },
  { id: "privacidade", label: "Privacidade" },
  { id: "troca-devolucao", label: "Troca e devolução" },
  { id: "termos", label: "Termos de uso" },
  { id: "dados-empresa", label: "Dados da empresa" },
  { id: "contacto", label: "Contacto" },
];

export function Footer() {
  const [active, setActive] = useState<LegalPage | null>(null);
  const [open, setOpen] = useState(false);

  const showPage = (id: string) => {
    const page = getLegalPage(id);
    if (page) {
      setActive(page);
      setOpen(true);
    }
  };

  return (
    <footer
      id="footer"
      className="bg-[#17120f] px-4 py-10 text-center text-sm text-[#a39486]"
    >
      <div className="mx-auto grid max-w-6xl gap-8 text-left md:grid-cols-2 md:divide-x md:divide-white/10">
        <section className="md:pr-8" aria-label="Fabricante Nuralta">
          { }
          <img src="/pt/images/LOGO_BRANCA.webp" alt="Nuralta Interiores" className="h-auto w-[170px] object-contain" />
          <address className="mt-4 not-italic leading-6">
            <span className="block">Nuralta Interiores, Unipessoal Lda. · NIF 517 946 327</span>
            <span className="mt-1 block">Rua do Pinhal Novo, 84, Armazém 3 · 4470-640 Maia · Portugal</span>
            <span className="mt-1 block">
              <a href="mailto:suporte@nuraltainteriores.online" className="transition hover:text-[#f5ece2]">suporte@nuraltainteriores.online</a>{" · "}
              <a href="tel:+351913482761" className="transition hover:text-[#f5ece2]">+351 913 482 761</a>
            </span>
          </address>
        </section>
        <section className="md:pl-8" aria-label="Empresa mãe MGJ EXPERT">
          <p className="belmonte-serif text-3xl text-[#f5ece2]">MGJ EXPERT</p>
          <p className="mt-2 text-xs font-semibold uppercase tracking-[.14em] text-[#c79a68]">Impulsionada pela marca @E-Com.Casa</p>
          <address className="mt-4 not-italic leading-6">
            <span className="block">{COMPANY.legalName} · Company No. {COMPANY.companyNumber}</span>
            <span className="mt-1 block">{COMPANY.registeredOffice.line1}, {COMPANY.registeredOffice.line2} · {COMPANY.registeredOffice.city} {COMPANY.registeredOffice.postcode} · {COMPANY.registeredOffice.country}</span>
            <span className="mt-1 block">
              <a href={`mailto:${COMPANY.emails.institutional}`} className="transition hover:text-[#f5ece2]">{COMPANY.emails.institutional}</a>{" · "}
              <a href={`tel:${COMPANY.telephone.replace(/\s+/g, "")}`} className="transition hover:text-[#f5ece2]">{COMPANY.telephone}</a>
            </span>
          </address>
        </section>
      </div>

      <nav
        aria-label="Informação legal"
        className="mx-auto mt-6 flex max-w-3xl flex-wrap justify-center gap-x-5 gap-y-3"
      >
        {LEGAL_LINKS.map((l) => (
          <button
            key={l.id}
            type="button"
            onClick={() => showPage(l.id)}
            className="transition hover:text-[#f5ece2]"
          >
            {l.label}
          </button>
        ))}
        <a
          href="https://www.livroreclamacoes.pt/Inicio/"
          target="_blank"
          rel="noreferrer"
          className="transition hover:text-[#f5ece2]"
        >
          Livro de Reclamações
        </a>
        <a
          href="https://www.asae.gov.pt/perguntas-frequentes1/area-economica/resolucao-alternativa-de-litigios-de-consumo.aspx"
          target="_blank"
          rel="noreferrer"
          className="transition hover:text-[#f5ece2]"
        >
          Resolução de litígios
        </a>
      </nav>

      <p className="mx-auto mt-7 max-w-6xl border-t border-white/10 pt-6 text-xs">
        © 2026 Nuralta Interiores · E-Com.Casa. Todos os direitos reservados.
      </p>

      <LegalModal page={active} open={open} onOpenChange={setOpen} />
    </footer>
  );
}

export { LEGAL_PAGES };
