'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Truck } from 'lucide-react';
import { NURALTA_CAMPAIGN, type NuraltaCampaignState, campaignState, campaignRemaining } from '@/lib/offers/nuralta-campaign';
import { usePathname } from 'next/navigation';
import { panelOfferSlugFromPathname } from '@/lib/offers/route-policy';

type CampaignContext = { campaign: NuraltaCampaignState | null; now: number };
const Context = createContext<CampaignContext>({ campaign: null, now: 0 });
let request: Promise<NuraltaCampaignState> | null = null;
function loadCampaign() {
  return request ??= fetch('/api/offers/nuralta-campaign', { cache: 'no-store', signal: AbortSignal.timeout(8000) })
    .then(async response => {
      if (!response.ok) throw new Error('Campaign unavailable');
      return response.json() as Promise<NuraltaCampaignState>;
    }).finally(() => { request = null; });
}

export function NuraltaCampaignBoundary({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const enabled = Boolean(panelOfferSlugFromPathname(pathname)) && !pathname.includes('/sucesso') && !pathname.includes('/informacao/');
  return enabled ? <NuraltaCampaignProvider>{children}</NuraltaCampaignProvider> : children;
}

export function NuraltaCampaignProvider({ children, enabled = true }: { children: ReactNode; enabled?: boolean }) {
  const [campaign, setCampaign] = useState<NuraltaCampaignState | null>(null);
  const [now, setNow] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    let serverTime = Date.now();
    let observedAt = performance.now();
    const receive = (value: NuraltaCampaignState) => {
      if (!alive) return;
      serverTime = value.serverNow;
      observedAt = performance.now();
      setCampaign(value);
      setNow(serverTime);
    };
    const refresh = () => loadCampaign().then(value => {
      receive(value);
    }).catch(() => { receive(campaignState()); });
    void refresh();
    const timer = window.setInterval(() => setNow(serverTime + performance.now() - observedAt), 1000);
    const onFocus = () => { void refresh(); };
    window.addEventListener('focus', onFocus);
    return () => { alive = false; window.clearInterval(timer); window.removeEventListener('focus', onFocus); };
  }, [enabled]);

  const active = campaignState(now).active;
  return <Context.Provider value={{ campaign: campaign ? { ...campaign, active } : null, now }}>{children}</Context.Provider>;
}

export const useNuraltaCampaign = () => useContext(Context);

export function CampaignCountdown() {
  const { campaign, now } = useNuraltaCampaign();
  if (!campaign?.active) return null;
  const { days, hours, minutes, seconds } = campaignRemaining(campaign.endsAt, now);
  const remaining = days > 0
    ? `${days}d · ${hours}h · ${minutes}min`
    : `${hours}h · ${minutes}min · ${seconds}s`;
  return <div className="h-9 border-b border-[#843630] bg-[#98443b] text-white" aria-label="Queima de stock">
    <div className="mx-auto flex h-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
      <span className="whitespace-nowrap text-xs font-semibold sm:text-[13px]">Queima de stock</span>
      <span role="timer" aria-live="off" aria-label={`Termina em ${days} dias, ${hours} horas, ${minutes} minutos e ${seconds} segundos`} className="whitespace-nowrap text-[13px] font-medium tabular-nums">
        {remaining}
      </span>
    </div>
  </div>;
}

export function CampaignStock({ sizeKey }: { sizeKey: string }) {
  const { campaign } = useNuraltaCampaign();
  const percent = NURALTA_CAMPAIGN.stockRemainingPercentBySize[sizeKey];
  if (!campaign?.active || percent === undefined) return null;
  return <span className="mt-1 inline-flex items-center gap-1.5 text-xs font-semibold leading-5 text-[#93442e]">
    <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#a95438]" />
    <span>Restam {percent}% do stock</span>
  </span>;
}

export function DispatchNotice({ expedited = true }: { expedited?: boolean } = {}) {
  return <div className="overflow-hidden rounded-xl border border-[#e0d6cb] bg-[#fdfbf9] text-left">
    <div className="flex items-start gap-2.5 px-4 py-3">
      <Truck aria-hidden className="mt-0.5 h-[18px] w-[18px] shrink-0 text-[#526348]" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-0.5 gap-y-1">
          <p className="text-[13px] font-semibold leading-5 text-[#405236]">{expedited ? 'Expedição rápida' : 'Envio'} via</p>
          <img src="/pt/images/logo-ctt-express.svg" alt="CTT Express" width={80} height={27} className="h-auto w-20 shrink-0" />
        </div>
        {expedited && <p className="mt-0.5 text-xs leading-5 text-[#6f6259]">Para pagamentos confirmados hoje, enviamos em 24h.</p>}
      </div>
    </div>
  </div>;
}
