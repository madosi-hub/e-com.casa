'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { RefreshCcw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface for diagnostics without leaking details to shoppers
    console.error('Unhandled application error:', error);
  }, [error]);

  return (
    <div className="container-ecom flex min-h-[64vh] flex-col items-center justify-center py-20 text-center">
      <p className="eyebrow text-terracotta">Something went wrong</p>
      <h1 className="font-display mt-4 text-[34px] font-medium tracking-tight sm:text-[42px]">
        A small hiccup.
      </h1>
      <p className="mt-4 max-w-md text-[15px] leading-relaxed text-muted-foreground">
        We had trouble loading this part of the store. Trying again usually fixes it —
        your cart and wishlist are safe.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button onClick={reset} className="h-12 rounded-md bg-primary px-7 text-[14px] font-semibold">
          <RefreshCcw className="mr-2 h-4 w-4" strokeWidth={1.75} />
          Try again
        </Button>
        <Button asChild variant="outline" className="h-12 rounded-md border-ink px-7 text-[14px] font-semibold hover:bg-ink hover:text-cream">
          <Link href="/">
            <Home className="mr-2 h-4 w-4" strokeWidth={1.75} />
            Back to home
          </Link>
        </Button>
      </div>
      {error.digest && (
        <p className="mt-8 text-[11.5px] text-muted-foreground">
          Reference: {error.digest} — include it if you contact{' '}
          <a href="mailto:support@e-com.casa" className="underline underline-offset-2">
            support@e-com.casa
          </a>
        </p>
      )}
    </div>
  );
}
