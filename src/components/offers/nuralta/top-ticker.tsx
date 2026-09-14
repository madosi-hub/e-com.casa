"use client";

import { TICKER_ITEMS } from "./data";

export function TopTicker() {
  const group = (
    <div className="flex shrink-0 items-center gap-6 sm:gap-8 px-3 sm:px-4">
      {TICKER_ITEMS.map((item, i) => (
        <span key={i} className="flex items-center gap-6 sm:gap-8 whitespace-nowrap">
          <span>{item}</span>
          <span className="opacity-40">◆</span>
        </span>
      ))}
    </div>
  );

  return (
    <div
      id="top-benefits"
      className="overflow-hidden bg-[#201a17] py-1 text-[#e9dfd5] sm:py-2"
    >
      <div className="flex w-max belmonte-ticker text-[9px] uppercase tracking-[.12em] sm:text-[11px]">
        {group}
        {group}
      </div>
    </div>
  );
}

