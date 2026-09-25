import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Concluir encomenda',
  description: 'Confirme os seus dados e conclua a sua encomenda E-com.casa em segurança.',
  robots: { index: false, follow: false },
};

export default function PainelRipadoCheckoutLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
