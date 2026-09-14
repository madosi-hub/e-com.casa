import type { OfferConfig } from './types';
import { painelRipadoOffer } from '@/data/offers/painel-ripado';

const OFFERS: Record<string, OfferConfig> = {
  [painelRipadoOffer.slug]: painelRipadoOffer,
};

export function getOfferConfig(slug: string): OfferConfig | null {
  return OFFERS[slug] ?? null;
}

export function getOfferSlugs(): string[] {
  return Object.keys(OFFERS);
}
