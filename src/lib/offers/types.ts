export type OfferReviewMode = 'verified' | 'demo' | 'none';
export type OfferLanguage = 'en' | 'pt' | 'fr' | 'de' | 'es' | 'it' | 'nl';

export interface OfferBenefit {
  title: string;
  body: string;
}

export interface OfferFAQItem {
  question: string;
  answer: string;
}

export interface OfferInstallationStep {
  title: string;
  body: string;
}

export interface OfferReviewItem {
  author: string;
  location?: string;
  date?: string;
  rating: number;
  body: string;
  image?: string;
  verified?: boolean;
}

export interface OfferReviewConfig {
  mode: OfferReviewMode;
  rating?: number;
  count?: number;
  satisfactionCopy?: string;
  reviews?: OfferReviewItem[];
}

export interface OfferMediaItem {
  type: 'video';
  src: string;
  poster?: string;
  label?: string;
  /** Human-readable source/rights note shown with editorial stock media. */
  attribution?: string;
  /** Use when the clip is mood/reference media rather than footage of the exact SKU. */
  disclaimer?: string;
}

export interface OfferTranslation {
  announcement?: string;
  eyebrow?: string;
  headline?: string;
  subheadline?: string;
  valueProposition?: { title: string; body: string };
  transformation?: { title: string; body: string };
  finalCta?: { title: string; body: string; button: string };
  seo?: { title: string; description: string };
}

export interface OfferMarketContext {
  countryCode: string;
  countryName: string;
  locale: string;
  currency: string;
  language: OfferLanguage;
}

export interface OfferConfig {
  slug: string;
  productSlug: string;
  markets?: string[];
  announcement: string;
  eyebrow: string;
  headline: string;
  subheadline: string;
  valueProposition: {
    title: string;
    body: string;
  };
  transformation: {
    title: string;
    body: string;
    image?: string;
  };
  beforeAfter?: {
    title: string;
    beforeImage: string;
    afterImage: string;
    beforeLabel?: string;
    afterLabel?: string;
  };
  benefits: OfferBenefit[];
  why: {
    title: string;
    body: string;
    points: string[];
  };
  installation: OfferInstallationStep[];
  inspirationImages?: string[];
  media?: OfferMediaItem[];
  translations?: Partial<Record<OfferLanguage, OfferTranslation>>;
  reviews: OfferReviewConfig;
  faqs: OfferFAQItem[];
  finalCta: {
    title: string;
    body: string;
    button: string;
  };
  seo: {
    title: string;
    description: string;
  };
}
