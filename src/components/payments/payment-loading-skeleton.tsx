export interface PaymentLoadingSkeletonProps {
  /** Localized announcement, for example "Loading payment options…" in English. */
  label?: string;
  className?: string;
}

export function PaymentLoadingSkeleton({
  label = 'A carregar opções de pagamento…',
  className = '',
}: PaymentLoadingSkeletonProps) {
  return (
    <div role="status" aria-live="polite" className={className}>
      <span className="sr-only">{label}</span>
      <div aria-hidden="true" className="grid gap-3 motion-safe:animate-pulse">
        {['w-28', 'w-24', 'w-32'].map((width) => (
          <div key={width} className="flex h-16 items-center gap-3 rounded-md border border-border/60 bg-background px-4">
            <span className="h-4 w-4 shrink-0 rounded-full bg-muted" />
            <span className={`h-3 rounded bg-muted ${width}`} />
            <span className="ml-auto h-5 w-9 shrink-0 rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
