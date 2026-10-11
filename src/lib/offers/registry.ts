import type { OfferConfig } from './types';
import { painelRipadoOffer } from '@/data/offers/painel-ripado';
import { fadoTableLampOffer } from '@/data/offers/fado-table-lamp';

const OFFERS: Record<string, OfferConfig> = {
  [painelRipadoOffer.slug]: painelRipadoOffer,
  [fadoTableLampOffer.slug]: fadoTableLampOffer,
};

export function getOfferConfig(slug: string): OfferConfig | null {
  return OFFERS[slug] ?? null;
}

export function getOfferSlugs(): string[] {
  return Object.keys(OFFERS);
}
