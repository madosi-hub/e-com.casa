"use client";

import { useEffect, useRef, useState } from "react";
import { BadgeCheck, ChevronRight, Play, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogPortal,
  DialogOverlay,
} from "@/components/ui/dialog";
import { REVIEWS, REVIEW_THUMBS, type ReviewThumb } from "./data";
import { StarRow } from "./stars";

export function Reviews() {
  const [filter, setFilter] = useState<"all" | "photos">("all");
  const [lightbox, setLightbox] = useState<ReviewThumb | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const visible =
    filter === "photos" ? REVIEWS.filter((r) => r.photos.length > 0) : REVIEWS;

  // Play/pause the lightbox video on open/close
  useEffect(() => {
    if (lightbox?.isVideo && videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
    return () => {
      if (videoRef.current) {
        videoRef.current.pause();
      }
    };
  }, [lightbox]);

  // Lock body scroll while lightbox open
  useEffect(() => {
    if (lightbox) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [lightbox]);

  return (
    <section
      id="avaliacoes"
      className="border-y border-[#e6ded4] bg-[#fdfbf9] py-10"
      style={{ scrollMarginTop: 72 }}
    >
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        {/* Gallery */}
        <div id="review-gallery" className="flex items-center justify-between gap-4">
          <h2 className="text-base font-bold sm:text-lg">Galeria de avaliações</h2>
          <a
            href="#lista-avaliacoes"
            className="shrink-0 text-xs text-[#83766d] transition hover:text-[#201a17]"
          >
            Ver todas (36) <ChevronRight className="inline h-3 w-3" />
          </a>
        </div>

        <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-2">
          {REVIEW_THUMBS.map((t, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setLightbox(t)}
              className="relative h-24 w-20 shrink-0 overflow-hidden rounded-lg bg-[#ece5dd] transition duration-200 hover:scale-105 sm:h-28 sm:w-24"
              aria-label={t.alt}
            >
              {t.isVideo ? (
                 
                <img
                  src="/pt/videos/reviews/customer-review-09-poster.webp"
                  alt={t.alt}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              ) : (
                 
                <img
                  src={t.src}
                  alt={t.alt}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              )}
              {t.isVideo && (
                <span className="absolute inset-0 grid place-items-center bg-black/25">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-white/90 shadow">
                    <Play className="h-4 w-4 translate-x-0.5 text-[#201a17]" fill="currentColor" />
                  </span>
                </span>
              )}
            </button>
          ))}
        </div>

        {/* List */}
        <div id="lista-avaliacoes" className="mt-5 border-t border-[#e6ded4] pt-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-bold">Avaliações</h3>
            <span className="flex items-center gap-1 text-[11px] font-semibold text-[#4d7d44]">
              <BadgeCheck className="h-3.5 w-3.5" />
              Todas de compras verificadas
            </span>
          </div>

          <div className="mt-3 flex items-start gap-3">
            <strong className="text-3xl leading-none">4,7</strong>
            <div className="flex flex-col gap-1">
              <StarRow fill="#f2b01e" size={16} value={4.7} />
              <span className="text-xs text-[#83766d]">220 avaliações</span>
            </div>
          </div>

          <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto pb-1 text-[11px]">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`shrink-0 rounded-md border px-3 py-2 transition ${
                filter === "all"
                  ? "border-[#201a17] bg-[#201a17] text-white"
                  : "border-transparent bg-[#f0f2f3] text-[#4f5961] hover:border-[#c9bdb1]"
              }`}
            >
              todas (220)
            </button>
            <button
              type="button"
              onClick={() => setFilter("photos")}
              className={`shrink-0 rounded-md border px-3 py-2 transition ${
                filter === "photos"
                  ? "border-[#201a17] bg-[#201a17] text-white"
                  : "border-transparent bg-[#f0f2f3] text-[#4f5961] hover:border-[#c9bdb1]"
              }`}
            >
              com fotos (22)
            </button>
          </div>

          <div className="mt-2 divide-y divide-[#ece5dd]">
            {visible.map((r, i) => (
              <article key={i} className="py-5">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                    <StarRow fill="#f2b01e" size={13} value={5} />
                    <span className="inline-flex min-w-0 items-center gap-1.5">
                      <strong className="text-xs">{r.name}</strong>
                      <BadgeCheck className="h-3.5 w-3.5 text-[#597057]" />
                    </span>
                    <span className="text-[10px] text-[#8d7f73]">
                      🇵🇹 {r.location} · {r.time}
                    </span>
                  </div>
                  <h4 className="mt-2 text-sm font-bold leading-snug">
                    {r.title}
                  </h4>
                  <p className="mt-1 text-xs leading-5 text-[#62574f]">{r.body}</p>
                </div>
                {r.photos.length > 0 && (
                  <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                    {r.photos.map((p, pi) => (
                      <button
                        key={pi}
                        type="button"
                        onClick={() => setLightbox({ src: p, alt: `Foto ${pi + 1} de ${r.name}` })}
                        className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-[#ece5dd] transition duration-200 hover:scale-105 sm:h-24 sm:w-24"
                        aria-label={`Ampliar foto ${pi + 1} de ${r.name}`}
                      >
                        { }
                        <img
                          src={p}
                          alt={`Foto ${pi + 1} de ${r.name}`}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </article>
            ))}
          </div>

          {/* Pagination */}
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3 border-t border-[#e6ded4] pt-5">
            <span className="text-xs text-[#83766d]">A mostrar 1–5 de 220</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled
                className="rounded-md border border-[#d9cec2] px-3 py-2 text-xs font-semibold opacity-35"
              >
                Anterior
              </button>
              <span className="min-w-20 text-center text-xs font-semibold">
                Página 1 de 44
              </span>
              <button
                type="button"
                className="rounded-md border border-[#d9cec2] px-3 py-2 text-xs font-semibold transition hover:bg-[#efe7de]"
              >
                Seguinte
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox */}
      <Dialog open={!!lightbox} onOpenChange={(v) => !v && setLightbox(null)}>
        <DialogPortal>
          <DialogOverlay className="bg-black/80" />
          <DialogContent
            showCloseButton={false}
            className="grid w-full max-w-3xl place-items-center overflow-hidden rounded-2xl border-none bg-transparent p-0 shadow-none"
          >
            <button
              type="button"
              aria-label="Fechar"
              onClick={() => setLightbox(null)}
              className="absolute -top-2 right-0 grid h-10 w-10 translate-y-0 place-items-center rounded-full bg-white/90 text-[#201a17] shadow transition hover:bg-white sm:-top-12 sm:right-0"
            >
              <X className="h-5 w-5" />
            </button>
            {lightbox?.isVideo ? (
              <video
                ref={videoRef}
                src={lightbox.src}
                poster="/pt/videos/reviews/customer-review-09-poster.webp"
                className="max-h-[80vh] w-auto max-w-full rounded-lg object-contain"
                controls
                playsInline
                autoPlay
                aria-label={lightbox.alt}
              />
            ) : (
              lightbox && (
                 
                <img
                  src={lightbox.src}
                  alt={lightbox.alt}
                  className="max-h-[80vh] w-auto max-w-full rounded-lg object-contain"
                />
              )
            )}
          </DialogContent>
        </DialogPortal>
      </Dialog>
    </section>
  );
}

