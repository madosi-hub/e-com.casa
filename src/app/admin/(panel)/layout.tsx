import Link from 'next/link';
import type { ReactNode } from 'react';
import { requireAdmin } from '@/lib/admin/auth';
import { logoutAdmin } from '../actions';

const NAV = [
  ['Dashboard', '/admin'],
  ['Products', '/admin/products'],
  ['Funnels', '/admin/funnels'],
  ['Orders', '/admin/orders'],
  ['Payments', '/admin/payments'],
  ['Customers', '/admin/customers'],
  ['Contacts', '/admin/contacts'],
] as const;

export const dynamic = 'force-dynamic';

export default async function AdminPanelLayout({ children }: { children: ReactNode }) {
  const session = await requireAdmin();

  return (
    <div className="min-h-screen bg-neutral-100 text-neutral-950">
      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        <aside className="hidden w-64 shrink-0 border-r border-neutral-200 bg-white lg:flex lg:flex-col">
          <div className="border-b border-neutral-200 px-6 py-6">
            <Link href="/admin" className="text-lg font-semibold tracking-tight">E-com.casa</Link>
            <p className="mt-1 text-xs uppercase tracking-wider text-neutral-400">Commerce operations</p>
          </div>
          <nav className="flex-1 space-y-1 p-4">
            {NAV.map(([label, href]) => (
              <Link key={href} href={href} className="block rounded-lg px-3 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-100 hover:text-neutral-950">{label}</Link>
            ))}
          </nav>
          <div className="border-t border-neutral-200 p-4">
            <p className="mb-3 truncate px-2 text-xs text-neutral-400">Operator: {session.operator}</p>
            <form action={logoutAdmin}>
              <button type="submit" className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50">Sign out</button>
            </form>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="border-b border-neutral-200 bg-white px-4 py-3 lg:hidden">
            <div className="flex gap-2 overflow-x-auto">
              {NAV.map(([label, href]) => <Link key={href} href={href} className="whitespace-nowrap rounded-md border border-neutral-200 px-3 py-2 text-xs font-medium">{label}</Link>)}
            </div>
          </header>
          <div className="p-5 sm:p-8 lg:p-10">{children}</div>
        </div>
      </div>
    </div>
  );
}
