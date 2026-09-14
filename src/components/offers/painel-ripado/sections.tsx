'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import { ArrowRight, BadgeCheck, ChevronDown, ChevronRight, Factory, Headphones, PackageCheck, Play, Plus, ShieldCheck, Truck, X } from 'lucide-react';
import type { CatalogProduct } from '@/lib/catalog/types';
import type { OfferConfig, OfferMarketContext } from '@/lib/offers/types';
import { PaymentBrandStrip } from '@/components/payments/payment-brand-strip';
import { COMPANY } from '@/lib/company';
import { PANEL_ASSET_ROOT } from './data';

function Stars({ value = 5, size = 13 }: { value?: number; size?: number }) {
  return <span className="inline-flex gap-0.5">{[1,2,3,4,5].map((star) => <span key={star} style={{ color: '#f2b01e', fontSize: size }}>{star <= Math.round(value) ? '★' : '☆'}</span>)}</span>;
}

export function PanelCampaignStory({ product }: { product: CatalogProduct }) {
  const gallery = [...new Set([product.image, ...product.gallery.split(',').filter(Boolean)])];
  const video = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const toggle = () => {
    const element = video.current;
    if (!element) return;
    if (element.paused) element.play().then(() => setPlaying(true)).catch(() => undefined);
    else { element.pause(); setPlaying(false); }
  };

  return <>
    <section id="preco-fabrica" className="bg-[#201a17] px-4 py-14 text-[#f7f3ef] sm:px-6 sm:py-20">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="max-w-2xl">
          <p className="mb-5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.14em] text-[#c79a68]"><Factory className="h-4 w-4" />{product.manufacturer} · fabrico direto</p>
          <h2 className="font-display text-4xl font-normal leading-[1.08] sm:text-6xl">Do fabricante.<span className="block text-[#d4aa7b]">Para a sua casa.</span></h2>
          <p className="mt-5 text-[15px] leading-7 text-[#cbbbaf]"><strong className="text-white">Um produto real, ligado ao catálogo do fabricante.</strong> Cor, medida, inspiração, carrinho e checkout reunidos num único percurso de compra.</p>
          <div className="relative mt-5 aspect-video max-w-[520px] overflow-hidden rounded-[22px] bg-[#15110f]">
            <video ref={video} src={`${PANEL_ASSET_ROOT}/videos/nuralta-hist.mp4`} poster={`${PANEL_ASSET_ROOT}/videos/nuralta-hist-poster.webp`} loop playsInline preload="metadata" className="h-full w-full object-cover" onClick={toggle} />
            <button type="button" onClick={toggle} aria-label={playing ? 'Pausar vídeo' : 'Reproduzir vídeo'} className="absolute left-1/2 top-1/2 grid h-12 w-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-white/40 bg-[#201a17]/70 text-white"><Play className="h-5 w-5" fill="currentColor" /></button>
          </div>
          <p className="mt-2 max-w-[520px] text-[10px] leading-4 text-[#9f8f82]">Vídeo histórico do conceito Nuralta usado como referência visual do funil. O produto comercializado nesta página é o produto {product.name}, fabricado por {product.manufacturer}.</p>
          <p className="mt-5 text-[15px] leading-7 text-[#f7f3ef]">O preço e as opções apresentados correspondem ao catálogo {product.brand ?? product.manufacturer}. Quando existir uma promoção, o prazo e as condições são indicados junto ao preço.</p>
        </div>
        <a href="#configurar-painel" className="inline-flex min-h-12 items-center gap-3 rounded-full bg-[#c79a68] px-5 text-sm font-bold text-[#201a17]">Escolher cor e tamanho<ArrowRight className="h-4 w-4" /></a>
      </div>
    </section>

    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
        <div><p className="mb-3 text-[11px] uppercase tracking-[.18em] text-[#8a5a2b]">Textura, ritmo, calor</p><h2 className="font-display text-4xl leading-tight">Um detalhe que muda a forma de sentir o espaço.</h2><p className="mt-5 leading-relaxed text-[#5c5049]">{product.description}</p><ul className="mt-6 space-y-2 text-sm text-[#3d342e]"><li>Transforma o ambiente rapidamente</li><li>Ritmo visual moderno e acolhedor</li><li>Instalação simples e acabamento elegante</li><li>Manutenção fácil no dia a dia</li></ul></div>
        <div className="relative aspect-[4/5] overflow-hidden rounded-lg"><img src={gallery[1] ?? product.image} alt={`${product.name} — ambiente e acabamento`} className="h-full w-full object-cover" /></div>
      </div>
    </section>
  </>;
}

function panelArea(dimensions: string | null): string {
  const match = dimensions?.match(/(\d+(?:[.,]\d+)?)\s*[x×]\s*(\d+(?:[.,]\d+)?)/i);
  if (!match || !dimensions || !/mm|cm/i.test(dimensions)) return 'Confirmar na opção selecionada';
  const divisor = /mm/i.test(dimensions) ? 1_000_000 : 10_000;
  const area = Number(match[1].replace(',','.')) * Number(match[2].replace(',','.')) / divisor;
  return `${area.toFixed(2).replace('.',',')} m² (${dimensions})`;
}

export function PanelProductDetails({ product }: { product: CatalogProduct }) {
  const [open, setOpen] = useState<number | null>(null);
  const groups = [
    { number:'01', title:'Medidas e cobertura', subtitle:'Dimensões, área e peso', rows:[['Dimensões',product.dimensions || 'Consultar ficha do produto'],['Área por painel',panelArea(product.dimensions)],['Espessura / formato',product.dimensions || 'Consultar ficha do produto'],['Peso',product.weight || 'Varia consoante a medida']] },
    { number:'02', title:'Materiais e acabamento', subtitle:'Composição e presença visual', rows:[['Material',product.materials || 'Consultar ficha do produto'],['Acabamento',product.color || 'Conforme a opção escolhida'],['Aplicação','Paredes interiores']] },
    { number:'03', title:'Instalação e acessórios', subtitle:'O que recebe e como aplicar', rows:[['Conteúdo','1 painel por unidade'],['Fixação','Método adequado à parede e ao material'],['Superfícies','Sólidas, limpas, secas e niveladas']] },
    { number:'04', title:'Cuidados e pós-venda', subtitle:'Utilização, entrega e devoluções', rows:[['Cuidados',product.care || 'Limpar com pano macio'],['Entrega','Prazo e transportadora confirmados no checkout'],['Devolução','Aplicam-se as condições E-com.casa e direitos legais do consumidor']] },
  ];
  return <section id="product-details" className="bg-[#201a17] px-4 py-16 text-[#f7f3ef] sm:px-6"><div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[.85fr_1.15fr] lg:gap-20"><div><p className="text-[11px] uppercase tracking-[.18em] text-[#c79a68]">Conheça o seu painel</p><h2 className="mt-4 font-display text-4xl leading-tight">Cada detalhe,<br />ao seu ritmo.</h2><p className="mt-5 text-sm leading-6 text-[#b7a696]">Das medidas à instalação, escolha o que pretende saber.</p></div><div>{groups.map((group,index) => <div key={group.number} className="border-b border-white/15"><button type="button" aria-expanded={open === index} onClick={() => setOpen(open === index ? null : index)} className="flex w-full items-center gap-4 py-5 text-left"><span className="w-8 text-xs text-[#c79a68]">{group.number}</span><span className="flex-1"><strong className="block text-base">{group.title}</strong><span className="text-xs text-[#b7a696]">{group.subtitle}</span></span><span className={`grid h-8 w-8 place-items-center rounded-full border border-white/15 transition ${open === index ? 'rotate-45 bg-[#c79a68] text-[#201a17]' : ''}`}><Plus className="h-4 w-4" /></span></button>{open === index && <dl className="pb-5">{group.rows.map(([term,value]) => <div key={term} className="grid gap-1 border-t border-white/10 py-3 text-sm sm:grid-cols-[145px_1fr]"><dt className="text-[#b7a696]">{term}</dt><dd>{value}</dd></div>)}</dl>}</div>)}</div></div></section>;
}

export function PanelInspiration({ product }: { product: CatalogProduct }) {
  const images = [...new Set([product.image, ...product.gallery.split(',').filter(Boolean)])].slice(0,4);
  return <section id="inspiration" className="bg-[#efe7de]"><div className="mx-auto max-w-6xl px-4 py-16 sm:px-6"><h2 className="font-display text-4xl">Espaços que ganharam outra vida.</h2><p className="mt-2 text-sm text-[#7d6f64]">Ambientes e detalhes de referência do produto {product.brand ?? product.manufacturer}.</p><div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{images.map((image) => <div key={image} className="aspect-[3/4] overflow-hidden rounded-lg bg-[#e5dbd0]"><img src={image} alt={`${product.name} — ambiente de referência`} className="h-full w-full object-cover" loading="lazy" /></div>)}</div></div></section>;
}

export function PanelReviews({ offer, product }: { offer: OfferConfig; product: CatalogProduct }) {
  const [filter, setFilter] = useState<'all'|'photos'>('all');
  const [lightbox, setLightbox] = useState<string | null>(null);
  const reviews = offer.reviews.mode === 'verified' ? (offer.reviews.reviews ?? []).filter(r => r.verified) : [];
  const photos = reviews.flatMap(r => r.image ? [r.image] : []);
  const visible = filter === 'photos' ? reviews.filter(r => r.image) : reviews;
  const rating = reviews.length ? reviews.reduce((sum,r) => sum+r.rating,0)/reviews.length : 0;
  const catalogueImages = [...new Set([product.image, ...product.gallery.split(',').filter(Boolean)])];
  return <section id="avaliacoes" className="border-y border-[#e6ded4] bg-[#fdfbf9] py-10" style={{ scrollMarginTop:72 }}>
    <div className="mx-auto max-w-4xl px-4 sm:px-6">
      <div className="flex items-center justify-between gap-4"><h2 className="text-base font-bold sm:text-lg">Galeria visual do produto</h2><a href="#lista-avaliacoes" className="inline-flex items-center text-xs text-[#83766d]">Ver avaliações ({reviews.length}) <ChevronRight className="h-3 w-3" /></a></div>
      <div className="mt-3 flex gap-2 overflow-x-auto pb-2">{catalogueImages.map((src,index) => <button key={`${src}-${index}`} type="button" onClick={() => setLightbox(src)} className="h-24 w-20 shrink-0 overflow-hidden rounded-lg bg-[#ece5dd] transition hover:scale-105 sm:h-28 sm:w-24"><img src={src} alt={`${product.name} — imagem de catálogo ${index+1}`} className="h-full w-full object-cover" loading="lazy" /></button>)}</div>
      {photos.length > 0 && <div className="mt-3 flex gap-2 overflow-x-auto pb-2">{photos.map((src,index) => <button key={`${src}-${index}`} type="button" onClick={() => setLightbox(src)} className="h-24 w-20 shrink-0 overflow-hidden rounded-lg bg-[#ece5dd] transition hover:scale-105 sm:h-28 sm:w-24"><img src={src} alt={`Imagem de avaliação ${index+1}`} className="h-full w-full object-cover" loading="lazy" /></button>)}</div>}
      <div id="lista-avaliacoes" className="mt-5 border-t border-[#e6ded4] pt-5"><div className="flex items-center justify-between gap-3"><h3 className="text-lg font-bold">Avaliações</h3><span className="text-[11px] font-semibold text-[#4d7d44]">Compras verificadas</span></div>
        {reviews.length > 0 ? <>
          <div className="mt-3 flex items-start gap-3"><strong className="text-3xl leading-none">{rating.toFixed(1).replace('.',',')}</strong><div><Stars value={rating} size={16} /><span className="block text-xs text-[#83766d]">{reviews.length} avaliações</span></div></div>
          <div className="mt-4 flex gap-2 text-[11px]"><button type="button" onClick={() => setFilter('all')} className={`rounded-md px-3 py-2 ${filter === 'all' ? 'bg-[#201a17] text-white' : 'bg-[#f0f2f3]'}`}>todas ({reviews.length})</button><button type="button" onClick={() => setFilter('photos')} className={`rounded-md px-3 py-2 ${filter === 'photos' ? 'bg-[#201a17] text-white' : 'bg-[#f0f2f3]'}`}>com fotos ({photos.length})</button></div>
          <div className="mt-2 divide-y divide-[#ece5dd]">{visible.map((review,index) => <article key={`${review.author}-${index}`} className="py-5"><div className="flex flex-wrap items-center gap-x-3 gap-y-1.5"><Stars value={review.rating} /><strong className="text-xs">{review.author}</strong><span className="text-[10px] text-[#8d7f73]">{review.location} · {review.date}</span></div><p className="mt-2 text-xs leading-5 text-[#62574f]">{review.body}</p>{review.image && <button type="button" onClick={() => setLightbox(review.image!)} className="mt-3 h-24 w-24 overflow-hidden rounded-lg"><img src={review.image} alt={`Foto de ${review.author}`} className="h-full w-full object-cover" /></button>}</article>)}</div>
          <div className="mt-2 flex items-center justify-between border-t border-[#e6ded4] pt-5"><span className="text-xs text-[#83766d]">A mostrar {reviews.length} avaliações verificadas</span></div>
        </> : <div className="mt-4 rounded-xl border border-[#e6ded4] bg-[#f7f3ef] p-4"><p className="inline-flex items-center gap-2 text-sm font-semibold"><BadgeCheck className="h-4 w-4 text-[#597057]" />Ainda não existem avaliações verificadas deste produto.</p><p className="mt-1 text-xs leading-5 text-[#7d6f64]">A estrutura do funil foi preservada, mas não apresentamos nomes, classificações ou testemunhos de outro produto como se fossem deste SKU.</p></div>}
        <Link href={`/product/${product.slug}#reviews`} className="mt-5 inline-block text-xs underline underline-offset-4">Consultar avaliações e partilhar a sua experiência</Link>
      </div>
    </div>
    {lightbox && <div className="fixed inset-0 z-[90] grid place-items-center bg-black/80 p-5" onClick={() => setLightbox(null)}><button type="button" aria-label="Fechar" className="absolute right-5 top-5 text-white"><X /></button><img src={lightbox} alt="Avaliação ampliada" className="max-h-[85vh] max-w-[92vw] rounded-lg object-contain" /></div>}
  </section>;
}

export function PanelFaq({ offer }: { offer: OfferConfig }) {
  const [open,setOpen] = useState(0);
  const trust = [{ icon:ShieldCheck,label:'Pagamento protegido'},{icon:PackageCheck,label:'Entrega acompanhada'},{icon:Headphones,label:'Apoio após a compra'}];
  return <section id="faq" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20"><div className="grid gap-10 lg:grid-cols-[.78fr_1.22fr]"><div className="lg:sticky lg:top-28 lg:self-start"><p className="mb-3 text-[11px] uppercase tracking-[.18em] text-[#8a5a2b]">Comprar sem dúvidas</p><h2 className="font-display text-4xl leading-tight sm:text-5xl">Antes de decidir, tenha todas as respostas.</h2><p className="mt-5 max-w-md leading-7 text-[#5c5049]">Reunimos o essencial sobre medidas, instalação, acústica, entrega e pós-venda para que escolha com confiança.</p><div className="mt-7 grid gap-3 text-sm text-[#4d423a] sm:grid-cols-3 lg:grid-cols-1">{trust.map(({icon:Icon,label}) => <div key={label} className="flex items-center gap-3 rounded-xl bg-[#efe7de] px-4 py-3"><Icon className="h-5 w-5 text-[#8a5a2b]" />{label}</div>)}</div></div><div className="space-y-3">{offer.faqs.map((item,index) => <article key={item.question} className={`overflow-hidden rounded-2xl border transition ${open === index ? 'border-[#c9aa86] bg-[#fdfbf9] shadow-sm' : 'border-[#e0d6cb]'}`}><button type="button" aria-expanded={open === index} onClick={() => setOpen(open === index ? -1 : index)} className="flex w-full items-center gap-4 px-5 py-5 text-left sm:px-6"><span className="w-7 text-xs font-bold text-[#a89a8d]">{String(index+1).padStart(2,'0')}</span><strong className="flex-1 text-sm">{item.question}</strong><span className={`grid h-8 w-8 place-items-center rounded-full transition ${open === index ? 'bg-[#8a5a2b] text-white' : 'bg-[#eae1d8] text-[#8a5a2b]'}`}><ChevronDown className={`h-4 w-4 transition ${open === index ? 'rotate-180' : ''}`} /></span></button>{open === index && <p className="px-5 pb-5 pl-16 text-sm leading-6 text-[#62574f] sm:px-6 sm:pl-[76px]">{item.answer}</p>}</article>)}</div></div></section>;
}

export function PanelFooter({ market }: { market: OfferMarketContext }) {
  return <footer id="footer" className="bg-[#17120f] px-4 py-10 text-center text-sm text-[#a39486] sm:px-6"><div className="mx-auto max-w-4xl"><strong className="font-display text-3xl text-[#f5ece2]">E-com.casa</strong><p className="mt-2 text-xs">Make Your Space Yours.</p><address className="mt-4 not-italic leading-6"><span className="block">{COMPANY.legalName} · Company No. {COMPANY.companyNumber}</span><span className="block">{COMPANY.registeredOffice.line1}, {COMPANY.registeredOffice.line2} · {COMPANY.registeredOffice.city} {COMPANY.registeredOffice.postcode} · {COMPANY.registeredOffice.country}</span><span className="block"><a href={`mailto:${COMPANY.emails.support}`} className="hover:text-[#f5ece2]">{COMPANY.emails.support}</a> · <a href={`tel:${COMPANY.telephone.replace(/\s+/g,'')}`} className="hover:text-[#f5ece2]">{COMPANY.telephone}</a></span></address><nav aria-label="Informação legal" className="mt-6 flex flex-wrap justify-center gap-x-5 gap-y-3 text-xs"><Link href="/shipping">Envio</Link><Link href="/legal/privacy">Privacidade</Link><Link href="/returns">Troca e devolução</Link><Link href="/legal/terms">Termos de uso</Link><Link href="/contact">Contacto</Link><a href={COMPANY.ptComplaintsBook} target="_blank" rel="noreferrer">Livro de Reclamações</a><Link href="/legal/dispute-resolution">Resolução de litígios</Link></nav><div className="mx-auto mt-7 w-fit border-t border-white/10 pt-6 text-left"><PaymentBrandStrip country={market.countryCode} currency={market.currency} variant="footer" caption="Meios de pagamento configurados" /></div><p className="mt-7 border-t border-white/10 pt-6 text-xs leading-5">E-com.casa é uma marca comercial operada por {COMPANY.legalName}, registada em {COMPANY.countryOfIncorporation}.<br />© 2026 E-com.casa. Todos os direitos reservados.</p></div></footer>;
}
