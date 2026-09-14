'use client';

import { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BadgeCheck, CheckCircle2, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { ReviewDTO } from '@/lib/reviews-data';
import { cn } from '@/lib/utils';

const BODY_MIN = 10;
const BODY_MAX = 1000;
const AUTHOR_MAX = 40;
const TITLE_MAX = 80;
const COUNTRY_MAX = 40;

type FieldErrors = Partial<Record<'rating' | 'title' | 'body' | 'author' | 'country' | 'email', string>>;

interface ReviewFormProps {
  slug: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the created review so the parent can prepend it to the visible list. */
  onSubmitted: (review: ReviewDTO) => void;
}

const EMPTY_FIELDS = { rating: 0, title: '', body: '', author: '', country: '', email: '' };

export function ReviewForm({ slug, open, onOpenChange, onSubmitted }: ReviewFormProps) {
  const [fields, setFields] = useState(EMPTY_FIELDS);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<ReviewDTO | null>(null);
  const [hoveredStar, setHoveredStar] = useState(0);
  const starRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const setField = <K extends keyof typeof EMPTY_FIELDS>(key: K, value: (typeof EMPTY_FIELDS)[K]) => {
    setFields((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  };

  const resetForm = () => {
    setFields(EMPTY_FIELDS);
    setFieldErrors({});
    setFormError('');
    setSubmitting(false);
    setSuccess(null);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) resetForm();
    onOpenChange(next);
  };

  const validate = (): FieldErrors => {
    const errors: FieldErrors = {};
    if (fields.rating < 1 || fields.rating > 5) errors.rating = 'Please choose a star rating.';
    const author = fields.author.trim();
    if (author.length < 2 || author.length > AUTHOR_MAX) {
      errors.author = `Please enter a name between 2 and ${AUTHOR_MAX} characters.`;
    }
    const body = fields.body.trim();
    if (body.length < BODY_MIN || body.length > BODY_MAX) {
      errors.body = `Your review should be between ${BODY_MIN} and ${BODY_MAX} characters.`;
    }
    if (fields.title.trim().length > TITLE_MAX) errors.title = `Title must be ${TITLE_MAX} characters or fewer.`;
    if (fields.country.trim().length > COUNTRY_MAX) errors.country = `Country must be ${COUNTRY_MAX} characters or fewer.`;
    const email = fields.email.trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      errors.email = 'Please enter a valid email address, or leave the field empty.';
    }
    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setFormError('Please review the highlighted fields below.');
      return;
    }

    setSubmitting(true);
    setFormError('');
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          author: fields.author.trim(),
          country: fields.country.trim(),
          rating: fields.rating,
          title: fields.title.trim(),
          body: fields.body.trim(),
          email: fields.email.trim() || undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        review?: ReviewDTO;
        error?: string;
        fieldErrors?: FieldErrors;
      };

      if (res.ok && data.review) {
        setSuccess(data.review);
        onSubmitted(data.review);
        return;
      }

      if (res.status === 400 && data.fieldErrors) {
        setFieldErrors(data.fieldErrors);
        setFormError(data.error ?? 'Please review the highlighted fields below.');
      } else {
        setFormError(data.error ?? 'Something went wrong saving your review. Please try again.');
      }
    } catch {
      setFormError('Something went wrong saving your review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStarKeyDown = (e: React.KeyboardEvent, index: number) => {
    let next: number;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') next = Math.min(5, index + 1);
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') next = Math.max(1, index - 1);
    else if (e.key === 'Home') next = 1;
    else if (e.key === 'End') next = 5;
    else return;
    e.preventDefault();
    setField('rating', next);
    starRefs.current[next - 1]?.focus();
  };

  const bodyLength = fields.body.trim().length;
  const nearLimit = fields.body.length >= BODY_MAX - 100;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[85vh] gap-0 overflow-y-auto p-6 sm:max-w-lg">
        <AnimatePresence mode="wait">
          {success ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="flex flex-col items-center py-8 text-center"
              role="status"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-olive/15">
                <CheckCircle2 className="h-7 w-7 text-olive" strokeWidth={1.75} />
              </span>
              <h2 className="mt-5 font-display text-[22px] font-medium">Thanks — your review is live.</h2>
              <p className="mt-2 max-w-[36ch] text-[13.5px] leading-relaxed text-muted-foreground">
                It has been added to the customer reviews for this product and is visible to everyone.
              </p>
              {success.verified && (
                <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-olive/10 px-3.5 py-1.5 text-[12px] font-semibold text-olive">
                  <BadgeCheck className="h-3.5 w-3.5" strokeWidth={2} />
                  Your purchase was confirmed — marked as Verified buyer
                </p>
              )}
              <Button
                onClick={() => handleOpenChange(false)}
                className="mt-6 h-11 min-w-[160px] rounded-md bg-primary font-medium hover:bg-primary/90"
              >
                Done
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              <DialogHeader>
                <DialogTitle className="font-display text-[22px] font-medium">Write a review</DialogTitle>
                <DialogDescription className="mt-1 text-[13.5px] leading-relaxed">
                  Share your experience to help other customers. Reviews appear under your first name and country.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit} noValidate className="mt-5 space-y-5">
                {/* Rating */}
                <div>
                  <Label className="text-[12px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                    Your rating <span className="text-terracotta">*</span>
                  </Label>
                  <div
                    role="radiogroup"
                    aria-label="Your rating"
                    aria-required="true"
                    aria-invalid={Boolean(fieldErrors.rating)}
                    aria-describedby={fieldErrors.rating ? 'review-rating-error' : undefined}
                    className="mt-1.5 flex items-center gap-0.5"
                    onMouseLeave={() => setHoveredStar(0)}
                  >
                    {[1, 2, 3, 4, 5].map((i) => {
                      const filled = i <= (hoveredStar || fields.rating);
                      return (
                        <button
                          key={i}
                          ref={(el) => {
                            starRefs.current[i - 1] = el;
                          }}
                          type="button"
                          role="radio"
                          aria-checked={fields.rating === i}
                          aria-label={`${i} star${i > 1 ? 's' : ''}`}
                          tabIndex={fields.rating === i || (fields.rating === 0 && i === 1) ? 0 : -1}
                          onClick={() => setField('rating', i)}
                          onMouseEnter={() => setHoveredStar(i)}
                          onFocus={() => setHoveredStar(i)}
                          onBlur={() => setHoveredStar(0)}
                          onKeyDown={(e) => handleStarKeyDown(e, i)}
                          className="flex h-11 w-11 items-center justify-center rounded-md outline-none transition-transform focus-visible:ring-[3px] focus-visible:ring-ring/50 hover:scale-110"
                        >
                          <svg
                            viewBox="0 0 20 20"
                            className="h-7 w-7 transition-colors duration-150"
                            fill={filled ? 'var(--amber-star)' : 'none'}
                            stroke={filled ? 'var(--amber-star)' : '#c9c2b4'}
                            strokeWidth="1.4"
                            aria-hidden
                          >
                            <path
                              d="M10 1.8l2.35 4.9 5.15.68-3.8 3.62.95 5.2L10 13.7l-4.65 2.5.95-5.2L2.5 7.38l5.15-.68L10 1.8z"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </button>
                      );
                    })}
                    {fields.rating > 0 && (
                      <span className="ml-2 text-[12.5px] text-muted-foreground" aria-hidden>
                        {fields.rating} / 5
                      </span>
                    )}
                  </div>
                  {fieldErrors.rating && (
                    <p id="review-rating-error" className="mt-1.5 text-[12.5px] text-terracotta">
                      {fieldErrors.rating}
                    </p>
                  )}
                </div>

                {/* Title */}
                <div>
                  <Label htmlFor="review-title" className="text-[12px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                    Title <span className="font-normal normal-case tracking-normal">(optional)</span>
                  </Label>
                  <Input
                    id="review-title"
                    value={fields.title}
                    onChange={(e) => setField('title', e.target.value.slice(0, TITLE_MAX))}
                    maxLength={TITLE_MAX}
                    placeholder="Sum it up in a few words"
                    className="mt-1.5 min-h-11 rounded-md border-border bg-card"
                    aria-invalid={Boolean(fieldErrors.title)}
                  />
                  {fieldErrors.title && <p className="mt-1.5 text-[12.5px] text-terracotta">{fieldErrors.title}</p>}
                </div>

                {/* Body */}
                <div>
                  <div className="flex items-baseline justify-between">
                    <Label htmlFor="review-body" className="text-[12px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                      Your review <span className="text-terracotta">*</span>
                    </Label>
                    <span
                      className={cn(
                        'text-[11.5px] tabular-nums',
                        nearLimit ? 'text-terracotta' : 'text-muted-foreground',
                      )}
                      aria-hidden
                    >
                      {fields.body.length}/{BODY_MAX}
                    </span>
                  </div>
                  <Textarea
                    id="review-body"
                    value={fields.body}
                    onChange={(e) => setField('body', e.target.value.slice(0, BODY_MAX))}
                    rows={5}
                    required
                    placeholder="What did you like? How is the quality, finish, delivery?"
                    className={cn(
                      'mt-1.5 rounded-md border-border bg-card',
                      fieldErrors.body && 'border-terracotta focus-visible:ring-terracotta/30',
                    )}
                    aria-invalid={Boolean(fieldErrors.body)}
                    aria-describedby={fieldErrors.body ? 'review-body-error' : undefined}
                  />
                  {fieldErrors.body ? (
                    <p id="review-body-error" className="mt-1.5 text-[12.5px] text-terracotta">
                      {fieldErrors.body}
                    </p>
                  ) : (
                    bodyLength > 0 &&
                    bodyLength < BODY_MIN && (
                      <p className="mt-1.5 text-[12px] text-muted-foreground">
                        {BODY_MIN - bodyLength} more character{BODY_MIN - bodyLength === 1 ? '' : 's'} needed
                      </p>
                    )
                  )}
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  {/* Author */}
                  <div>
                    <Label htmlFor="review-author" className="text-[12px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                      Your name <span className="text-terracotta">*</span>
                    </Label>
                    <Input
                      id="review-author"
                      value={fields.author}
                      onChange={(e) => setField('author', e.target.value.slice(0, AUTHOR_MAX))}
                      maxLength={AUTHOR_MAX}
                      required
                      placeholder="e.g. Sofia M."
                      autoComplete="name"
                      className={cn(
                        'mt-1.5 min-h-11 rounded-md border-border bg-card',
                        fieldErrors.author && 'border-terracotta focus-visible:ring-terracotta/30',
                      )}
                      aria-invalid={Boolean(fieldErrors.author)}
                      aria-describedby={fieldErrors.author ? 'review-author-error' : undefined}
                    />
                    {fieldErrors.author && (
                      <p id="review-author-error" className="mt-1.5 text-[12.5px] text-terracotta">
                        {fieldErrors.author}
                      </p>
                    )}
                  </div>

                  {/* Country */}
                  <div>
                    <Label htmlFor="review-country" className="text-[12px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                      Country <span className="font-normal normal-case tracking-normal">(optional)</span>
                    </Label>
                    <Input
                      id="review-country"
                      value={fields.country}
                      onChange={(e) => setField('country', e.target.value.slice(0, COUNTRY_MAX))}
                      maxLength={COUNTRY_MAX}
                      placeholder="e.g. Portugal"
                      autoComplete="country-name"
                      className="mt-1.5 min-h-11 rounded-md border-border bg-card"
                      aria-invalid={Boolean(fieldErrors.country)}
                    />
                    {fieldErrors.country && (
                      <p className="mt-1.5 text-[12.5px] text-terracotta">{fieldErrors.country}</p>
                    )}
                  </div>
                </div>

                {/* Email — optional, powers verified-buyer badge */}
                <div>
                  <Label htmlFor="review-email" className="text-[12px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                    Email used at checkout{' '}
                    <span className="font-normal normal-case tracking-normal">(optional)</span>
                  </Label>
                  <Input
                    id="review-email"
                    type="email"
                    value={fields.email}
                    onChange={(e) => setField('email', e.target.value.slice(0, 120))}
                    maxLength={120}
                    placeholder="you@example.com"
                    autoComplete="email"
                    className={cn(
                      'mt-1.5 min-h-11 rounded-md border-border bg-card',
                      fieldErrors.email && 'border-terracotta focus-visible:ring-terracotta/30',
                    )}
                    aria-invalid={Boolean(fieldErrors.email)}
                    aria-describedby={fieldErrors.email ? 'review-email-error' : 'review-email-hint'}
                  />
                  {fieldErrors.email ? (
                    <p id="review-email-error" className="mt-1.5 text-[12.5px] text-terracotta">
                      {fieldErrors.email}
                    </p>
                  ) : (
                    <p id="review-email-hint" className="mt-1.5 flex items-start gap-1.5 text-[11.5px] leading-relaxed text-muted-foreground">
                      <BadgeCheck className="mt-0.5 h-3 w-3 shrink-0 text-olive" strokeWidth={2} />
                      Used only to confirm your purchase — never shown publicly. Reviews matching an order
                      earn the Verified buyer badge.
                    </p>
                  )}
                </div>

                {/* General error */}
                {formError && (
                  <div
                    role="alert"
                    className="rounded-md border border-terracotta/40 bg-terracotta/10 px-4 py-3 text-[13px] leading-relaxed text-terracotta"
                  >
                    {formError}
                  </div>
                )}

                <div className="flex flex-col-reverse gap-3 border-t border-border pt-4 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleOpenChange(false)}
                    disabled={submitting}
                    className="min-h-11 rounded-md border-border bg-card font-medium hover:bg-accent hover:text-accent-foreground sm:min-w-[110px]"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="min-h-11 rounded-md bg-primary font-semibold hover:bg-primary/90 sm:min-w-[170px]"
                  >
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                    {submitting ? 'Submitting…' : 'Submit review'}
                  </Button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
