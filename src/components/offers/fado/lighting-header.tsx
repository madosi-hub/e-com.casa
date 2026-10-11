'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ShoppingBag } from 'lucide-react';
import { useCart } from '@/lib/cart-store';
import { useCartDrawer } from '@/lib/cart-drawer-store';
import styles from './page.module.css';

export function LightingHeader() {
  const shell = useRef<HTMLDivElement>(null);
  const [floating, setFloating] = useState(false);
  const openCart = useCartDrawer(state => state.open);
  const count = useCart(state => state.lines.reduce((sum, line) => sum + line.quantity, 0));
  const hydrated = useCart(state => state.hydrated);

  useEffect(() => {
    const update = () => setFloating(Boolean(shell.current && shell.current.getBoundingClientRect().bottom <= 0));
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  return <div ref={shell} className={styles.headerShell}>
    <header className={styles.header} data-floating={floating}>
      <span className={styles.headerNote}>Objetos para viver bem.</span>
      <Link href="/" aria-label="E-com.casa — início" className={styles.headerLogo}><Image src="/images/logo-e-com-casa-preto.png" alt="E-com.casa" loading="eager" width={2172} height={724} className={styles.logo} /></Link>
      <button type="button" onClick={openCart} aria-label={`Abrir carrinho${hydrated && count ? `, ${count} artigos` : ''}`} className={styles.cartButton}>
        <ShoppingBag size={19} strokeWidth={1.5} /><span className={styles.cartLabel}>Carrinho</span><span className={styles.cartCount}>{hydrated ? count : 0}</span>
      </button>
    </header>
  </div>;
}
