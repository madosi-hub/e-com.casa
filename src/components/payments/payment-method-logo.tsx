'use client';

// <PaymentMethodLogo />
// Renders ONE payment brand asset (the user-supplied files under
// /public/payment-methods — never redrawn or substituted).
// Variants tune sizing/outline for footer, checkout and compact
// contexts while preserving original brand proportions.

import Image from 'next/image';

export interface PaymentMethodLogoProps {
  /** Asset path, e.g. /payment-methods/mb-way.png */
  src: string;
  alt: string;
  /** Visual variant. */
  variant?: 'footer' | 'checkout' | 'compact';
  /** Fixed height in px — width scales with the brand ratio. */
  height?: number;
  className?: string;
}

const VARIANT_STYLE: Record<string, string> = {
  footer: 'bg-white/95 border border-white/20',
  checkout: 'bg-white border border-border/70',
  compact: 'bg-white border border-border/50',
};

/** Intrinsic pixel sizes of the supplied assets (post-trim) — used to
 *  scale width from the render height without CSS overrides. */
const INTRINSIC: Record<string, readonly [number, number]> = {
  '/payment-methods/mb-way.png': [540, 262],
  '/payment-methods/multibanco.png': [960, 1134],
  '/payment-methods/multibanco.svg': [418, 88],
  '/payment-methods/bizum.png': [1336, 398],
  '/payment-methods/blik.png': [540, 284],
  '/payment-methods/bancontact.png': [518, 386],
  '/payment-methods/cards.jpg': [900, 360],
  '/payment-methods/visa.png': [248, 89],
  '/payment-methods/mastercard.png': [254, 163],
  '/payment-methods/amex.png': [229, 229],
};

export function PaymentMethodLogo({ src, alt, variant = 'checkout', height = 24, className = '' }: PaymentMethodLogoProps) {
  const chipPadding = variant === 'compact' ? 'px-1.5 py-1' : 'px-2 py-1.5';
  const imgHeight = variant === 'footer' ? 20 : height;

  // Portrait / near-square supplied assets (Multibanco, Amex square)
  // get extra height so their wordmarks stay legible, while keeping
  // the original brand proportions.
  const [iw0, ih0] = INTRINSIC[src] ?? [4, 1];
  const portrait = ih0 > iw0 / 1.2;
  const renderHeight = portrait && imgHeight <= 26 ? Math.round(imgHeight * 1.9) : imgHeight;

  const [iw, ih] = INTRINSIC[src] ?? [4, 1];
  const renderWidth = Math.max(8, Math.round((renderHeight * iw) / ih));

  return (
    <span
      className={`inline-flex items-center justify-center rounded ${chipPadding} ${VARIANT_STYLE[variant]} ${className}`}
      title={alt}
    >
      <Image
        src={src}
        alt={alt}
        width={renderWidth}
        height={renderHeight}
        className="object-contain"
        sizes={`${renderWidth * 2}px`}
      />
    </span>
  );
}
