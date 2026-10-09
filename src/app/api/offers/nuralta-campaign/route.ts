import { NextResponse } from 'next/server';
import { campaignState } from '@/lib/offers/nuralta-campaign';

export const dynamic = 'force-dynamic';

/** Read-only server clock: no visitor cookies or personalised prices. */
export function GET() {
  return NextResponse.json(campaignState(), { headers: { 'Cache-Control': 'no-store' } });
}

// Existing open tabs may still use POST during deployment.
export const POST = GET;
