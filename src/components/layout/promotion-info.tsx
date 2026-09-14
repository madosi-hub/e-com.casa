'use client';

import { Tag, Truck, ShieldCheck } from 'lucide-react';

export function PromotionInfo() {
  return (
    <aside aria-label="Delivery and shopping information" className="border-b border-olive/15 bg-[#f6f5ef]">
      <div className="container-ecom grid gap-1 py-2 text-xs md:grid-cols-3 md:gap-6">
        <details className="p-2">
          <summary className="cursor-pointer font-semibold"><Truck className="mr-2 inline h-4 w-4" />Portes grátis · Portugal e Espanha</summary>
          <p className="mt-2 leading-relaxed text-muted-foreground">Sem valor mínimo para Portugal e Espanha. Para os restantes destinos europeus disponíveis no checkout, os portes aplicáveis são confirmados antes do pagamento.</p>
        </details>
        <details className="p-2">
          <summary className="cursor-pointer font-semibold"><Tag className="mr-2 inline h-4 w-4" />Ofertas ativas</summary>
          <p className="mt-2 leading-relaxed text-muted-foreground">As campanhas publicadas têm condições e datas definidas. O preço final é sempre confirmado no carrinho e novamente no checkout.</p>
          <a href="/offers" className="mt-2 inline-block underline">Ver ofertas em curso</a>
        </details>
        <details className="p-2">
          <summary className="cursor-pointer font-semibold"><ShieldCheck className="mr-2 inline h-4 w-4" />Checkout seguro</summary>
          <p className="mt-2 leading-relaxed text-muted-foreground">Os métodos de pagamento disponíveis dependem do país de entrega e são apresentados no checkout seguro.</p>
        </details>
      </div>
    </aside>
  );
}
