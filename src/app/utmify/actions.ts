'use server';

import { redirect } from 'next/navigation';
import {
  clearUtmifySession,
  createUtmifySession,
  requireUtmifySession,
  verifyUtmifyPassword,
} from '@/lib/utmify-auth';
import { reprocessPaidOrderToUtmify } from '@/lib/utmify-admin';

function value(formData: FormData, key: string): string {
  return String(formData.get(key) ?? '').trim();
}

export async function loginUtmify(formData: FormData) {
  if (!(await verifyUtmifyPassword(value(formData, 'password')))) redirect('/utmify?login=error');
  await createUtmifySession();
  redirect('/utmify');
}

export async function logoutUtmify() {
  await clearUtmifySession();
  redirect('/utmify');
}

export async function reprocessUtmifyAction(formData: FormData) {
  await requireUtmifySession();
  const orderId = value(formData, 'orderId');
  const orderNumber = value(formData, 'orderNumber');
  const parsedPage = Number.parseInt(value(formData, 'page'), 10);
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  if (!orderId || !orderNumber) redirect(`/utmify?page=${page}&error=invalid`);

  let destination: string;
  try {
    const result = await reprocessPaidOrderToUtmify(orderId);
    destination = `/utmify?page=${page}&${result.ok ? 'synced' : 'failed'}=${encodeURIComponent(orderNumber)}`;
  } catch (error) {
    console.error('Manual UTMify reprocessing failed', {
      orderNumber,
      error: error instanceof Error ? error.message : 'unknown',
    });
    destination = `/utmify?page=${page}&error=${encodeURIComponent(orderNumber)}`;
  }
  redirect(destination);
}
