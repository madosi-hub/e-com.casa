import Link from 'next/link';
import type { ReactNode } from 'react';

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 border-b border-neutral-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-950">{title}</h1>
        {description ? <p className="mt-1 max-w-3xl text-sm text-neutral-500">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function AdminButton({
  href,
  children,
  secondary = false,
}: {
  href: string;
  children: ReactNode;
  secondary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={secondary
        ? 'inline-flex items-center justify-center rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-50'
        : 'inline-flex items-center justify-center rounded-lg bg-neutral-950 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800'}
    >
      {children}
    </Link>
  );
}

export function StatCard({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">{label}</p>
      <div className="mt-2 text-2xl font-semibold text-neutral-950">{value}</div>
      {hint ? <p className="mt-1 text-xs text-neutral-500">{hint}</p> : null}
    </div>
  );
}

export function StatusBadge({ value }: { value: string | null | undefined }) {
  const text = value || '—';
  const normalized = text.toUpperCase();
  const positive = ['PAID', 'DELIVERED', 'SUCCEEDED', 'ACTIVE', 'PUBLISHED', 'CONFIRMED'].includes(normalized);
  const warning = ['PENDING', 'PENDING_PAYMENT', 'PROCESSING', 'PARTIALLY_REFUNDED', 'PENDING_REVIEW'].includes(normalized);
  const className = positive
    ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
    : warning
      ? 'bg-amber-50 text-amber-700 ring-amber-600/20'
      : 'bg-neutral-100 text-neutral-700 ring-neutral-500/20';

  return <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset ${className}`}>{text}</span>;
}

export function Notice({ children }: { children: ReactNode }) {
  return <div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{children}</div>;
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border border-dashed border-neutral-300 bg-white px-6 py-12 text-center text-sm text-neutral-500">{children}</div>;
}

export function money(value: string | number, currency = 'EUR') {
  const amount = typeof value === 'number' ? value : Number.parseFloat(value || '0');
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(Number.isFinite(amount) ? amount : 0);
}

export const inputClass = 'mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 outline-none transition focus:border-neutral-500 focus:ring-2 focus:ring-neutral-200';
export const labelClass = 'block text-sm font-medium text-neutral-700';
export const textareaClass = `${inputClass} min-h-28`;
