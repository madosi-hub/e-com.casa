import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

const schema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email(),
  orderRef: z.string().max(40).optional().nullable(),
  subject: z.string().min(1).max(200),
  message: z.string().min(1).max(5000),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Please complete all required fields' }, { status: 400 });
    }
    await db.contactMessage.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        orderRef: parsed.data.orderRef || null,
        subject: parsed.data.subject,
        message: parsed.data.message,
      },
    });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error('POST /api/contact error', error);
    return NextResponse.json({ error: 'Message could not be sent. Please try again.' }, { status: 500 });
  }
}
