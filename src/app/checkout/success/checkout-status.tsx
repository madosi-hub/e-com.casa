'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export function CheckoutStatus({ reference, token, portuguese }: { reference: string; token: string; portuguese: boolean }) {
  const router = useRouter();
  const [status, setStatus] = useState('PENDING_PAYMENT');
  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const response = await fetch(`/api/payments/status?order=${encodeURIComponent(reference)}&token=${encodeURIComponent(token)}`, { cache: 'no-store' });
        if (response.ok && active) {
          const data = await response.json();
          if (!active) return;
          setStatus(data.paymentStatus);
          if (data.orderNumber) {
            const url = new URL(window.location.href);
            url.searchParams.set('order', data.orderNumber);
            // Only a server-confirmed order enters the browser's order history.
            const saved = { orderNumber: data.orderNumber, accessToken: token, createdAt: new Date().toISOString() };
            try {
              sessionStorage.setItem('ecom-last-order', JSON.stringify(saved));
              const list = JSON.parse(localStorage.getItem('ecom-orders') ?? '[]');
              localStorage.setItem('ecom-orders', JSON.stringify([saved, ...list.filter((item: { orderNumber: string }) => item.orderNumber !== saved.orderNumber)].slice(0, 20)));
              sessionStorage.removeItem('ecom-checkout-session-v2');
            } catch { /* storage is optional */ }
            router.replace(`${url.pathname}${url.search}`);
            return;
          }
        }
      } catch { /* retry a transient network failure */ }
      if (active) timer = setTimeout(poll, 4000);
    };
    void poll();
    return () => { active = false; clearTimeout(timer); };
  }, [reference, token, router]);
  const failed = status === 'PAYMENT_FAILED' || status === 'CANCELLED';
  return <div className="py-16 text-center" aria-live="polite">
    <h1 className="font-display text-[26px] font-medium">{portuguese
      ? failed ? 'Pagamento não concluído' : 'A aguardar confirmação do pagamento'
      : failed ? 'Payment not completed' : 'Awaiting payment confirmation'}</h1>
    <p className="mt-3 text-muted-foreground">{portuguese
      ? 'A encomenda será criada assim que o pagamento for confirmado. Se já pagou, não repita o pagamento.'
      : 'Your order will be created once payment is confirmed. If you have already paid, do not pay again.'}</p>
    {status === 'CANCELLED' && <button className="mt-6 underline" onClick={() => {
      try { sessionStorage.removeItem('ecom-checkout-session-v2'); } catch { /* storage is optional */ }
      router.push(window.location.pathname.replace(/\/(success|sucesso)\/?$/, ''));
    }}>{portuguese ? 'Voltar ao checkout' : 'Return to checkout'}</button>}
  </div>;
}
