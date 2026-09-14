// Reviews shared types
// Only verified customer reviews are displayed anywhere on the
// storefront. The former synthetic "sample feedback" generator
// was removed — the reviews UI renders exclusively real
// submissions (see ReviewsPanel).

/** Normalised review shape used across the reviews UI. */
export interface ReviewDTO {
  id: string;
  author: string;
  country: string;
  rating: number;
  title: string;
  body: string;
  verified: boolean;
  createdAt: string; // ISO date string
  source: 'customer';
}
