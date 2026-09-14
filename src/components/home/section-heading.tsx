import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export function SectionHeading({
  title,
  subtitle,
  href,
  linkLabel,
  dark = false,
  className,
}: {
  title: string;
  subtitle?: string;
  href?: string;
  linkLabel?: string;
  dark?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('flex items-end justify-between gap-4', className)}>
      <div>
        <h2
          className={cn(
            'font-display text-[26px] font-medium tracking-tight sm:text-[30px] lg:text-[32px]',
            dark ? 'text-white' : 'text-foreground'
          )}
        >
          {title}
        </h2>
        {subtitle && (
          <p className={cn('mt-1.5 text-[13.5px]', dark ? 'text-white/70' : 'text-muted-foreground')}>{subtitle}</p>
        )}
      </div>
      {href && linkLabel && (
        <Link
          href={href}
          className={cn(
            'group hidden shrink-0 items-center gap-1.5 text-[13px] font-medium sm:flex',
            dark ? 'text-white/85 hover:text-white' : 'text-foreground/80 hover:text-foreground'
          )}
        >
          {linkLabel}
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" strokeWidth={2} />
        </Link>
      )}
    </div>
  );
}
