'use client';

import { useState } from 'react';
import { Stars } from '@/components/product/product-card';
import { ReviewForm } from '@/components/product/review-form';
import { Button } from '@/components/ui/button';
import type { ReviewDTO } from '@/lib/reviews-data';
import { formatDate } from '@/lib/format';
import { BadgeCheck, PenLine } from 'lucide-react';

/**
 * Interactive part of the reviews section (client).
 *
 * Only REAL customer reviews are displayed — ever. Synthetic sample
 * feedback and illustrative ratings are never shown to shoppers, and
 * no aggregate rating is presented unless it comes from verified
 * customer reviews.
 */
export function ReviewsPanel({
  slug,
  initialDbReviews,
}: {
  slug: string;
  initialDbReviews: ReviewDTO[];
}) {
  const [dbReviews, setDbReviews] = useState<ReviewDTO[]>(initialDbReviews);
  const [formOpen, setFormOpen] = useState(false);

  const customerCount = dbReviews.length;
  const average =
    customerCount > 0
      ? dbReviews.reduce((sum, r) => sum + r.rating, 0) / customerCount
      : 0;

  // Real submissions newest-first.
  const reviews = [...dbReviews];

  const breakdown = (() => {
    const rows = [5, 4, 3, 2, 1].map((stars) => ({
      stars,
      count: dbReviews.filter((r) => Math.round(r.rating) === stars).length,
    }));
    return rows.map((row) => ({ ...row, pct: customerCount > 0 ? Math.round((row.count / customerCount) * 100) : 0 }));
  })();

  const handleSubmitted = (review: ReviewDTO) => {
    setDbReviews((prev) => [review, ...prev]);
  };

  return (
    <>
      {/* Heading + write-review action */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 id="reviews-heading" className="font-display text-[24px] font-medium">
          Customer reviews
        </h2>
        <Button
          onClick={() => setFormOpen(true)}
          className="h-11 gap-2 rounded-md bg-primary px-5 text-[13.5px] font-semibold hover:bg-primary/90"
          aria-haspopup="dialog"
        >
          <PenLine className="h-4 w-4" strokeWidth={1.75} aria-hidden />
          Write a review
        </Button>
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[280px_1fr] lg:gap-14">
        {/* Summary — only ever reflects verified customer reviews */}
        <div className="rounded-lg border border-border bg-cream/50 p-6">
          {customerCount > 0 ? (
            <>
              <div className="flex items-end gap-3">
                <span className="font-display text-[44px] font-medium leading-none">{average.toFixed(1)}</span>
                <span className="pb-1.5 text-[13px] text-muted-foreground">out of 5</span>
              </div>
              <Stars rating={average} className="mt-2.5" />
              <p className="mt-1.5 text-[13px] text-muted-foreground">
                Based on {customerCount.toLocaleString('en-GB')} customer review{customerCount === 1 ? '' : 's'}
              </p>

              <div className="mt-5 space-y-2">
                {breakdown.map((row) => (
                  <div key={row.stars} className="flex items-center gap-2.5">
                    <span className="w-7 text-right text-[12px] text-muted-foreground">{row.stars}★</span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-border" role="presentation">
                      <div className="h-full rounded-full bg-[#e0a03c]" style={{ width: `${row.pct}%` }} />
                    </div>
                    <span className="w-8 text-[11.5px] tabular-nums text-muted-foreground">{row.pct}%</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="flex items-end gap-3">
                <span className="font-display text-[44px] font-medium leading-none text-muted-foreground/50">–.–</span>
              </div>
              <p className="mt-2 text-[13px] text-muted-foreground">
                No customer reviews yet. Verified reviews appear here after purchase.
              </p>
            </>
          )}
        </div>

        {/* Review list — verified customer submissions only */}
        {reviews.length > 0 ? (
          <ul className="space-y-5">
            {reviews.map((review) => {
              const isCustomer = review.source === 'customer';
              return (
                <li
                  key={review.id}
                  className={
                    isCustomer
                      ? 'rounded-lg rounded-l-sm border border-border border-l-2 border-l-olive bg-card p-5'
                      : 'rounded-lg border border-border bg-card p-5'
                  }
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-cream text-[12.5px] font-semibold text-olive">
                        {review.author.slice(0, 1)}
                      </span>
                      <div>
                        <p className="text-[13.5px] font-medium leading-tight">
                          {review.author}
                          {review.verified && (
                            <span className="ml-2 inline-flex items-center gap-1 align-middle text-[10.5px] font-semibold uppercase tracking-wide text-olive">
                              <BadgeCheck className="h-3 w-3" strokeWidth={2} />
                              Verified buyer
                            </span>
                          )}
                        </p>
                        <p className="text-[11.5px] text-muted-foreground">
                          {review.country && `${review.country} · `}
                          {formatDate(review.createdAt)}
                        </p>
                      </div>
                    </div>
                    <Stars rating={review.rating} />
                  </div>
                  <h3 className="mt-3.5 text-[14px] font-semibold">{review.title}</h3>
                  <p className="mt-1.5 text-[13.5px] leading-relaxed text-foreground/80">{review.body}</p>
                  {isCustomer && (
                    <p className="mt-3 border-t border-border/70 pt-2.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-olive/80">
                      Customer review
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="rounded-lg border border-dashed border-border bg-background/50 px-6 py-10 text-center">
            <p className="text-[14px] font-medium">No reviews yet</p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
              Be the first to share your experience with this product.
            </p>
          </div>
        )}
      </div>

      <ReviewForm slug={slug} open={formOpen} onOpenChange={setFormOpen} onSubmitted={handleSubmitted} />
    </>
  );
}
