export default function OfferLoading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="h-9 animate-pulse bg-ink" />
      <div className="border-b border-border/70 px-4 py-4">
        <div className="container-ecom flex items-center justify-between">
          <div className="h-9 w-36 animate-pulse rounded-lg bg-muted" />
          <div className="h-9 w-28 animate-pulse rounded-full bg-muted" />
        </div>
      </div>
      <div className="container-ecom grid gap-10 py-10 lg:grid-cols-2">
        <div className="aspect-square animate-pulse rounded-2xl bg-muted/70" />
        <div className="space-y-5 pt-4">
          <div className="h-4 w-40 animate-pulse rounded bg-muted" />
          <div className="h-14 w-full animate-pulse rounded bg-muted" />
          <div className="h-6 w-4/5 animate-pulse rounded bg-muted" />
          <div className="h-72 w-full animate-pulse rounded-2xl bg-muted/70" />
        </div>
      </div>
    </div>
  );
}
