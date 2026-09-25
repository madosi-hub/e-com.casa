'use client';

import { useFormStatus } from 'react-dom';

export function ReprocessUtmifyButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(event) => {
        if (!window.confirm('Reenviar esta venda para a UTMify? Faça isto apenas quando ela estiver ausente ou incorreta.')) {
          event.preventDefault();
        }
      }}
      className="whitespace-nowrap rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs font-semibold text-neutral-800 transition hover:bg-neutral-50 disabled:cursor-wait disabled:opacity-50"
    >
      {pending ? 'A enviar…' : 'Reprocessar'}
    </button>
  );
}
