import { db } from '@/lib/db';
import { verifySignature } from '@/lib/email/resend';
import { processWebhook } from '@/lib/email/inbox';
import { ZodError } from 'zod';

export const runtime = 'nodejs';
export async function POST(request: Request): Promise<Response> {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) return Response.json({error:'Webhook integration unavailable'},{status:503});
  if (Number(request.headers.get('content-length') || 0) > 256_000) return Response.json({error:'Payload too large'},{status:413});
  let raw: string;
  try {
    const reader=request.body?.getReader();
    if (!reader) return Response.json({error:'Invalid body'},{status:400});
    const chunks: Uint8Array[]=[];let length=0;
    try {
      while(true) {
        const chunk=await reader.read();if(chunk.done)break;
        length+=chunk.value.byteLength;
        if(length>256_000){await reader.cancel();return Response.json({error:'Payload too large'},{status:413});}
        chunks.push(chunk.value);
      }
      raw=Buffer.concat(chunks).toString('utf8');
    } finally {reader.releaseLock();}
  } catch { return Response.json({error:'Invalid body'},{status:400}); }
  if (!verifySignature(raw,request.headers,secret)) return Response.json({error:'Invalid signature'},{status:400});
  let payload: unknown;
  try { payload = JSON.parse(raw); } catch { return Response.json({error:'Invalid payload'},{status:400}); }
  try {
    await processWebhook(db,request.headers.get('svix-id')!,payload);
    return Response.json({ok:true});
  } catch (error) {
    // 503 asks Resend to retry when retrieval/storage fails, rather than losing the message.
    return Response.json({error:error instanceof ZodError ? 'Invalid payload' : 'Email processing unavailable'}, {status:error instanceof ZodError ? 400 : 503});
  }
}
