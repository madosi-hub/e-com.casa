"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { DETAILS } from "./data";

export function ProductDetails() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section id="product-details" className="bg-[#201a17] text-[#e9dfd5]">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="belmonte-details-layout">
          <div>
            <p className="mb-3 text-[11px] uppercase tracking-[.18em] text-[#c79a68]">
              Conheça o seu painel
            </p>
            <h2
              id="product-details-title"
              className="belmonte-serif text-4xl text-[#f7f0e8]"
            >
              Cada detalhe,
              <br />
              ao seu ritmo.
            </h2>
            <p className="mt-5 text-sm leading-relaxed text-[#b7a696]">
              Das medidas à instalação, escolha o que pretende saber.
            </p>
          </div>

          <div>
            {DETAILS.map((d, i) => {
              const isOpen = open === i;
              return (
                <div key={d.number} className="belmonte-detail">
                  <button
                    type="button"
                    className="belmonte-detail-toggle"
                    aria-expanded={isOpen}
                    onClick={() => setOpen(isOpen ? null : i)}
                  >
                    <span className="text-xs text-[#c79a68]">{d.number}</span>
                    <span className="flex-1">
                      <span className="block text-base font-semibold text-[#f7f0e8]">
                        {d.title}
                      </span>
                      <span className="block text-xs text-[#b7a696]">
                        {d.subtitle}
                      </span>
                    </span>
                    <span
                      className="belmonte-detail-symbol"
                      style={{
                        background: isOpen ? "#c79a68" : undefined,
                        color: isOpen ? "#201a17" : undefined,
                        transform: isOpen ? "rotate(45deg)" : undefined,
                      }}
                    >
                      <Plus className="h-4 w-4" />
                    </span>
                  </button>
                  {isOpen && (
                    <dl className="pb-2">
                      {d.rows.map((row, ri) => (
                        <div key={ri} className="belmonte-detail-row">
                          <dt>{row.dt}</dt>
                          <dd>{row.dd}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

