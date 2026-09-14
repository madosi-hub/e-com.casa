import type { Metadata, Viewport } from 'next';
import { Playfair_Display, Inter, Manrope, Newsreader } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { SiteChrome } from '@/components/layout/site-chrome';
import { RuntimeWidgets } from '@/components/layout/runtime-widgets';
import { COMPANY } from '@/lib/company';

const playfair = Playfair_Display({
  variable: '--font-serif-display',
  subsets: ['latin'],
  display: 'swap',
});

const inter = Inter({
  variable: '--font-sans-body',
  subsets: ['latin'],
  display: 'swap',
});

const manrope = Manrope({
  variable: '--font-manrope',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

const newsreader = Newsreader({
  variable: '--font-newsreader',
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  style: ['normal'],
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(COMPANY.domain),
  title: {
    default: 'E-com.casa — Make Your Space Yours. | Home & Garden',
    template: '%s | E-com.casa',
  },
  description: 'Curated pieces for interiors, gardens and everyday living. Wall panels, lighting, garden and outdoor living — delivered across Europe.',
  keywords: ['home and garden', 'wall panels', 'lighting', 'outdoor furniture', 'interior decoration', 'European design', 'E-com.casa'],
  authors: [{ name: COMPANY.legalName }],
  openGraph: {
    title: 'E-com.casa — Make Your Space Yours.',
    description: 'Curated pieces for interiors, gardens and everyday living.',
    url: COMPANY.domain,
    siteName: 'E-com.casa',
    type: 'website',
    locale: 'en_GB',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'E-com.casa — Make Your Space Yours.',
    description: 'Curated pieces for interiors, gardens and everyday living.',
  },
  robots: {
    index: process.env.NEXT_PUBLIC_INDEXING_ENABLED === 'true',
    follow: process.env.NEXT_PUBLIC_INDEXING_ENABLED === 'true',
  },
  alternates: { canonical: '/' },
};

export const viewport: Viewport = {
  themeColor: '#1d211e',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${playfair.variable} ${inter.variable} ${manrope.variable} ${newsreader.variable} font-sans antialiased bg-background text-foreground`}>
        <a href="#main-content" className="sr-only z-[100] bg-ink px-4 py-2 text-sm text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
          Skip to main content
        </a>
        <SiteChrome>{children}</SiteChrome>
        <RuntimeWidgets />
        <Toaster />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: COMPANY.brand,
              legalName: COMPANY.legalName,
              url: COMPANY.domain,
              email: COMPANY.emails.support,
              address: {
                '@type': 'PostalAddress',
                streetAddress: COMPANY.registeredOffice.line1,
                addressLocality: COMPANY.registeredOffice.city,
                postalCode: COMPANY.registeredOffice.postcode,
                addressCountry: 'GB',
              },
            }),
          }}
        />
      </body>
    </html>
  );
}
