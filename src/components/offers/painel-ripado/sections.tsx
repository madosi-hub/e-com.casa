'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { ArrowRight, BadgeCheck, ChevronDown, ChevronLeft, ChevronRight, Factory, Headphones, House, PackageCheck, Play, Plus, ShieldCheck, X } from 'lucide-react';
import type { CatalogProduct } from '@/lib/catalog/types';
import type { OfferConfig, OfferMarketContext } from '@/lib/offers/types';
import { PaymentBrandStrip } from '@/components/payments/payment-brand-strip';
import { COMPANY } from '@/lib/company';
import { isPanelOfferSlug, NURALTA_OFFER_ALIAS, panelOfferPath } from '@/lib/offers/route-policy';
import { isPanelVideo, PANEL_PRODUCT_MEDIA, PANEL_REVIEW_GALLERY, PANEL_REVIEW_RATING, PANEL_REVIEW_TOTAL, PANEL_REVIEWS, PANEL_REVIEWS_PER_PAGE, PANEL_REVIEWS_WITH_PHOTOS, type PanelReviewGalleryItem } from './data';
import { DETAILS as NURALTA_DETAILS, FAQS as NURALTA_FAQS } from '../nuralta/data';

function Stars({ value = 5, size = 13 }: { value?: number; size?: number }) {
  return <span className="inline-flex gap-0.5">{[1,2,3,4,5].map((star) => <span key={star} style={{ color: '#f2b01e', fontSize: size }}>{star <= Math.round(value) ? '★' : '☆'}</span>)}</span>;
}

export function PanelFactoryStory() {
  return (
    <section id="fabrico-proprio" className="bg-[#201a17] px-4 pb-6 pt-6 text-[#f7f3ef] sm:px-6 sm:py-20">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-3xl">
          <p className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.16em] text-[#c79a68]">
            <Factory className="h-3.5 w-3.5" />
            E-com.casa · fabrico próprio
          </p>
          <h2 className="mt-4 font-display text-4xl leading-[1.08] sm:text-5xl lg:text-6xl">
            Da nossa fábrica.
            <span className="block text-[#d6a56f]">Para a sua casa.</span>
          </h2>
          <div className="mt-8 max-w-2xl text-sm leading-6 text-[#c5b7ab] sm:text-base sm:leading-7">
            <p><strong className="font-semibold text-[#f7f3ef]">Somos a E-com.casa. Fabricamos os painéis que vendemos.</strong></p>
            <p className="mt-1">Na nossa fábrica, produzimos painéis ripados para salas, quartos, escritórios e espaços comerciais. Com fabrico próprio e venda direta, o seu projeto fica ligado a quem cria o produto.</p>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-5 border-y border-white/15 py-5 sm:gap-10 sm:py-6">
            <div>
              <Factory className="h-5 w-5 text-[#c79a68]" />
              <strong className="mt-3 block text-xs sm:text-sm">Fábrica E-com.casa</strong>
              <span className="mt-1 block text-[10px] leading-4 text-[#a99a8e] sm:text-xs">Produzimos os seus painéis</span>
            </div>
            <div>
              <House className="h-5 w-5 text-[#c79a68]" />
              <strong className="mt-3 block text-xs sm:text-sm">O seu projeto</strong>
              <span className="mt-1 block text-[10px] leading-4 text-[#a99a8e] sm:text-xs">Compra diretamente a quem fabrica</span>
            </div>
          </div>

          <a href="#configurar-painel" className="mt-5 inline-flex items-center gap-5 rounded-full bg-[#d6a56f] px-5 py-3 text-xs font-semibold text-[#201a17] transition hover:bg-[#e0b37f] sm:px-6 sm:py-3.5 sm:text-sm">
            Conhecer os nossos painéis
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </section>
  );
}

export function PanelCampaignStory({ product }: { product: CatalogProduct }) {
  const storyImage = PANEL_PRODUCT_MEDIA.find((item) => item.type === 'image')?.src ?? product.image;

  return <>
    <section className="mx-auto max-w-6xl px-4 pb-6 pt-10 sm:px-6 sm:py-16">
      <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
        <div><p className="mb-3 text-[11px] uppercase tracking-[.18em] text-[#8a5a2b]">Textura, ritmo, calor</p><h2 className="font-display text-4xl leading-tight">Um detalhe que muda a forma de sentir o espaço.</h2><p className="mt-5 leading-relaxed text-[#5c5049]">Crie uma parede com presença, textura e calor natural. O Painel Ripado Decorativo foi pensado para renovar salas, quartos, escritórios e espaços comerciais.</p><ul className="mt-6 space-y-2 text-sm text-[#3d342e]"><li>Transforma o ambiente rapidamente</li><li>Ritmo visual moderno e acolhedor</li><li>Instalação simples e acabamento elegante</li><li>Manutenção fácil no dia a dia</li></ul></div>
        <div className="relative aspect-[4/5] overflow-hidden rounded-lg"><img src={storyImage} alt={`${product.name} - ambiente e acabamento`} className="h-full w-full object-cover object-top" /></div>
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
  void product;
  return <section id="product-details" className="bg-[#201a17] px-4 pb-5 pt-12 text-[#f7f3ef] sm:px-6 sm:py-16"><div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[.85fr_1.15fr] lg:gap-20"><div><p className="text-[11px] uppercase tracking-[.18em] text-[#c79a68]">Conheça o seu painel</p><h2 className="mt-4 font-display text-4xl leading-tight">Cada detalhe,<br />ao seu ritmo.</h2><p className="mt-5 text-sm leading-6 text-[#b7a696]">Das medidas à instalação, escolha o que pretende saber.</p></div><div>{NURALTA_DETAILS.map((group,index) => <div key={group.number} className="border-b border-white/15"><button type="button" aria-expanded={open === index} onClick={() => setOpen(open === index ? null : index)} className="flex w-full items-center gap-4 py-5 text-left"><span className="w-8 text-xs text-[#c79a68]">{group.number}</span><span className="flex-1"><strong className="block text-base">{group.title}</strong><span className="text-xs text-[#b7a696]">{group.subtitle}</span></span><span className={`grid h-8 w-8 place-items-center rounded-full border border-white/15 transition ${open === index ? 'rotate-45 bg-[#c79a68] text-[#201a17]' : ''}`}><Plus className="h-4 w-4" /></span></button>{open === index && <dl className="pb-5">{group.rows.map((row) => <div key={row.dt} className="grid gap-1 border-t border-white/10 py-3 text-sm sm:grid-cols-[145px_1fr]"><dt className="text-[#b7a696]">{row.dt}</dt><dd>{row.dd}</dd></div>)}</dl>}</div>)}</div></div></section>;
}

export function PanelInspiration({ product }: { product: CatalogProduct }) {
  const images = PANEL_PRODUCT_MEDIA.filter((item) => item.type === 'image').slice(2, 6).map((item) => item.src);
  return <section id="inspiration" className="bg-[#efe7de]"><div className="mx-auto max-w-6xl px-4 pb-12 pt-5 sm:px-6 sm:py-16"><h2 className="font-display text-4xl">Espaços que ganharam outra vida.</h2><p className="mt-2 text-sm text-[#7d6f64]">Projetos de clientes, em Portugal.</p><div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{images.map((image) => <div key={image} className="aspect-[3/4] overflow-hidden rounded-lg bg-[#e5dbd0]"><img src={image} alt={`${product.name} - ambiente de referência`} className="h-full w-full object-cover" loading="lazy" /></div>)}</div></div></section>;
}

function formatReviewDateFromOffset(hoursAgo: number, now = Date.now()) {
  const current = new Date(now);
  const reviewDate = new Date(now - hoursAgo * 60 * 60 * 1000);
  const time = new Intl.DateTimeFormat('pt-PT', { hour: '2-digit', minute: '2-digit' }).format(reviewDate);
  const currentDay = new Date(current.getFullYear(), current.getMonth(), current.getDate()).getTime();
  const reviewDay = new Date(reviewDate.getFullYear(), reviewDate.getMonth(), reviewDate.getDate()).getTime();
  const dayDifference = Math.round((currentDay - reviewDay) / 86_400_000);
  if (dayDifference === 0) return `hoje às ${time}`;
  if (dayDifference === 1) return `ontem às ${time}`;
  const date = new Intl.DateTimeFormat('pt-PT', { day: '2-digit', month: '2-digit' }).format(reviewDate);
  return `${date} às ${time}`;
}

function ReviewMedia({ item, className }: { item: Pick<PanelReviewGalleryItem, 'src' | 'poster' | 'isVideo'>; className: string }) {
  if (item.isVideo) {
    return <video src={item.src} poster={item.poster} className={className} muted playsInline preload="metadata" />;
  }

  return <img src={item.src} alt="" className={className} loading="lazy" />;
}

export function PanelReviews() {
  const [filter, setFilter] = useState<'todas' | 'com fotos'>('todas');
  const [page, setPage] = useState(1);
  const [reviewNow, setReviewNow] = useState(() => Date.now());
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const activeLightbox = lightboxIndex === null ? null : PANEL_REVIEW_GALLERY[lightboxIndex];
  const filteredReviews = filter === 'com fotos' ? PANEL_REVIEWS.filter((review) => review.photos.length > 0) : PANEL_REVIEWS;
  const pageCount = Math.max(1, Math.ceil(filteredReviews.length / PANEL_REVIEWS_PER_PAGE));
  const currentPage = Math.min(page, pageCount);
  const visibleReviews = filteredReviews.slice((currentPage - 1) * PANEL_REVIEWS_PER_PAGE, currentPage * PANEL_REVIEWS_PER_PAGE);

  const moveLightbox = useCallback((direction: number) => {
    setLightboxIndex((index) => {
      if (index === null) return index;
      return (index + direction + PANEL_REVIEW_GALLERY.length) % PANEL_REVIEW_GALLERY.length;
    });
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setReviewNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (lightboxIndex === null) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setLightboxIndex(null);
      if (event.key === 'ArrowLeft') moveLightbox(-1);
      if (event.key === 'ArrowRight') moveLightbox(1);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [lightboxIndex, moveLightbox]);

  const openMedia = (src: string) => {
    const index = PANEL_REVIEW_GALLERY.findIndex((item) => item.src === src);
    if (index >= 0) setLightboxIndex(index);
  };

  return (
    <section id="avaliacoes" className="border-y border-[#e6ded4] bg-[#fdfbf9] py-10" style={{ scrollMarginTop: 72 }}>
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-base font-bold sm:text-lg">Galeria visual do produto</h2>
          <a href="#lista-avaliacoes" className="inline-flex shrink-0 items-center text-xs text-[#83766d] transition hover:text-[#201a17]">Ver todas ({PANEL_REVIEW_GALLERY.length}) <ChevronRight className="h-3 w-3" /></a>
        </div>

        <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-2">
          {PANEL_REVIEW_GALLERY.map((item, index) => (
            <button key={`${item.src}-${index}`} type="button" onClick={() => setLightboxIndex(index)} className="relative h-24 w-20 shrink-0 overflow-hidden rounded-lg bg-[#ece5dd] transition duration-200 hover:scale-105 sm:h-28 sm:w-24" aria-label={`Abrir foto ${index + 1} da avaliação de ${item.review.name}`}>
              {item.isVideo ? <img src={item.poster} alt="" className="h-full w-full object-cover" loading="lazy" /> : <img src={item.src} alt="" className="h-full w-full object-cover" loading="lazy" />}
              {item.isVideo && <span className="absolute inset-0 grid place-items-center bg-black/25"><span className="grid h-8 w-8 place-items-center rounded-full bg-white/90 shadow"><Play className="h-4 w-4 translate-x-0.5 fill-current text-[#201a17]" /></span></span>}
            </button>
          ))}
        </div>

        <div id="lista-avaliacoes" className="mt-5 border-t border-[#e6ded4] pt-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-bold">Avaliações</h3>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#4d7d44]"><BadgeCheck className="h-3.5 w-3.5" />Todas de compras verificadas</span>
          </div>

          <div className="mt-3 flex items-start gap-3">
            <strong className="text-3xl leading-none">{PANEL_REVIEW_RATING.toFixed(1).replace('.', ',')}</strong>
            <div className="flex flex-col gap-1">
              <Stars value={PANEL_REVIEW_RATING} size={16} />
              <span className="text-xs text-[#83766d]">{PANEL_REVIEW_TOTAL} avaliações</span>
            </div>
          </div>

          <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto pb-1 text-[11px]" aria-label="Filtrar avaliações">
            {(['todas', 'com fotos'] as const).map((nextFilter) => {
              const count = nextFilter === 'com fotos' ? PANEL_REVIEWS_WITH_PHOTOS : PANEL_REVIEW_TOTAL;
              const active = filter === nextFilter;
              return <button key={nextFilter} type="button" onClick={() => { setFilter(nextFilter); setPage(1); }} aria-pressed={active} className={`shrink-0 rounded-md border px-3 py-2 transition ${active ? 'border-[#201a17] bg-[#201a17] text-white' : 'border-transparent bg-[#f0f2f3] text-[#4f5961] hover:border-[#c9bdb1]'}`}>{nextFilter} ({count})</button>;
            })}
          </div>

          <div className="mt-2 divide-y divide-[#ece5dd]">
            {visibleReviews.map((review, index) => (
              <article key={review.id ?? `${review.name}-${review.title}-${index}`} className="py-5">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                    <Stars value={review.stars} />
                    <span className="inline-flex min-w-0 items-center gap-1.5"><strong className="text-xs">{review.name}</strong><BadgeCheck className="h-3.5 w-3.5 shrink-0 text-[#597057]" aria-label="Compra verificada" /></span>
                    <span className="text-[10px] text-[#8d7f73]">🇵🇹 {review.location} · {review.dateOffsetHours ? formatReviewDateFromOffset(review.dateOffsetHours, reviewNow) : review.time}</span>
                  </div>
                  <h4 className="mt-2 text-sm font-bold leading-snug">{review.title}</h4>
                  <p className="mt-1 text-xs leading-5 text-[#62574f]">{review.body}</p>
                </div>
                {review.photos.length > 0 && (
                  <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                    {review.photos.map((photo, photoIndex) => {
                      const isVideo = isPanelVideo(photo);
                      const galleryItem = PANEL_REVIEW_GALLERY.find((item) => item.src === photo);
                      return (
                        <button key={`${photo}-${photoIndex}`} type="button" onClick={() => openMedia(photo)} className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-[#ece5dd] transition duration-200 hover:scale-105 sm:h-24 sm:w-24" aria-label={`Abrir foto ${photoIndex + 1} da avaliação de ${review.name}`}>
                          <img src={isVideo ? galleryItem?.poster : photo} alt="" className="h-full w-full object-cover" loading="lazy" />
                          {isVideo && <span className="absolute inset-0 grid place-items-center bg-black/25"><Play className="h-4 w-4 fill-current text-white" /></span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </article>
            ))}
          </div>

          <div className="mt-2 flex flex-wrap items-center justify-between gap-3 border-t border-[#e6ded4] pt-5">
            <span className="text-xs text-[#83766d]">A mostrar {(currentPage - 1) * PANEL_REVIEWS_PER_PAGE + 1}-{Math.min(currentPage * PANEL_REVIEWS_PER_PAGE, filteredReviews.length)} de {filteredReviews.length}</span>
            <div className="flex items-center gap-2" aria-label="Paginação das avaliações">
              <button type="button" disabled={currentPage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="rounded-lg border border-[#d9cec2] px-3 py-2 text-xs font-semibold transition hover:bg-[#efe7de] disabled:cursor-not-allowed disabled:opacity-35">Anterior</button>
              <span className="min-w-20 text-center text-xs font-semibold">Página {currentPage} de {pageCount}</span>
              <button type="button" disabled={currentPage === pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))} className="rounded-lg border border-[#d9cec2] px-3 py-2 text-xs font-semibold transition hover:bg-[#efe7de] disabled:cursor-not-allowed disabled:opacity-35">Seguinte</button>
            </div>
          </div>
        </div>
      </div>

      {activeLightbox && (
        <div className="fixed inset-0 z-[120] flex flex-col bg-[#050505]" role="dialog" aria-modal="true" aria-label={`Fotos e avaliação de ${activeLightbox.review.name}`} onMouseDown={(event) => { if (event.target === event.currentTarget) setLightboxIndex(null); }}>
          <span className="absolute left-4 top-4 z-10 text-xs text-white">{(lightboxIndex ?? 0) + 1} / {PANEL_REVIEW_GALLERY.length}</span>
          <button type="button" onClick={() => setLightboxIndex(null)} className="absolute right-3 top-2 z-10 rounded-full p-2.5 text-white" aria-label="Fechar fotos"><X className="h-6 w-6" /></button>
          <div className="relative flex min-h-0 flex-1 items-center justify-center px-5 pb-3 pt-12">
            <button type="button" onClick={() => moveLightbox(-1)} className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/55 p-2 text-white" aria-label="Foto anterior"><ChevronLeft className="h-6 w-6" /></button>
            {activeLightbox.isVideo ? <video src={activeLightbox.src} poster={activeLightbox.poster} className="h-full max-w-full object-contain" controls autoPlay muted playsInline /> : <img src={activeLightbox.src} alt={`Projeto partilhado por ${activeLightbox.review.name}`} className="h-full max-w-full object-contain" />}
            <button type="button" onClick={() => moveLightbox(1)} className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/55 p-2 text-white" aria-label="Próxima foto"><ChevronRight className="h-6 w-6" /></button>
          </div>
          <div className="shrink-0 border-t border-white/10 px-4 pb-5 pt-4 text-white sm:px-6">
            <div className="mx-auto max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                <Stars value={activeLightbox.review.stars} />
                <strong className="text-xs">{activeLightbox.review.name}</strong>
                <BadgeCheck className="h-3.5 w-3.5 text-[#9ab899]" aria-label="Compra verificada" />
                <span className="text-[10px] text-white/55">🇵🇹 {activeLightbox.review.location}</span>
              </div>
              <h3 className="mt-2 text-sm font-bold">{activeLightbox.review.title}</h3>
              <p className="mt-1 text-xs leading-5 text-white/75">{activeLightbox.review.body}</p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export function PanelFaq({ offer }: { offer: OfferConfig }) {
  const [open,setOpen] = useState(0);
  void offer;
  const trust = [{ icon:ShieldCheck,label:'Pagamento protegido'},{icon:PackageCheck,label:'Entrega acompanhada'},{icon:Headphones,label:'Apoio após a compra'}];
  return <section id="faq" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20"><div className="grid gap-10 lg:grid-cols-[.78fr_1.22fr]"><div className="lg:sticky lg:top-28 lg:self-start"><p className="mb-3 text-[11px] uppercase tracking-[.18em] text-[#8a5a2b]">Comprar sem dúvidas</p><h2 className="font-display text-4xl leading-tight sm:text-5xl">Antes de decidir, tenha todas as respostas.</h2><p className="mt-5 max-w-md leading-7 text-[#5c5049]">Reunimos o essencial sobre medidas, instalação, acústica, entrega e pós-venda para que escolha com confiança.</p><div className="mt-7 grid gap-3 text-sm text-[#4d423a] sm:grid-cols-3 lg:grid-cols-1">{trust.map(({icon:Icon,label}) => <div key={label} className="flex items-center gap-3 rounded-xl bg-[#efe7de] px-4 py-3"><Icon className="h-5 w-5 text-[#8a5a2b]" />{label}</div>)}</div></div><div className="space-y-3">{NURALTA_FAQS.map((item,index) => <article key={item.number} className={`overflow-hidden rounded-2xl border transition ${open === index ? 'border-[#c9aa86] bg-[#fdfbf9] shadow-sm' : 'border-[#e0d6cb]'}`}><button type="button" aria-expanded={open === index} onClick={() => setOpen(open === index ? -1 : index)} className="flex w-full items-center gap-4 px-5 py-5 text-left sm:px-6"><span className="w-7 text-xs font-bold text-[#a89a8d]">{item.number}</span><strong className="flex-1 text-sm">{item.question}</strong><span className={`grid h-8 w-8 place-items-center rounded-full transition ${open === index ? 'bg-[#8a5a2b] text-white' : 'bg-[#eae1d8] text-[#8a5a2b]'}`}><ChevronDown className={`h-4 w-4 transition ${open === index ? 'rotate-180' : ''}`} /></span></button>{open === index && <p className="px-5 pb-5 pl-16 text-sm leading-6 text-[#62574f] sm:px-6 sm:pl-[76px]">{item.answer}</p>}</article>)}</div></div></section>;
}

export function PanelFooter({ market, offerSlug }: { market: OfferMarketContext; offerSlug: string }) {
  const slug = isPanelOfferSlug(offerSlug) ? offerSlug : NURALTA_OFFER_ALIAS;
  const informationPath = (pageSlug: string) => panelOfferPath(slug, `/informacao/${pageSlug}`);
  return <footer id="footer" className="bg-[#17120f] px-4 py-10 text-center text-sm text-[#a39486] sm:px-6"><div className="mx-auto max-w-4xl"><img src="/images/logo-e-com-casa-branca.png" alt="E-com.casa" className="mx-auto h-auto w-[190px] object-contain" /><p className="mt-3 text-xs">A sua casa, à sua maneira.</p><address className="mt-4 not-italic leading-6"><span className="block">{COMPANY.legalName} · N.º de registo {COMPANY.companyNumber}</span><span className="block">{COMPANY.registeredOffice.line1}, {COMPANY.registeredOffice.line2} · {COMPANY.registeredOffice.city} {COMPANY.registeredOffice.postcode} · {COMPANY.registeredOffice.country}</span><span className="block"><a href="mailto:suporte@e-com.casa" className="hover:text-[#f5ece2]">suporte@e-com.casa</a> · <a href="tel:+351913482761" className="hover:text-[#f5ece2]">+351 913 482 761</a></span></address><nav aria-label="Informação legal" className="mt-6 flex flex-wrap justify-center gap-x-5 gap-y-3 text-xs"><Link href={informationPath('envios')}>Envios</Link><Link href={informationPath('privacidade')}>Privacidade</Link><Link href={informationPath('trocas-e-devolucoes')}>Trocas e devoluções</Link><Link href={informationPath('termos-e-condicoes')}>Termos e condições</Link><Link href={informationPath('contacto')}>Contacto</Link><a href={COMPANY.ptComplaintsBook} target="_blank" rel="noreferrer">Livro de Reclamações</a><Link href={informationPath('dados-da-empresa')}>Dados da empresa</Link></nav><div className="mx-auto mt-7 w-fit border-t border-white/10 pt-6 text-left"><PaymentBrandStrip country={market.countryCode} currency={market.currency} variant="footer" caption="Meios de pagamento disponíveis" /></div><p className="mt-7 border-t border-white/10 pt-6 text-xs leading-5">E-com.casa é uma marca comercial operada por {COMPANY.legalName}, registada em Inglaterra e País de Gales.<br />© 2026 E-com.casa. Todos os direitos reservados.</p></div></footer>;
}
