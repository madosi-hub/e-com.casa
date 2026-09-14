export function formatPrice(value: string | number, currency = 'EUR'): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (Number.isNaN(num)) return '—';
  const symbol = currency === 'GBP' ? '£' : '€';
  const formatted = num.toLocaleString('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  // EU convention: €49,90 — symbol before, comma decimals
  return `${symbol}${formatted}`;
}

export function formatDate(iso: string, locale = 'en-GB'): string {
  try {
    return new Date(iso).toLocaleDateString(locale, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

/** Date + time for tracking events — e.g. "10 September 2026, 14:32". */
export function formatDateTime(iso: string, locale = 'en-GB'): string {
  try {
    return new Date(iso).toLocaleString(locale, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function toNumber(value: string | number): number {
  return typeof value === 'string' ? parseFloat(value) : value;
}

export function money(n: number): string {
  return n.toFixed(2);
}

export function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}
