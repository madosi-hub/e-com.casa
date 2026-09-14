import { Skeleton } from '@/components/ui/skeleton';

export default function ProductLoading() {
  return (
    <div className="container-ecom py-8 lg:py-12" aria-busy="true" aria-label="Loading product">
      <Skeleton className="h-4 w-72" />
      <div className="mt-6 grid gap-10 lg:grid-cols-2 lg:gap-14">
        <div>
          <Skeleton className="aspect-square w-full rounded-lg" />
          <Skeleton className="mx-auto mt-3 h-3 w-72" />
        </div>
        <div>
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="mt-3 h-4 w-1/2" />
          <Skeleton className="mt-4 h-4 w-40" />
          <div className="mt-6 space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </div>
          <Skeleton className="mt-7 h-8 w-44" />
          <div className="mt-6 flex gap-3">
            <Skeleton className="h-12 w-32 rounded-md" />
            <Skeleton className="h-12 flex-1 rounded-md" />
          </div>
          <div className="mt-3 flex gap-3">
            <Skeleton className="h-12 flex-1 rounded-md" />
            <Skeleton className="h-12 w-12 rounded-md" />
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-40" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
