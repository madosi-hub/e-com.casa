import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { rateLimit } from '@/lib/rate-limit';
import { checkoutContactSchema, submitCheckoutContact } from '@/lib/payments/checkout-session';

const schema = z.object({ reference: z.string().max(80), accessToken: z.string().min(8).max(120), contact: checkoutContactSchema });

export async function POST(req: NextRequest) {
  if (!rateLimit(req, 'checkout-submit', 20, 60000).ok) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Preencha os dados de contacto e entrega.' }, { status: 400 });
  try {
    await submitCheckoutContact(parsed.data.reference, parsed.data.accessToken, parsed.data.contact);
    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'Não foi possível confirmar os dados deste checkout. Atualize a página e tente novamente.' }, { status: 409 });
  }
}
