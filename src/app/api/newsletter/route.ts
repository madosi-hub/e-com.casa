// POST /api/newsletter
// Explicit marketing consent is REQUIRED for subscription.
// Consent is never inferred from the form submission alone —
// the request must carry marketingConsent=true, and the consent
// metadata (version, country, locale, source) is persisted.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { rateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const CONSENT_VERSION = '1.0';
const PRIVACY_VERSION = '1.0';

const schema = z.object({
  email: z.string().email(),
  source: z.string().max(40).default('footer'),
  marketingConsent: z.literal(true), // explicit — absence fails validation
  country: z.string().max(2).optional(),
  locale: z.string().max(5).optional(),
});

export async function POST(req: NextRequest) {
  const limit = rateLimit(req, 'newsletter', 6, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait a moment.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } },
    );
  }

  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Please enter a valid email address and accept the newsletter consent.' },
        { status: 400 },
      );
    }
    const { email, source, country, locale } = parsed.data;
    await db.newsletterSubscriber.upsert({
      where: { email },
      update: {
        source,
        marketingConsent: true,
        consentAt: new Date(),
        consentVersion: CONSENT_VERSION,
        privacyVersion: PRIVACY_VERSION,
        ...(country ? { country } : {}),
        ...(locale ? { locale } : {}),
      },
      create: {
        email,
        source,
        marketingConsent: true,
        consentVersion: CONSENT_VERSION,
        privacyVersion: PRIVACY_VERSION,
        country: country ?? '',
        locale: locale ?? '',
      },
    });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error('POST /api/newsletter error', error);
    return NextResponse.json({ error: 'Subscription failed. Please try again.' }, { status: 500 });
  }
}
