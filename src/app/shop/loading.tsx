import { Skeleton } from '@/components/ui/skeleton';

export default function ShopLoading() {
  return (
    <div className="container-ecom py-8 lg:py-10" aria-busy="true" aria-label="Loading products">
      <Skeleton className="h-4 w-28" />
      <div className="mt-3 flex items-end justify-between">
        <div>
          <Skeleton className="h-9 w-56" />
          <Skeleton className="mt-2 h-4 w-40" />
        </div>
        <Skeleton className="h-9 w-[190px] rounded-md" />
      </div>
      <div className="mt-8 grid gap-10 lg:grid-cols-[220px_1fr]">
        <div className="hidden space-y-6 lg:block" aria-hidden>
          {[0, 1, 2].map((g) => (
            <div key={g} className="space-y-2.5">
              <Skeleton className="h-3 w-20" />
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-5 w-full rounded-md" />
              ))}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i}>
              <Skeleton className="aspect-square w-full rounded-md" />
              <Skeleton className="mt-3 h-4 w-3/4" />
              <Skeleton className="mt-2 h-3.5 w-1/2" />
              <Skeleton className="mt-2 h-3.5 w-1/3" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
