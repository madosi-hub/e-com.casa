import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';
import { getProducts } from '@/lib/catalog';

// E-com.casa Concierge — AI shopping assistant
// Backend-only: uses z-ai-web-dev-sdk (never expose client-side).
// Product-aware: injects the live catalogue so recommendations
// reference real slugs/prices only (no fabrication).

interface IncomingMessage {
  role: 'user' | 'assistant';
  content: string;
}

// Simple in-memory rate limit: 20 requests / 5 min / IP
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 5 * 60 * 1000;
const hits = new Map<string, { count: number; resetAt: number }>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || entry.resetAt < now) {
    hits.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_LIMIT;
}

// Catalogue context (cheap: tiny columns only)
let catalogCache: { lines: string; validSlugs: Set<string>; at: number } | null = null;
const CATALOG_TTL_MS = 60 * 1000;

async function getCatalogContext() {
  if (catalogCache && Date.now() - catalogCache.at < CATALOG_TTL_MS) return catalogCache;

  const { products } = await getProducts({ perPage: 48 });

  const lines = products
    .map((p) => {
      const tags = [
        p.categorySlug,
        ...p.spaceSlugs.split(',').filter(Boolean),
        ...p.styleSlugs.split(',').filter(Boolean),
        p.isBestSeller ? 'bestseller' : '',
        p.isNew ? 'new' : '',
        p.stockUnlimited ? 'MADE TO ORDER' : p.stock === 0 ? 'OUT OF STOCK' : '',
      ]
        .filter(Boolean)
        .join('/');
      return `- ${p.slug} | ${p.name} | €${p.price} | ${p.subtitle ?? ''} | ${tags}`;
    })
    .join('\n');

  catalogCache = { lines, validSlugs: new Set(products.map((p) => p.slug)), at: Date.now() };
  return catalogCache;
}

const SYSTEM_PROMPT = `You are the E-com.casa Concierge, the virtual shopping assistant for E-com.casa — a curated home & garden online store serving customers across Europe (prices in EUR, VAT included).

PERSONALITY: warm, concise, knowledgeable about interior & outdoor styling. You give helpful, specific answers in 2–5 sentences (never long essays). Use plain language. A light touch of personality is welcome, but never emoji spam (at most one emoji per reply, usually none).

WHAT YOU KNOW (store facts — use these, do not invent others):
- Delivery: standard 3–5 working days (free across Europe), express 1–2 working days (€9.90).
- Returns: 14 days, free return label, refund within 5 working days of receiving the return.
- Payments: secure checkout with cards and country-specific payment methods (for example, MB WAY and Multibanco in Portugal). The methods shown at checkout depend on the delivery country.
- Orders: order numbers look like EC-XXXXXX; customers can follow order status on the "My orders" page (/account/orders) — the device used at checkout keeps a direct link to the order, and support can help with the order number if the link is missing.
- Contact: support@e-com.casa, humans reply within one working day.
- Catalogue: the product list provided below is the COMPLETE catalogue. Only recommend products that appear in it.

CATALOGUE (slug | name | price | subtitle | tags):
{{CATALOG}}

RECOMMENDATION FORMAT:
- If — and only if — your reply suggests concrete products, end your reply with a final line exactly in this format:
SUGGEST: slug1, slug2, slug3
- Use 1–3 slugs, only valid slugs from the catalogue, chosen to genuinely match the customer's question (room, style, budget, occasion).
- If no product recommendation is needed (pure policy/service question), omit the SUGGEST line entirely.

GUARDRAILS:
- Never invent products, prices, stock levels, discounts or policies beyond the facts above. If unsure, say so and point to support@e-com.casa.
- Never request or repeat sensitive data (full card numbers, passwords).
- Do not discuss topics unrelated to the store, home & garden styling, or orders — politely redirect.
- Reply in the customer's language if they write in Portuguese, German, French or Spanish; otherwise English.`;

function buildSystemPrompt(catalog: string) {
  return SYSTEM_PROMPT.replace('{{CATALOG}}', catalog);
}

function extractSuggestions(reply: string, validSlugs: Set<string>) {
  // Tolerant match: the model sometimes places SUGGEST mid-line after a sentence.
  const match = reply.match(/SUGGEST:\s*([a-z0-9\-,\s]+)/i);
  if (!match) return { reply: tidyReply(reply), suggestions: [] as string[] };
  const suggestions = match[1]
    .split(',')
    .map((s) => s.trim())
    .filter((s) => validSlugs.has(s))
    .slice(0, 3);
  const without = reply.replace(match[0], '');
  return { reply: tidyReply(without), suggestions };
}

function tidyReply(text: string) {
  return text
    .replace(/\s+\.\s*/g, '. ') // stray space before a full stop after stripping
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
    if (rateLimited(ip)) {
      return NextResponse.json(
        { error: 'The concierge is taking a short break after many questions. Please try again in a few minutes, or email support@e-com.casa.' },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => null);
    const messages: unknown = body?.messages;
    if (!Array.isArray(messages)) {
      return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
    }

    // Sanitise + trim history (keep last 12 turns, 1000 chars each)
    const history: IncomingMessage[] = (messages as IncomingMessage[])
      .filter(
        (m) =>
          m &&
          (m.role === 'user' || m.role === 'assistant') &&
          typeof m.content === 'string' &&
          m.content.trim().length > 0
      )
      .slice(-12)
      .map((m) => ({ role: m.role, content: m.content.slice(0, 1000) }));

    if (history.length === 0 || history[history.length - 1].role !== 'user') {
      return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
    }

    const catalog = await getCatalogContext();

    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'assistant', content: buildSystemPrompt(catalog.lines) },
        ...history.map((m) => ({ role: m.role, content: m.content })),
      ],
      thinking: { type: 'disabled' },
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw || !raw.trim()) {
      return NextResponse.json(
        { reply: '', suggestions: [], error: 'The concierge could not answer right now. Please try again, or email support@e-com.casa.' },
        { status: 502 }
      );
    }

    const { reply, suggestions } = extractSuggestions(raw, catalog.validSlugs);
    return NextResponse.json({ reply, suggestions });
  } catch (err) {
    console.error('[/api/chat] error:', err);
    return NextResponse.json(
      { error: 'The concierge is unavailable at the moment. Please try again shortly, or email support@e-com.casa.' },
      { status: 500 }
    );
  }
}
