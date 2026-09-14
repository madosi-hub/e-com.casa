'use client';

export default function OfferError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="container-ecom flex min-h-[55vh] flex-col items-center justify-center py-20 text-center">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-olive">E-com.casa</p>
      <h1 className="mt-4 font-display text-3xl font-medium">Não foi possível carregar esta oferta.</h1>
      <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">O catálogo ou a informação do mercado pode estar temporariamente indisponível. Tente novamente sem perder o seu carrinho.</p>
      <button type="button" onClick={reset} className="mt-6 h-11 rounded-lg bg-ink px-6 text-sm font-semibold text-cream">Tentar novamente</button>
    </div>
  );
}
