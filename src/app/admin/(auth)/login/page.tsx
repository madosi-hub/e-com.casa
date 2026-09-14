import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getAdminSession } from '@/lib/admin/auth';
import { loginAdmin } from '../../actions';

export const metadata: Metadata = {
  title: 'Admin sign in',
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await getAdminSession()) redirect('/admin');
  const query = await searchParams;

  return (
    <div className="flex min-h-[80vh] items-center justify-center bg-neutral-100 px-4 py-12">
      <div className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">E-com.casa</p>
          <h1 className="mt-2 text-2xl font-semibold text-neutral-950">Operations</h1>
          <p className="mt-2 text-sm text-neutral-500">Restricted access for the commerce team.</p>
        </div>

        {query.error ? (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            Invalid password or too many attempts. Try again later.
          </div>
        ) : null}

        <form action={loginAdmin} className="space-y-5">
          <label className="block text-sm font-medium text-neutral-700">
            Password
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              autoFocus
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-neutral-500 focus:ring-2 focus:ring-neutral-200"
            />
          </label>
          <button
            type="submit"
            className="w-full rounded-lg bg-neutral-950 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800"
          >
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
}
