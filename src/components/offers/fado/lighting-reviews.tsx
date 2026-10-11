'use client';

import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { BadgeCheck, PenLine, Star } from 'lucide-react';
import type { ReviewDTO } from '@/lib/reviews-data';
import styles from './lighting-reviews.module.css';

function Stars({ value }: { value: number }) {
  return <span className={styles.stars} aria-label={`${value.toFixed(1).replace('.', ',')} de 5 estrelas`}>{[1, 2, 3, 4, 5].map(star => <Star key={star} size={15} fill={star <= Math.round(value) ? 'currentColor' : 'none'} aria-hidden="true" />)}</span>;
}

export function LightingReviews({ slug }: { slug: string }) {
  const [reviews, setReviews] = useState<ReviewDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [ratingFilter, setRatingFilter] = useState(0);
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const average = reviews.length ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : null;
  const filtered = reviews.filter(review => !ratingFilter || review.rating === ratingFilter);
  const pageCount = Math.max(1, Math.ceil(filtered.length / 5));
  const currentPage = Math.min(page, pageCount);
  const visible = filtered.slice((currentPage - 1) * 5, currentPage * 5);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setLoadError(false);
    setReviews([]);
    setPage(1);
    setRatingFilter(0);
    async function load() {
      try {
        const response = await fetch(`/api/reviews?slug=${encodeURIComponent(slug)}`, { signal: controller.signal });
        if (!response.ok) throw new Error('Reviews unavailable');
        const data = await response.json();
        if (!controller.signal.aborted) setReviews(Array.isArray(data.reviews) ? data.reviews.filter((review: ReviewDTO) => review.verified && Number.isInteger(review.rating) && review.rating >= 1 && review.rating <= 5) : []);
      } catch {
        if (!controller.signal.aborted) setLoadError(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [slug, refresh]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    const form = event.currentTarget;
    const fields = new FormData(form);
    setSubmitting(true);
    setMessage('');
    try {
      const response = await fetch('/api/reviews', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, author: fields.get('author'), email: fields.get('email'), country: fields.get('country'), rating: Number(fields.get('rating')), title: fields.get('title'), body: fields.get('body') }),
      });
      const data = await response.json();
      if (!response.ok || !data.review) throw new Error('Submission unavailable');
      if (data.review.verified) {
        setReviews(previous => [{ ...data.review, source: 'customer' }, ...previous]);
        setLoadError(false);
        setRatingFilter(0);
        setPage(1);
      }
      setMessage(data.review.verified ? 'Obrigado! A sua avaliação foi publicada.' : 'Obrigado! Recebemos a sua avaliação. A compra precisa de ser confirmada para a avaliação aparecer aqui.');
      form.reset();
      setFormOpen(false);
    } catch {
      setMessage('Não foi possível enviar a avaliação. Tente novamente dentro de alguns instantes.');
    } finally {
      setSubmitting(false);
    }
  }

  return <section id="avaliacoes" className={styles.section} aria-labelledby="lighting-reviews-title">
    <div className={styles.heading}><h2 id="lighting-reviews-title">Avaliações de clientes</h2><button type="button" onClick={() => { setFormOpen(open => !open); setMessage(''); }} aria-expanded={formOpen} aria-controls="lighting-review-form"><PenLine size={15} />{formOpen ? 'Fechar' : 'Avaliar'}</button></div>
    {average !== null && <div className={styles.summary}><strong>{average.toFixed(1).replace('.', ',')}</strong><div><Stars value={average} /><p>{reviews.length} {reviews.length === 1 ? 'avaliação' : 'avaliações'} · compras verificadas</p></div></div>}
    {reviews.length > 0 && <div className={styles.filters} aria-label="Filtrar avaliações">{[0, 5, 4, 3, 2, 1].map(rating => <button key={rating} type="button" aria-pressed={ratingFilter === rating} onClick={() => { setRatingFilter(rating); setPage(1); }}>{rating ? `${rating} estrelas` : 'Todas'} ({rating ? reviews.filter(review => review.rating === rating).length : reviews.length})</button>)}</div>}
    {message && <p role="status" className={styles.message}>{message}</p>}
    {formOpen && <form id="lighting-review-form" className={styles.form} onSubmit={submit}>
      <label>Classificação<select name="rating" required defaultValue=""><option value="" disabled>Escolha de 1 a 5 estrelas</option>{[5, 4, 3, 2, 1].map(rating => <option key={rating} value={rating}>{rating} {rating === 1 ? 'estrela' : 'estrelas'}</option>)}</select></label>
      <label>Nome<input name="author" autoComplete="name" required minLength={2} maxLength={40} /></label>
      <label>Email da encomenda<input name="email" type="email" autoComplete="email" maxLength={120} required /><small>Usado para confirmar a compra. Não será publicado.</small></label>
      <label>Localidade ou país<input name="country" defaultValue="Portugal" maxLength={40} /></label>
      <label className={styles.wide}>Título<input name="title" maxLength={80} /></label>
      <label className={styles.wide}>A sua experiência<textarea name="body" rows={4} required minLength={10} maxLength={1000} /></label>
      <button type="submit" disabled={submitting} className={styles.submit}>{submitting ? 'A enviar…' : 'Enviar avaliação'}</button>
    </form>}
    <div className={styles.list} aria-busy={loading}>
      {loading ? <p className={styles.empty} role="status">A carregar avaliações…</p> : loadError && reviews.length === 0 ? <div className={styles.empty}><p>Não foi possível carregar as avaliações.</p><button type="button" onClick={() => setRefresh(value => value + 1)}>Tentar novamente</button></div> : visible.length === 0 ? <p className={styles.empty}>{reviews.length ? 'Sem avaliações com esta classificação.' : 'Ainda não há avaliações publicadas. Partilhe a sua experiência com este produto.'}</p> : visible.map(review => <article key={review.id} className={styles.review}>
        <div className={styles.reviewMeta}><Stars value={review.rating} /><strong>{review.author}</strong><span className={styles.verified}><BadgeCheck size={14} />Compra verificada</span></div>
        <p className={styles.date}>{review.country}{review.country && ' · '}{new Intl.DateTimeFormat('pt-PT', { dateStyle: 'medium', timeZone: 'America/Sao_Paulo' }).format(new Date(review.createdAt))}</p>
        {review.title && <h3>{review.title}</h3>}<p>{review.body}</p>
      </article>)}
    </div>
    {filtered.length > 5 && <div className={styles.pagination}><button type="button" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Anterior</button><span>{currentPage} / {pageCount}</span><button type="button" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)}>Seguinte</button></div>}
  </section>;
}
