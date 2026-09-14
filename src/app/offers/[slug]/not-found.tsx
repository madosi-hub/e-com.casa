import Link from 'next/link';

export default function OfferNotFound() {
  return (
    <div className="container-ecom flex min-h-[55vh] flex-col items-center justify-center py-20 text-center">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-olive">E-com.casa</p>
      <h1 className="mt-4 font-display text-3xl font-medium">Esta oferta não está disponível.</h1>
      <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">Pode continuar a explorar o catálogo E-com.casa e os produtos disponíveis para o seu mercado.</p>
      <Link href="/shop" className="mt-6 inline-flex h-11 items-center rounded-lg bg-ink px-6 text-sm font-semibold text-cream">Ver catálogo</Link>
    </div>
  );
}
