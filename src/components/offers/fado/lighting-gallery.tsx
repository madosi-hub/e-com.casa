'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import type { TouchEvent } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import styles from './page.module.css';

type GalleryPhoto = { src: string; alt: string; kind: string };

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
      <button type="button" className={styles.galleryOpen} aria-label={`Ampliar fotografia de ${name}`} onClick={openImage}>
        <Image src={photo.src} alt={photo.alt} fill preload={index === 0} draggable={false} sizes="(max-width: 900px) 100vw, 58vw" className={photo.kind === 'scene' ? styles.lifestyleImage : photo.kind === 'presentation' ? styles.presentationImage : styles.productImage} />
      </button>
      <div className={styles.galleryControls}>
        <span aria-live="polite">{index + 1} <span>/ {photos.length}</span></span>
        {photos.length > 1 && <div><button type="button" aria-label="Imagem anterior" onClick={() => move(-1)}><ChevronLeft size={20} strokeWidth={1.5} /></button><button type="button" aria-label="Imagem seguinte" onClick={() => move(1)}><ChevronRight size={20} strokeWidth={1.5} /></button></div>}
      </div>
    </div>
    {photos.length > 1 && <div className={styles.galleryThumbnails} aria-label="Fotografias do produto">{photos.map((item, itemIndex) => <button key={item.src} type="button" aria-label={`Ver fotografia ${itemIndex + 1} de ${photos.length}`} aria-pressed={index === itemIndex} onClick={() => onImageChange(itemIndex)}><Image src={item.src} alt="" fill sizes="56px" className={item.kind === 'scene' ? styles.lifestyleImage : styles.presentationImage} /></button>)}</div>}
    <dialog ref={dialog} className={styles.zoomDialog} aria-label={`Fotografia ampliada de ${name}`} onClose={() => setExpanded(false)} onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }} onKeyDown={event => { if (event.key === 'ArrowLeft') { event.preventDefault(); move(-1); } if (event.key === 'ArrowRight') { event.preventDefault(); move(1); } }}>
      <div className={styles.zoomContent}>
        <button type="button" aria-label="Fechar fotografia ampliada" onClick={() => dialog.current?.close()} className={styles.zoomClose}><X size={23} /></button>
        <div className={styles.zoomImage} {...touchHandlers}><Image src={photo.src} alt={photo.alt} fill draggable={false} sizes="100vw" className={styles.presentationImage} /></div>
        {photos.length > 1 && <div className={styles.zoomControls}><button type="button" aria-label="Imagem anterior" onClick={() => move(-1)}><ChevronLeft size={22} /></button><p aria-live="polite">{index + 1} / {photos.length}</p><button type="button" aria-label="Imagem seguinte" onClick={() => move(1)}><ChevronRight size={22} /></button></div>}
      </div>
    </dialog>
  </div>;
}
