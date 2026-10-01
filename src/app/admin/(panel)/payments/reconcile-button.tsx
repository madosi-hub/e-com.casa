'use client';

import { useFormStatus } from 'react-dom';

export function ReconcileButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="whitespace-nowrap rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs font-medium text-neutral-800 hover:bg-neutral-50 disabled:cursor-wait disabled:opacity-50"
    >
      {pending ? 'Consultando…' : 'Consultar XPayments'}
    </button>
  );
}
