import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Reviews API
// GET  ?slug=xyz  → { reviews, avg, count } (APPROVED only, newest first, max 50)
// — email is NEVER exposed in responses
// POST { slug, author, country, rating, title, body, email? } → created review
// email (optional) enables verified-buyer matching against Orders

// Basic in-memory rate limiter: max 5 submissions per IP per 10 minutes.
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const rateBuckets = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const hits = (rateBuckets.get(ip) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (hits.length >= RATE_LIMIT_MAX) {
    rateBuckets.set(ip, hits);
    return true;
  }
  hits.push(now);
  rateBuckets.set(ip, hits);
  if (rateBuckets.size > 5000) {
    // Opportunistic cleanup so the map cannot grow unbounded.
    for (const [key, times] of rateBuckets) {
      if (times.every((t) => now - t >= RATE_LIMIT_WINDOW_MS)) rateBuckets.delete(key);
    }
  }
  return false;
}

/** Strip HTML tags and control characters — light sanitisation for plain-text fields. */
function sanitize(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim();
}

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.headers.get('x-real-ip') ?? 'unknown';
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Public shape of a review — strips the private email field. */
function toPublicReview(review: {
  id: string;
  author: string;
  country: string;
  rating: number;
  title: string;
  body: string;
  verified: boolean;
  createdAt: Date;
}) {
  return {
    id: review.id,
    author: review.author,
    country: review.country,
    rating: review.rating,
    title: review.title,
    body: review.body,
    verified: review.verified,
    createdAt: review.createdAt,
  };
}

export async function GET(req: NextRequest) {
  try {
    const slug = new URL(req.url).searchParams.get('slug')?.trim() ?? '';
    if (!slug) {
      return NextResponse.json({ error: 'Missing slug parameter' }, { status: 400 });
    }
    const reviews = await db.review.findMany({
      where: { productSlug: slug, status: 'APPROVED' },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    const count = reviews.length;
    const avg = count > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / count : null;
    return NextResponse.json({ reviews: reviews.map(toPublicReview), avg, count });
  } catch (error) {
    console.error('GET /api/reviews error', error);
    return NextResponse.json({ error: 'Something went wrong loading reviews. Please try again.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    let payload: Record<string, unknown>;
    try {
      payload = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const slug = sanitize(payload.slug);
    const author = sanitize(payload.author);
    const country = sanitize(payload.country).slice(0, 40);
    const title = sanitize(payload.title).slice(0, 80);
    const body = sanitize(payload.body);
    const rating = Number(payload.rating);
    const emailRaw = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '';

    const fieldErrors: Record<string, string> = {};
    if (!slug) fieldErrors.slug = 'Missing product reference.';
    if (author.length < 2 || author.length > 40) fieldErrors.author = 'Please enter a name between 2 and 40 characters.';
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) fieldErrors.rating = 'Please choose a rating from 1 to 5 stars.';
    if (body.length < 10 || body.length > 1000) fieldErrors.body = 'Your review should be between 10 and 1000 characters.';
    if (emailRaw && (!EMAIL_RE.test(emailRaw) || emailRaw.length > 120)) {
      fieldErrors.email = 'Please enter a valid email address, or leave the field empty.';
    }

    if (!slug) return NextResponse.json({ error: 'Missing product reference' }, { status: 400 });
    if (Object.keys(fieldErrors).length > 0) {
      return NextResponse.json({ error: 'Please review the highlighted fields.', fieldErrors }, { status: 400 });
    }

    // Rate limit valid submission attempts (per IP, max 5 per 10 minutes).
    const ip = getClientIp(req);
    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: 'You have submitted several reviews recently. Please wait a little while before posting another one.' },
        { status: 429 },
      );
    }

    // Slug must reference a real, non-blocked product.
    const product = await db.product.findUnique({ where: { slug } });
    if (!product || product.complianceStatus === 'BLOCKED') {
      return NextResponse.json({ error: 'We could not find this product.' }, { status: 400 });
    }

    // Verified-buyer matching: if an email was provided, mark the review as
    // verified when an order with that email contains this product. Matching is
    // case-insensitive; the email itself is stored but never returned by the API.
    let verified = false;
    if (emailRaw) {
      try {
        const candidates = Array.from(
          new Set([emailRaw, typeof payload.email === 'string' ? payload.email.trim() : ''].filter(Boolean))
        );
        const orders = await db.order.findMany({
          where: { email: { in: candidates } },
          select: { email: true, itemsJson: true },
          take: 50,
        });
        verified = orders.some(
          (o) => o.email.toLowerCase() === emailRaw && o.itemsJson.includes(`"slug":"${slug}"`)
        );
      } catch {
        // Matching is best-effort — never block a review because verification failed.
        verified = false;
      }
    }

    const created = await db.review.create({
      data: {
        productSlug: slug,
        author,
        country,
        rating,
        title,
        body,
        email: emailRaw || null,
        verified,
        status: 'APPROVED',
      },
    });

    return NextResponse.json({ review: toPublicReview(created) }, { status: 201 });
  } catch (error) {
    console.error('POST /api/reviews error', error);
    return NextResponse.json({ error: 'Something went wrong saving your review. Please try again.' }, { status: 500 });
  }
}
