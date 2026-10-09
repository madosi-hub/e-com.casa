'use client';

import { useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';

const VIDEOS = [
  { id: '01', title: 'Alinhar e colocar', description: 'Veja o posicionamento e o alinhamento dos painéis na parede.', duration: '0:24' },
  { id: '02', title: 'Aplicar com cola', description: 'Uma demonstração da aplicação de cola e da colocação do painel.', duration: '0:11' },
  { id: '03', title: 'Fixar com parafusos', description: 'Veja uma alternativa de fixação mecânica entre as ripas.', duration: '0:08' },
];

export function PanelInstallationVideos() {
  const carouselRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const [failedIndex, setFailedIndex] = useState<number | null>(null);

  const updateActiveIndex = () => {
    const carousel = carouselRef.current;
    if (!carousel) return;
    const maxScroll = carousel.scrollWidth - carousel.clientWidth;
    const distances = Array.from(carousel.children, (card) => Math.abs(Math.min((card as HTMLElement).offsetLeft, maxScroll) - carousel.scrollLeft));
    const index = distances.indexOf(Math.min(...distances));
    // Pause a video when its card is swiped out of view on mobile.
    if (maxScroll > 0) videoRefs.current.forEach((video, videoIndex) => {
      if (videoIndex !== index) video?.pause();
    });
  };

  return (
    <section id="instalacao" aria-labelledby="installation-title" className="scroll-mt-20 px-4 py-10 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-[.18em] text-[#8a5a2b]">Instale com confiança</p>
          <h2 id="installation-title" className="mt-3 font-display text-4xl leading-tight sm:text-5xl">Fácil de instalar.<span className="block">Veja como se faz.</span></h2>
          <p className="mt-4 text-base leading-7 text-[#5c5049]">Antes de começar, veja como alinhar e fixar os painéis, com cola ou parafusos. Pode colocar o vídeo em pausa e rever cada passo, ao seu ritmo.</p>
        </div>

        <div ref={carouselRef} id="installation-videos" onScroll={updateActiveIndex} role="region" aria-label="Vídeos de instalação" tabIndex={0} className="relative mt-7 flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain rounded-2xl pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden focus-visible:outline-2 focus-visible:outline-[#8a5a2b] lg:grid lg:grid-cols-3 lg:overflow-visible">
          {VIDEOS.map((item, index) => (
            <article key={item.id} className="w-[84%] max-w-[340px] shrink-0 snap-start overflow-hidden rounded-2xl border border-[#dfd4c8] bg-[#fffcf8] lg:w-auto lg:max-w-none">
              <div className="relative aspect-[9/16] bg-[#201a17]">
                <video
                  ref={(element) => { videoRefs.current[index] = element; }}
                  src={`/pt/videos/installation/installation-${item.id}.mp4?v=2`}
                  poster={`/pt/videos/installation/installation-${item.id}.webp?v=2`}
                  aria-label={item.title}
                  className="h-full w-full object-contain"
                  width={720}
                  height={1280}
                  preload="none"
                  playsInline
                  muted
                  controls={false}
                  disablePictureInPicture
                  disableRemotePlayback
                  onPlay={() => {
                    setFailedIndex(null);
                    setPlayingIndex(index);
                    videoRefs.current.forEach((video, videoIndex) => { if (videoIndex !== index) video?.pause(); });
                  }}
                  onPause={() => setPlayingIndex((current) => current === index ? null : current)}
                  onEnded={() => setPlayingIndex((current) => current === index ? null : current)}
                  onError={() => setFailedIndex(index)}
                >O seu navegador não suporta este vídeo.</video>
                  <button type="button" aria-label={`${playingIndex === index ? 'Colocar em pausa' : 'Reproduzir'}: ${item.title}`} onClick={() => {
                    const video = videoRefs.current[index];
                    if (!video) return;
                    if (video.paused) void video.play().catch(() => setFailedIndex(index));
                    else video.pause();
                  }} className={`absolute flex items-center justify-center transition focus-visible:outline-4 focus-visible:outline-white ${playingIndex === index ? 'bottom-4 right-4 h-11 w-11 rounded-full bg-white/95 shadow-lg' : 'inset-0 bg-black/10 hover:bg-black/20 focus-visible:-outline-offset-4'}`}>
                    {playingIndex === index ? <Pause className="h-5 w-5 fill-current" aria-hidden="true" /> : <span className="grid h-16 w-16 place-items-center rounded-full bg-white/95 text-[#201a17] shadow-lg"><Play className="ml-1 h-6 w-6 fill-current" aria-hidden="true" /></span>}
                  </button>
              </div>
              <div className="p-5">
                <h3 className="text-lg font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#5c5049]">{item.description}</p>
                {failedIndex === index && <p role="alert" className="mt-2 text-sm text-[#8a3b22]">Não foi possível reproduzir. <a className="underline" href={`/pt/videos/installation/installation-${item.id}.mp4?v=2`}>Abrir vídeo</a></p>}
              </div>
            </article>
          ))}
        </div>

      </div>
    </section>
  );
}
