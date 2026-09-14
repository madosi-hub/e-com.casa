"use client";

import { useState } from "react";
import {
  ShieldCheck,
  PackageCheck,
  BadgeCheck,
  ChevronDown,
} from "lucide-react";
import { FAQS } from "./data";

const TRUST = [
  { icon: ShieldCheck, label: "Pagamento protegido" },
  { icon: PackageCheck, label: "Entrega acompanhada" },
  { icon: BadgeCheck, label: "Apoio após a compra" },
];

export function Faq() {
  const [open, setOpen] = useState<number>(0);

  return (
    <section id="faq" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
      <div className="grid gap-10 lg:grid-cols-[0.78fr_1.22fr]">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <p className="mb-3 text-[11px] uppercase tracking-[.18em] text-[#8a5a2b]">
            Comprar sem dúvidas
          </p>
          <h2 className="belmonte-serif text-4xl leading-tight sm:text-5xl">
            Antes de decidir, tenha todas as respostas.
          </h2>
          <p className="mt-5 max-w-md leading-relaxed text-[#5c5049]">
            Reunimos o essencial sobre medidas, instalação, acústica, entrega e
            pós-venda para que escolha com confiança.
          </p>
          <div className="mt-7 grid gap-3 text-sm text-[#4d423a] sm:grid-cols-3 lg:grid-cols-1">
            {TRUST.map((t) => (
              <div
                key={t.label}
                className="flex items-center gap-3 rounded-xl bg-[#efe7de] px-4 py-3"
              >
                <t.icon className="h-5 w-5 text-[#8a5a2b]" />
                {t.label}
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {FAQS.map((f, i) => {
            const isOpen = open === i;
            return (
              <article
                key={f.number}
                className={`overflow-hidden rounded-2xl border transition ${
                  isOpen
                    ? "border-[#c9aa86] bg-[#fdfbf9] shadow-sm"
                    : "border-[#e0d6cb] bg-transparent"
                }`}
              >
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-5 px-5 py-5 text-left font-semibold sm:px-6"
                  aria-expanded={isOpen}
                  onClick={() => setOpen(isOpen ? -1 : i)}
                >
                  <span className="flex items-baseline gap-4">
                    <small className="text-[#a89a8d]">{f.number}</small>
                    <span className="text-[#201a17]">{f.question}</span>
                  </span>
                  <span
                    className={`grid h-8 w-8 shrink-0 place-items-center rounded-full transition ${
                      isOpen
                        ? "bg-[#8a5a2b] text-white"
                        : "bg-[#eae1d8] text-[#8a5a2b]"
                    }`}
                  >
                    <ChevronDown
                      className={`h-4 w-4 transition-transform duration-200 ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </span>
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 text-sm leading-relaxed text-[#5c5049] sm:px-6">
                    {f.answer}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

