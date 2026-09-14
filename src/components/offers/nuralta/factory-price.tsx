"use client";

import { useRef, useState } from "react";
import { Factory, ArrowRight, Play } from "lucide-react";

export function FactoryPrice() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  const toggle = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      const promise = v.play();
      if (promise) {
        promise
          .then(() => setPlaying(true))
          .catch(() => {
            // Autoplay with sound blocked — retry muted so the video still plays
            v.muted = true;
            v.play()
              .then(() => setPlaying(true))
              .catch(() => setPlaying(false));
          });
      }
    } else {
      v.pause();
      setPlaying(false);
    }
  };

  return (
    <section id="preco-fabrica" className="factory-price">
      <div className="factory-price__layout">
        <div className="factory-price__content">
          <p className="factory-price__eyebrow">
            <Factory className="h-4 w-4" />
            Nuralta · Fabrico próprio
          </p>
          <h2 className="belmonte-serif">
            Da nossa fábrica.
            <span>Para a sua casa.</span>
          </h2>
          <p className="factory-price__description">
            <strong>Fabricamos os painéis que vendemos.</strong>
          </p>
          <p className="factory-price__description">
            Compramos a matéria-prima diretamente aos fornecedores e produzimos
            nas nossas instalações, com a nossa equipa. Ao comprar na Nuralta,
            compra diretamente a quem fabrica.
          </p>

          <div className="factory-price__video-wrap">
            <video
              ref={videoRef}
              className="factory-price__video"
              src="/pt/videos/nuralta-hist.mp4"
              poster="/pt/videos/nuralta-hist-poster.webp"
              loop
              playsInline
              preload="metadata"
              aria-label="Vídeo da fábrica Nuralta"
              onClick={toggle}
            />
            <button
              type="button"
              aria-label={playing ? "Pausar vídeo" : "Reproduzir vídeo"}
              className={`factory-price__video-control ${playing ? "is-playing" : ""}`}
              onClick={toggle}
            >
              {playing ? (
                <span className="grid place-items-center">
                  <span className="flex h-3 w-2.5 items-center justify-center gap-0.5">
                    <span className="h-full w-1 bg-white" />
                    <span className="h-full w-1 bg-white" />
                  </span>
                </span>
              ) : (
                <Play className="h-5 w-5 translate-x-0.5" fill="currentColor" />
              )}
            </button>
          </div>

          <p className="factory-price__description factory-price__benefit">
            Menos etapas entre o fabrico e a sua casa. Um preço mais acessível
            para o seu projeto.
          </p>
        </div>

        <a href="#configurar-painel" className="factory-price__link">
          Escolher cor e tamanho
          <ArrowRight className="h-4 w-4" />
        </a>
      </div>
    </section>
  );
}

