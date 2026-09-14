'use client';

import { useEffect, useMemo, useState } from 'react';
import { Clock3 } from 'lucide-react';
import { cn } from '@/lib/utils';

function remainingMs(endsAt: string): number {
  const end = new Date(endsAt).getTime();
  return Number.isFinite(end) ? Math.max(0, end - Date.now()) : 0;
}

function parts(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { days, hours, minutes, seconds };
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

export function OfferCountdown({
  endsAt,
  compact = false,
  className,
}: {
  endsAt?: string | null;
  compact?: boolean;
  className?: string;
}) {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!endsAt) return;
    const update = () => setRemaining(remainingMs(endsAt));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [endsAt]);

  const value = useMemo(() => parts(remaining ?? 0), [remaining]);
  if (!endsAt || remaining === null || remaining <= 0) return null;

  const clock = value.days > 0
    ? `${value.days}d ${pad(value.hours)}:${pad(value.minutes)}:${pad(value.seconds)}`
    : `${pad(value.hours)}:${pad(value.minutes)}:${pad(value.seconds)}`;

  if (compact) {
    return (
      <span className={cn('inline-flex items-center gap-1 text-[10.5px] font-semibold tabular-nums text-terracotta', className)}>
        <Clock3 className="h-3 w-3" aria-hidden />
        {clock}
      </span>
    );
  }

  return (
    <div className={cn('mt-3 flex items-center gap-2 rounded-md bg-terracotta/8 px-3 py-2 text-[12.5px] text-foreground/80', className)}>
      <Clock3 className="h-4 w-4 shrink-0 text-terracotta" strokeWidth={1.7} aria-hidden />
      <span>A oferta termina em</span>
      <strong className="ml-auto tabular-nums text-terracotta">{clock}</strong>
    </div>
  );
}
