'use client';

import { useRef, useState, type RefObject } from 'react';
import { Pause, Play } from 'lucide-react';

export function SilentVideo({ src, poster, label, className, videoClassName, videoRef, autoPlay = false, loop = false }: {
  src: string;
  poster?: string;
  label: string;
  className: string;
  videoClassName: string;
  videoRef?: RefObject<HTMLVideoElement | null>;
  autoPlay?: boolean;
  loop?: boolean;
}) {
  const internalRef = useRef<HTMLVideoElement>(null);
  const ref = videoRef ?? internalRef;
  const [playing, setPlaying] = useState(false);

  return <div className={`relative ${className}`}>
    <video ref={ref} src={src} poster={poster} aria-label={label} className={videoClassName} muted controls={false} autoPlay={autoPlay} loop={loop} playsInline disablePictureInPicture disableRemotePlayback preload="metadata" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} />
    <button type="button" aria-label={`${playing ? 'Pausar' : 'Reproduzir'}: ${label}`} onClick={() => {
      const video = ref.current;
      if (!video) return;
      if (video.paused) void video.play().catch(() => setPlaying(false));
      else video.pause();
    }} className="absolute bottom-3 left-3 z-20 grid h-11 w-11 place-items-center rounded-full bg-white/95 text-[#201a17] shadow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8a5a2b]">
      {playing ? <Pause className="h-5 w-5 fill-current" aria-hidden="true" /> : <Play className="ml-0.5 h-5 w-5 fill-current" aria-hidden="true" />}
    </button>
  </div>;
}
