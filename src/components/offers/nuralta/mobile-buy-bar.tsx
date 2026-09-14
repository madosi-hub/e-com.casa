export function MobileBuyBar() {
  const priceLabel = "Desde 5,00\u00a0€";
  const name = "Painel Ripado Decorativo";
  return (
    <div className="belmonte-mobile-buy-bar fixed inset-x-0 bottom-0 z-30 items-center justify-between gap-3 bg-[#f7f3ef] px-4 pt-3">
      <div className="min-w-0">
        <p className="belmonte-serif text-2xl leading-none">{priceLabel}</p>
        <p className="truncate text-[11px] text-[#7d6f64]">{name}</p>
      </div>
      <a
        href="#configurar-painel"
        className="shrink-0 rounded-full bg-[#201a17] px-6 py-3 text-sm font-semibold text-[#f7f3ef] transition hover:bg-[#8a5a2b]"
      >
        Comprar agora
      </a>
    </div>
  );
}
