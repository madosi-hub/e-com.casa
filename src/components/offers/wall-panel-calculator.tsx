'use client';

import { Calculator } from 'lucide-react';
import { FormEvent, useMemo, useState } from 'react';
import type { OfferUICopy } from '@/lib/offers/i18n';
import { trackOfferEvent } from '@/lib/offers/analytics';

function parsePanelArea(dimensions?: string | null): number | null {
  if (!dimensions) return null;
  const match = dimensions.match(/(\d+(?:[.,]\d+)?)\s*[×xX]\s*(\d+(?:[.,]\d+)?)\s*cm/i);
  if (!match) return null;
  const h = Number(match[1].replace(',', '.')) / 100;
  const w = Number(match[2].replace(',', '.')) / 100;
  if (!Number.isFinite(h) || !Number.isFinite(w) || h <= 0 || w <= 0) return null;
  return h * w;
}

export function WallPanelCalculator({
  offerSlug,
  dimensions,
  copy,
}: {
  offerSlug: string;
  dimensions?: string | null;
  copy: OfferUICopy;
}) {
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const [result, setResult] = useState<number | null>(null);
  const panelArea = useMemo(() => parsePanelArea(dimensions) ?? 1.44, [dimensions]);

  const calculate = (event: FormEvent) => {
    event.preventDefault();
    const wallWidth = Number(width.replace(',', '.'));
    const wallHeight = Number(height.replace(',', '.'));
    if (!Number.isFinite(wallWidth) || !Number.isFinite(wallHeight) || wallWidth <= 0 || wallHeight <= 0) return;
    const wallArea = wallWidth * wallHeight;
    const recommended = Math.max(1, Math.ceil((wallArea / panelArea) * 1.08));
    setResult(recommended);
    trackOfferEvent('calculator_used', { offerSlug, wallArea: Math.round(wallArea * 100) / 100, recommended });
  };

  return (
    <div className="rounded-2xl border border-border bg-cream/45 p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-olive/10 text-olive">
          <Calculator className="h-4 w-4" />
        </span>
        <div>
          <h3 className="text-[14px] font-semibold">{copy.calculatorTitle}</h3>
          <p className="mt-1 text-[12.5px] leading-5 text-muted-foreground">{copy.calculatorBody}</p>
        </div>
      </div>
      <form onSubmit={calculate} className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
        <label className="text-[11px] font-medium text-muted-foreground">
          {copy.wallWidth}
          <input inputMode="decimal" value={width} onChange={(e) => setWidth(e.target.value)} placeholder="3.60" className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 text-[13px] text-foreground outline-none focus:border-olive" />
        </label>
        <label className="text-[11px] font-medium text-muted-foreground">
          {copy.wallHeight}
          <input inputMode="decimal" value={height} onChange={(e) => setHeight(e.target.value)} placeholder="2.40" className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 text-[13px] text-foreground outline-none focus:border-olive" />
        </label>
        <button type="submit" className="mt-auto h-10 rounded-lg bg-ink px-4 text-[12px] font-semibold text-cream transition hover:bg-ink/90">{copy.estimate}</button>
      </form>
      {result !== null && (
        <div className="mt-4 rounded-xl bg-background p-4 text-[13px]">
          <strong>{copy.estimatedPanels}: {result} painéis</strong>
          <p className="mt-1 text-[11px] leading-5 text-muted-foreground">{copy.estimateDisclaimer}</p>
        </div>
      )}
    </div>
  );
}
