import { ReviewsPanel } from '@/components/product/reviews-panel';
import type { ReviewDTO } from '@/lib/reviews-data';

/**
 * Server shell for the reviews section. Only verified customer
 * reviews are rendered — synthetic sample content and illustrative
 * ratings never reach shoppers.
 */
export function ReviewsSection({
  slug,
  dbReviews = [],
}: {
  slug: string;
  dbReviews?: ReviewDTO[];
}) {
  return (
    <section aria-labelledby="reviews-heading" className="mt-16 border-t border-border pt-12">
      <ReviewsPanel slug={slug} initialDbReviews={dbReviews} />
    </section>
  );
}
