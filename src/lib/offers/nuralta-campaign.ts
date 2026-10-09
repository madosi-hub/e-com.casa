/** Fixed clearance deadline in mainland Portugal. Prices remain catalogue prices. */
export const NURALTA_CAMPAIGN = {
  id: 'nuralta-queima-stock-outubro-2026',
  productSlug: 'nuralta-painel-ripado-decorativo',
  startsAt: '2026-10-09T00:00:00+01:00',
  endsAt: '2026-10-13T18:00:00+01:00',
  // Merchant-configured snapshots by size, not automated inventory counters.
  // Update when the merchant reports a new stock position.
  stockRemainingPercentBySize: { '0': 9, '1': 8, '2': 6 } as Record<string, number>, // 240×60, 260×70, 270×80
} as const;

export type NuraltaCampaignState = {
  endsAt: string;
  active: boolean;
  serverNow: number;
};

export function campaignState(now = Date.now()): NuraltaCampaignState {
  const end = Date.parse(NURALTA_CAMPAIGN.endsAt);
  return {
    endsAt: new Date(end).toISOString(),
    active: now >= Date.parse(NURALTA_CAMPAIGN.startsAt) && now < end,
    serverNow: now,
  };
}

export function campaignRemaining(endsAt: string, now: number) {
  const seconds = Math.max(0, Math.ceil((Date.parse(endsAt) - now) / 1000));
  return {
    days: Math.floor(seconds / 86400),
    hours: Math.floor(seconds % 86400 / 3600),
    minutes: Math.floor(seconds % 3600 / 60),
    seconds: seconds % 60,
  };
}
