export function Inspiration() {
  return (
    <section id="inspiration" className="bg-[#efe7de]">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="belmonte-serif text-4xl">Espaços que ganharam outra vida.</h2>
        <p className="mt-2 text-sm text-[#7d6f64]">
          Projetos de clientes, em Portugal.
        </p>
        <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          { }
          <img
            id="inspiration-1"
            src="/pt/images/generated/real-space-living-wide.webp"
            alt="Aplicação realista do painel em ambiente interior"
            className="aspect-[3/4] w-full rounded-lg object-cover"
            loading="lazy"
          />
          { }
          <img
            id="inspiration-2"
            src="/pt/images/generated/real-space-panel-detail.webp"
            alt="Aplicação realista do painel em ambiente interior"
            className="aspect-[3/4] w-full rounded-lg object-cover"
            loading="lazy"
          />
        </div>
      </div>
    </section>
  );
}

