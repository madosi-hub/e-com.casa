'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import type { TouchEvent } from 'react';
import { ChevronLeft, ChevronRight, Play, X } from 'lucide-react';
import styles from './page.module.css';

type GalleryPhoto = { src: string; alt: string; kind: string; poster?: string };

function GalleryMedia({ photo, expanded = false, playing = true, priority = false }: {
  photo: GalleryPhoto;
  expanded?: boolean;
  playing?: boolean;
  priority?: boolean;
}) {
  if (photo.kind === 'video' && playing) return <video
    key={photo.src}
    src={photo.src}
    poster={photo.poster}
    className={styles.galleryVideo}
    aria-label={photo.alt}
    autoPlay
    muted
    loop
    playsInline
    controls={false}
    disablePictureInPicture
    disableRemotePlayback
    controlsList="nodownload nofullscreen noremoteplayback"
    preload="none"
    tabIndex={-1}
    onContextMenu={event => event.preventDefault()}
  />;

  return <Image src={photo.kind === 'video' ? photo.poster! : photo.src} alt={photo.alt} fill preload={priority} draggable={false} sizes={expanded ? '100vw' : '(max-width: 900px) 100vw, 58vw'} className={expanded || photo.kind === 'video' || photo.kind === 'presentation' ? styles.presentationImage : photo.kind === 'scene' ? styles.lifestyleImage : styles.productImage} />;
}

export function LightingGallery({ photos, activeImage, onImageChange, name }: {
  photos: readonly GalleryPhoto[];
  activeImage: number;
  onImageChange: (index: number) => void;
  name: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [expanded, setExpanded] = useState(false);
  const suppressClickUntil = useRef(0);
  const swipeStart = useRef<{ id: number; x: number; y: number } | null>(null);
  const index = activeImage < photos.length ? activeImage : 0;
  const photo = photos[index];

  useEffect(() => {
    if (!expanded) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; };
  }, [expanded]);

  function openImage() {
    if (Date.now() < suppressClickUntil.current) return;
    dialog.current?.showModal();
    setExpanded(true);
  }

  function move(direction: number) {
    onImageChange((index + direction + photos.length) % photos.length);
  }

  function startSwipe(event: TouchEvent<HTMLDivElement>) {
    const touch = event.touches[0];
    swipeStart.current = event.touches.length === 1
      ? { id: touch.identifier, x: touch.clientX, y: touch.clientY }
      : null;
  }

  function endSwipe(event: TouchEvent<HTMLDivElement>) {
    const start = swipeStart.current;
    swipeStart.current = null;
    if (!start || event.touches.length > 0) return;
    const touch = Array.from(event.changedTouches).find(item => item.identifier === start.id);
    if (!touch) return;
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.abs(dx) > 8 || Math.abs(dy) > 8) suppressClickUntil.current = Date.now() + 400;
    if (Math.abs(dx) >= 40 && Math.abs(dx) > Math.abs(dy) * 1.3) move(dx < 0 ? 1 : -1);
  }

  const touchHandlers = {
    onTouchStart: startSwipe,
    onTouchEnd: endSwipe,
    onTouchCancel: () => { swipeStart.current = null; },
  };

  return <div className={styles.gallery}>
    <div className={styles.mainImage} {...touchHandlers}>
      <button type="button" className={styles.galleryOpen} aria-label={`Ampliar ${photo.kind === 'video' ? 'vídeo' : 'fotografia'} de ${name}`} onClick={openImage} onContextMenu={event => { if (photo.kind === 'video') event.preventDefault(); }}>
        <GalleryMedia photo={photo} playing={!expanded} priority={index === 0} />
      </button>
      <div className={styles.galleryControls}>
        <span aria-live="polite">{index + 1} <span>/ {photos.length}</span></span>
        {photos.length > 1 && <div><button type="button" aria-label="Imagem anterior" onClick={() => move(-1)}><ChevronLeft size={20} strokeWidth={1.5} /></button><button type="button" aria-label="Imagem seguinte" onClick={() => move(1)}><ChevronRight size={20} strokeWidth={1.5} /></button></div>}
      </div>
    </div>
    {photos.length > 1 && <div className={styles.galleryThumbnails} aria-label="Imagens e vídeos do produto">{photos.map((item, itemIndex) => <button key={item.src} type="button" aria-label={`Ver ${item.kind === 'video' ? 'vídeo' : 'fotografia'} ${itemIndex + 1} de ${photos.length}`} aria-pressed={index === itemIndex} onClick={() => onImageChange(itemIndex)}><Image src={item.kind === 'video' ? item.poster! : item.src} alt="" fill sizes="56px" className={item.kind === 'scene' ? styles.lifestyleImage : styles.presentationImage} />{item.kind === 'video' && <span className={styles.videoThumbnailIcon} aria-hidden="true"><Play size={18} fill="currentColor" /></span>}</button>)}</div>}
    <dialog ref={dialog} className={styles.zoomDialog} aria-label={`Galeria ampliada de ${name}`} onClose={() => setExpanded(false)} onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }} onKeyDown={event => { if (event.key === 'ArrowLeft') { event.preventDefault(); move(-1); } if (event.key === 'ArrowRight') { event.preventDefault(); move(1); } }}>
      <div className={styles.zoomContent}>
        <button type="button" aria-label="Fechar fotografia ampliada" onClick={() => dialog.current?.close()} className={styles.zoomClose}><X size={23} /></button>
        <div className={styles.zoomImage} {...touchHandlers} onContextMenu={event => { if (photo.kind === 'video') event.preventDefault(); }}><GalleryMedia photo={photo} expanded playing={expanded} /></div>
        {photos.length > 1 && <div className={styles.zoomControls}><button type="button" aria-label="Imagem anterior" onClick={() => move(-1)}><ChevronLeft size={22} /></button><p aria-live="polite">{index + 1} / {photos.length}</p><button type="button" aria-label="Imagem seguinte" onClick={() => move(1)}><ChevronRight size={22} /></button></div>}
      </div>
    </dialog>
  </div>;
}
