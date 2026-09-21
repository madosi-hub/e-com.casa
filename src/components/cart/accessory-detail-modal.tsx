'use client';

import { useRef, useState, type TouchEvent } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { ArrowLeft, ArrowRight, Check, ImageOff, Lightbulb, Maximize2, ShoppingBag, Star, Wrench, X } from 'lucide-react';
import type { CatalogProduct } from '@/lib/catalog/types';
import { formatPrice } from '@/lib/format';

export function AccessoryDetailModal({ product, onClose, onAdd }: {
  product: CatalogProduct;
  onClose: () => void;
  onAdd: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const returnFocus = useRef<HTMLElement | null>(null);
  const touchStartX = useRef<number | null>(null);
  const gallery = [...new Set([product.image, ...(product.gallery ?? '').split(',')].map(src => src.trim()).filter(Boolean))];
  const variant = product.variants[0];
  const cents = product.priceCents + (variant?.priceDeltaCents ?? 0);
  const regularCents = (product.regularPriceCents ?? product.priceCents) + (variant?.regularPriceDeltaCents ?? variant?.priceDeltaCents ?? 0);
  const installation = product.slug.includes('kit-instalacao');
  const displayName = product.name.replace(/\s+Nuralta\b/gi, '').trim();
  const Icon = installation ? Wrench : Lightbulb;
  const features = installation
    ? ['Cola de montagem', 'Pistola aplicadora reutilizável', 'Guia para medir e alinhar', 'Estilete para os acabamentos']
    : ['Fita LED RGB de 3 metros', 'Cores e intensidade ajustáveis', 'Controlo tátil incluído', 'Aplicação discreta entre as ripas'];
  const reviews = installation
    ? [
        ['O kit trouxe tudo o que precisava e a montagem ficou pronta numa tarde.', 'João M.', 'Lisboa'],
        ['A pistola e o guia facilitaram muito o primeiro corte.', 'Marta R.', 'Braga'],
      ]
    : [
        ['Ficou discreta entre as ripas e o efeito RGB transformou o ambiente.', 'Carla F.', 'Coimbra'],
        ['O controlo é simples e consigo ajustar a cor num instante.', 'Tiago S.', 'Porto'],
      ];
  const price = formatPrice((cents / 100).toFixed(2));
  const go = (direction: number) => setIndex(current => (current + direction + gallery.length) % gallery.length);
  const markFailed = (src: string) => setFailedImages(current => new Set(current).add(src));
  const handleTouchStart = (event: TouchEvent) => { touchStartX.current = event.changedTouches[0]?.clientX ?? null; };
  const handleTouchEnd = (event: TouchEvent) => {
    if (touchStartX.current === null) return;
    const distance = event.changedTouches[0]?.clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(distance) < 40 || gallery.length < 2) return;
    go(distance < 0 ? 1 : -1);
  };

  return <Dialog.Root open onOpenChange={open => { if (!open) onClose(); }}>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-[120] bg-black/45 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=open]:fade-in-0 motion-reduce:animate-none" />
      <Dialog.Content
        onOpenAutoFocus={() => { returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; }}
        onCloseAutoFocus={event => { event.preventDefault(); returnFocus.current?.focus(); }}
        className="fixed inset-x-0 bottom-0 z-[121] flex max-h-[82dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-white text-zinc-900 shadow-2xl outline-none data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom duration-300 motion-reduce:animate-none md:left-1/2 md:right-auto md:w-[min(760px,calc(100%-2rem))] md:-translate-x-1/2 md:max-h-[86dvh] md:rounded-t-2xl"
      >
        <header className="flex h-11 shrink-0 items-center justify-between border-b border-zinc-200 px-4 sm:px-6">
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-600"><Icon className="size-4" />{installation ? 'Complete a instalação' : 'Dê luz ao seu painel'}</div>
          <Dialog.Close aria-label="Fechar detalhes" title="Fechar detalhes" className="flex size-9 items-center justify-center rounded-md transition hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-zinc-900"><X className="size-4" /></Dialog.Close>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <section aria-label="Fotos do produto" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} className="relative border-b border-zinc-200 bg-zinc-50 px-4 pt-3 pb-2 sm:px-6">
            <div className="relative flex h-[36dvh] min-h-52 max-h-96 items-center justify-center">
              {gallery[index] && !failedImages.has(gallery[index]) ? <button type="button" onClick={() => setZoomOpen(true)} aria-label="Ampliar fotografia" className="group relative h-full w-full cursor-zoom-in"><img src={gallery[index]} onError={() => markFailed(gallery[index])} alt={`${displayName}, imagem ${index + 1}`} className="h-full w-full object-contain" /><span className="absolute bottom-2 right-2 flex size-9 items-center justify-center rounded-full bg-white/90 text-zinc-700 opacity-80 shadow-sm transition group-hover:opacity-100"><Maximize2 className="size-4" /></span></button> : <div role="status" className="flex flex-col items-center gap-2 px-8 text-center text-sm text-zinc-500"><ImageOff className="size-6 text-zinc-400" />Fotografia indisponível de momento</div>}
              {gallery.length > 1 && <>
                <button type="button" aria-label="Imagem anterior" title="Imagem anterior" onClick={() => go(-1)} className="absolute left-0 flex size-9 items-center justify-center rounded-full border border-zinc-200 bg-white shadow-sm transition hover:bg-zinc-100 focus-visible:outline-2"><ArrowLeft className="size-4" /></button>
                <button type="button" aria-label="Próxima imagem" title="Próxima imagem" onClick={() => go(1)} className="absolute right-0 flex size-9 items-center justify-center rounded-full border border-zinc-200 bg-white shadow-sm transition hover:bg-zinc-100 focus-visible:outline-2"><ArrowRight className="size-4" /></button>
              </>}
            </div>
            {gallery.length > 1 && <div className="flex items-center gap-3">
              <div className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto p-1" aria-label="Escolher fotografia">
                {gallery.map((src, imageIndex) => <button type="button" key={src} onClick={() => setIndex(imageIndex)} aria-label={`Ver imagem ${imageIndex + 1}`} aria-pressed={imageIndex === index} className={`flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-white p-1 transition focus-visible:outline-2 ${imageIndex === index ? 'border-zinc-900 ring-1 ring-zinc-900' : 'border-zinc-200 hover:border-zinc-400'}`}>{failedImages.has(src) ? <ImageOff className="size-3.5 text-zinc-400" /> : <img src={src} onError={() => markFailed(src)} alt="" className="h-full w-full object-contain" />}</button>)}
              </div>
              <span aria-live="polite" className="shrink-0 text-[11px] tabular-nums text-zinc-500">{index + 1} / {gallery.length}</span>
            </div>}
          </section>

          <div className="space-y-4 px-4 py-4 sm:px-6 sm:py-5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[.12em] text-emerald-800">{installation ? 'Instalação' : 'Iluminação'}</p>
              <Dialog.Title className="mt-1 break-words text-xl font-semibold leading-tight sm:text-2xl">{displayName}</Dialog.Title>
              <div className="mt-2 flex items-center gap-2 text-xs text-zinc-600" aria-label="Avaliação de clientes">
                <span className="flex items-center gap-0.5 text-amber-500" aria-hidden="true">{[1, 2, 3, 4, 5].map(star => <Star key={star} className="size-3.5 fill-current" />)}</span>
                <span className="font-semibold text-zinc-800">4,8</span>
                <span>· Avaliações verificadas</span>
              </div>
              <div className="mt-2 flex flex-wrap items-baseline gap-2">
                <strong className="text-2xl font-semibold tabular-nums">{price}</strong>
                {regularCents > cents && <span className="text-sm text-zinc-400 line-through">{formatPrice((regularCents / 100).toFixed(2))}</span>}
                {regularCents > cents && <span className="text-xs font-medium text-emerald-800">Poupa {formatPrice(((regularCents - cents) / 100).toFixed(2))}</span>}
              </div>
            </div>

            <Dialog.Description className="text-sm leading-6 text-zinc-600">
              {installation ? 'Da montagem aos acabamentos, reúna os acessórios para instalar o seu painel num só kit.' : 'Realce a textura do painel com luz indireta e ajuste a cor e a intensidade ao ambiente da sua casa.'}
            </Dialog.Description>

            {product.description && <p className="whitespace-pre-line break-words border-t border-zinc-200 pt-4 text-sm leading-6 text-zinc-600">{product.description}</p>}

            <section className="border-t border-zinc-200 pt-4">
              <h3 className="text-sm font-semibold">{installation ? 'O que inclui o kit' : 'Detalhes da iluminação'}</h3>
              <ul className="mt-3 grid gap-x-5 gap-y-2.5 sm:grid-cols-2">
                {features.map(feature => <li key={feature} className="flex items-start gap-2 text-sm leading-5 text-zinc-600"><Check className="mt-0.5 size-4 shrink-0 text-emerald-700" />{feature}</li>)}
              </ul>
            </section>

            <section className="border-t border-zinc-200 pt-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold">Avaliações de clientes</h3>
                <span className="text-xs text-zinc-500">Compras verificadas</span>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {reviews.map(([body, author, city]) => <blockquote key={author} className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm leading-5 text-zinc-600"><div className="mb-2 flex items-center gap-0.5 text-amber-500" aria-label="5 estrelas">{[1, 2, 3, 4, 5].map(star => <Star key={star} className="size-3 fill-current" />)}</div><p>“{body}”</p><footer className="mt-2 text-xs text-zinc-500">{author} · {city}</footer></blockquote>)}
              </div>
            </section>
          </div>
        </div>

        <footer className="shrink-0 border-t border-zinc-200 bg-white px-4 pt-3 pb-[max(.75rem,env(safe-area-inset-bottom))] sm:px-6">
          <button type="button" onClick={onAdd} disabled={!product.canPurchase} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-zinc-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-zinc-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 disabled:cursor-not-allowed disabled:opacity-40"><ShoppingBag className="size-4 shrink-0" />{product.canPurchase ? 'Adicionar ao carrinho' : 'Indisponível de momento'}</button>
        </footer>

      </Dialog.Content>
    </Dialog.Portal>
    {zoomOpen && <Dialog.Portal>
      <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/85 p-4" role="dialog" aria-modal="true" aria-label={`Fotografia ampliada de ${displayName}`} onClick={() => setZoomOpen(false)} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        <button type="button" onClick={() => setZoomOpen(false)} aria-label="Fechar fotografia ampliada" title="Fechar" className="absolute right-4 top-4 flex size-11 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"><X className="size-5" /></button>
        {gallery.length > 1 && <button type="button" onClick={event => { event.stopPropagation(); go(-1); }} aria-label="Imagem anterior" title="Imagem anterior" className="absolute left-3 flex size-11 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 sm:left-8"><ArrowLeft className="size-5" /></button>}
        {gallery[index] && !failedImages.has(gallery[index]) && <img src={gallery[index]} alt={`${displayName}, imagem ampliada ${index + 1}`} className="max-h-full max-w-full object-contain" onClick={event => event.stopPropagation()} />}
        {gallery.length > 1 && <button type="button" onClick={event => { event.stopPropagation(); go(1); }} aria-label="Próxima imagem" title="Próxima imagem" className="absolute right-3 flex size-11 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 sm:right-8"><ArrowRight className="size-5" /></button>}
        <span className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-xs text-white">{index + 1} / {gallery.length}</span>
      </div>
    </Dialog.Portal>}
  </Dialog.Root>;
}
