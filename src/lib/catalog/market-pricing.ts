// E-com.casa — internal market benchmark layer for supplier-backed research products.
// IMPORTANT:
// - These values are merchandising benchmarks, not supplier cost or margin approval.
// - `EXACT` means the benchmark was based on the same identified product/model in EU retail listings.
// - `COMPARABLE` means exact multi-retailer coverage was not sufficient and a close category/material/size
// comparator basket was used. Low-confidence benchmarks must be refreshed before paid traffic.
// - Timed offers use absolute UTC timestamps and NEVER reset per visitor/session.
// - A market reference is not the product's legally relevant "previous price" for EU price-reduction rules.

export type MarketPriceConfidence = 'HIGH' | 'MEDIUM' | 'LOW';
export type MarketPriceBasis = 'EXACT' | 'COMPARABLE';

export interface MarketPricingBenchmark {
  sourceProductId: string;
  marketAverageCents: number;
  sampleCount: number;
  confidence: MarketPriceConfidence;
  basis: MarketPriceBasis;
  reviewedAt: string;
  sourceHosts: string[];
  highConversion: boolean;
  promoDiscountPct?: 30;
  promoEndsAt?: string;
}

// Campaign anchor: 2026-09-11 07:45 UTC. Ends are intentionally irregular and fixed.
// Once an end timestamp is reached the adapter reverts to the market benchmark price.
const BENCHMARKS: Record<string, MarketPricingBenchmark> = {
  '1246739': b('1246739', 15900, 4, 'LOW', 'COMPARABLE', ['biano.pt'], false),
  '1232130': b('1232130', 37974, 1, 'MEDIUM', 'EXACT', ['worten.pt'], false),
  '1025854': b('1025854', 20647, 1, 'MEDIUM', 'EXACT', ['worten.pt'], false),
  '1259669': promo('1259669', 6999, 4, 'LOW', 'COMPARABLE', ['biano.pt'], '2026-09-11T11:45:00.000Z'),
  '1202229': b('1202229', 8389, 2, 'MEDIUM', 'EXACT', ['worten.pt'], false),
  '1226391': b('1226391', 8999, 4, 'LOW', 'COMPARABLE', ['biano.pt'], false),
  '1114225': b('1114225', 7080, 2, 'MEDIUM', 'EXACT', ['worten.pt'], false),
  '1070503': b('1070503', 10999, 5, 'LOW', 'COMPARABLE', ['biano.pt'], false),

  '819352': promo('819352', 1280, 2, 'HIGH', 'EXACT', ['youlikeitstore.com', 'leroymerlin.pt'], '2026-09-11T09:15:00.000Z'),
  '820033': promo('820033', 1490, 3, 'MEDIUM', 'COMPARABLE', ['youlikeitstore.com', 'leroymerlin.pt'], '2026-09-11T21:45:00.000Z'),
  '1185723': promo('1185723', 3347, 2, 'MEDIUM', 'EXACT', ['worten.pt'], '2026-09-11T14:15:00.000Z'),
  '1121916': promo('1121916', 4332, 2, 'MEDIUM', 'EXACT', ['worten.pt'], '2026-09-11T18:45:00.000Z'),
  '982193': promo('982193', 5878, 2, 'MEDIUM', 'EXACT', ['worten.pt'], '2026-09-11T10:45:00.000Z'),
  '1116696': promo('1116696', 2075, 1, 'MEDIUM', 'EXACT', ['conforama.pt'], '2026-09-11T16:45:00.000Z'),

  '375318': promo('375318', 4678, 1, 'MEDIUM', 'EXACT', ['conforama.pt'], '2026-09-11T12:45:00.000Z'),
  '650235': b('650235', 21099, 1, 'MEDIUM', 'EXACT', ['omeujardim.pt'], false),
  '452137': promo('452137', 855, 2, 'HIGH', 'EXACT', ['tradeinn.com', 'pjf.com.pt'], '2026-09-11T09:45:00.000Z'),
  '1053488': b('1053488', 7990, 4, 'LOW', 'COMPARABLE', ['biano.pt'], false),
  '1250809': b('1250809', 13299, 4, 'LOW', 'COMPARABLE', ['biano.pt'], false),
  '1025864': b('1025864', 29900, 3, 'LOW', 'COMPARABLE', ['worten.pt', 'biano.pt'], false),
  '916973': b('916973', 14059, 3, 'LOW', 'COMPARABLE', ['biano.pt'], false),
  '411106': promo('411106', 8745, 2, 'LOW', 'COMPARABLE', ['biano.pt'], '2026-09-11T22:45:00.000Z'),
  '1254295': b('1254295', 12999, 3, 'LOW', 'COMPARABLE', ['biano.pt'], false),
  '834093': b('834093', 13999, 3, 'LOW', 'COMPARABLE', ['biano.pt'], false),
  '292590': b('292590', 16628, 2, 'MEDIUM', 'EXACT', ['worten.pt'], false),
  '560316': promo('560316', 5999, 3, 'LOW', 'COMPARABLE', ['leroymerlin.pt', 'biano.pt'], '2026-09-11T13:45:00.000Z'),
  '1116878': b('1116878', 14706, 3, 'LOW', 'COMPARABLE', ['biano.pt'], false),
  '635635': promo('635635', 7130, 1, 'MEDIUM', 'EXACT', ['nacloset.com'], '2026-09-11T19:45:00.000Z'),
  '635590': promo('635590', 4580, 1, 'MEDIUM', 'EXACT', ['nacloset.com'], '2026-09-11T17:15:00.000Z'),
};

function b(
  sourceProductId: string,
  marketAverageCents: number,
  sampleCount: number,
  confidence: MarketPriceConfidence,
  basis: MarketPriceBasis,
  sourceHosts: string[],
  highConversion: boolean,
): MarketPricingBenchmark {
  return {
    sourceProductId,
    marketAverageCents,
    sampleCount,
    confidence,
    basis,
    reviewedAt: '2026-09-11',
    sourceHosts,
    highConversion,
  };
}

function promo(
  sourceProductId: string,
  marketAverageCents: number,
  sampleCount: number,
  confidence: MarketPriceConfidence,
  basis: MarketPriceBasis,
  sourceHosts: string[],
  promoEndsAt: string,
): MarketPricingBenchmark {
  return {
    ...b(sourceProductId, marketAverageCents, sampleCount, confidence, basis, sourceHosts, true),
    promoDiscountPct: 30,
    promoEndsAt,
  };
}

export interface ResolvedMarketPricing {
  marketAverageCents: number;
  marketAverage: string;
  displayPriceCents: number;
  displayPrice: string;
  promoDiscountPct: number | null;
  promoEndsAt: string | null;
  promoActive: boolean;
  sampleCount: number;
  confidence: MarketPriceConfidence;
  basis: MarketPriceBasis;
  reviewedAt: string;
}

export function getMarketPricing(sourceProductId: string | null | undefined, now = new Date()): ResolvedMarketPricing | null {
  if (!sourceProductId) return null;
  const benchmark = BENCHMARKS[sourceProductId];
  if (!benchmark) return null;

  const promoActive = Boolean(
    benchmark.highConversion &&
      benchmark.promoDiscountPct === 30 &&
      benchmark.promoEndsAt &&
      new Date(benchmark.promoEndsAt).getTime() > now.getTime(),
  );
  const promoPriceCents = Math.round(benchmark.marketAverageCents * 0.7);
  const displayPriceCents = promoActive ? promoPriceCents : benchmark.marketAverageCents;

  return {
    marketAverageCents: benchmark.marketAverageCents,
    marketAverage: money(benchmark.marketAverageCents),
    displayPriceCents,
    displayPrice: money(displayPriceCents),
    promoDiscountPct: promoActive ? 30 : null,
    promoEndsAt: promoActive ? benchmark.promoEndsAt ?? null : null,
    promoActive,
    sampleCount: benchmark.sampleCount,
    confidence: benchmark.confidence,
    basis: benchmark.basis,
    reviewedAt: benchmark.reviewedAt,
  };
}

function money(cents: number): string {
  return (Math.max(0, Math.round(cents)) / 100).toFixed(2);
}
