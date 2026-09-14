"use client";

import { useEffect, useState } from "react";
import { Menu, X, House, PackageSearch, ShoppingCart } from "lucide-react";
import { useCart } from "@/lib/cart-store";
import { useNuraltaCart } from "./cart-overlay";

export function Header() {
  const cartCount = useCart((state) => state.lines.reduce((sum, line) => sum + line.quantity, 0));
  const { openNuraltaCart } = useNuraltaCart();
  const [visible, setVisible] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > 40);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <div
        className="fixed left-0 right-0 top-0 z-40 transition-all duration-200 ease-out"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(-100%)",
          visibility: visible ? "visible" : "hidden",
          pointerEvents: visible ? "auto" : "none",
        }}
        aria-hidden={!visible}
      >
        <header className="flex items-center justify-between border-b border-[#e6ded4] bg-[#f7f3ef]/95 px-4 py-1.5 backdrop-blur">
          <button
            type="button"
            aria-label="Abrir menu"
            onClick={() => setDrawerOpen(true)}
            className="rounded-full p-1.5 text-zinc-900 transition hover:bg-zinc-100 active:scale-95"
          >
            <Menu className="h-4 w-4" />
          </button>

          <a href="#top" className="flex items-center" aria-label="Nuralta Interiores — início">
            { }
            <img
              src="/pt/images/LOGO_PRETA.webp"
              alt="Nuralta Interiores"
              className="h-10 object-contain"
            />
          </a>

          <button
            type="button"
            aria-label="Carrinho"
            data-cart-target="true"
            onClick={openNuraltaCart}
            className="relative rounded-full p-1.5 text-zinc-900 transition hover:bg-zinc-100 active:scale-95"
          >
            <ShoppingCart className="h-4 w-4" />
            {cartCount > 0 && <span className="absolute -right-1.5 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-[#201a17] px-1 text-[9px] font-bold text-white">{cartCount}</span>}
          </button>
        </header>
      </div>

      {/* Mobile / slide-in drawer */}
      <div
        className={`fixed inset-0 z-50 ${drawerOpen ? "" : "pointer-events-none"}`}
        aria-hidden={!drawerOpen}
      >
        <div
          className={`absolute inset-0 bg-black/50 transition-opacity duration-200 ${
            drawerOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setDrawerOpen(false)}
        />
        <aside
          className={`absolute left-0 top-0 h-full w-[300px] bg-white shadow-2xl transition-transform duration-200 ease-out ${
            drawerOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
            { }
            <img
              src="/pt/images/LOGO_PRETA.webp"
              alt="Nuralta Interiores"
              className="h-12 object-contain"
            />
            <button
              type="button"
              aria-label="Fechar menu"
              onClick={() => setDrawerOpen(false)}
              className="rounded-full p-1.5 text-zinc-500 transition hover:bg-zinc-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <nav className="flex flex-col gap-1 p-3">
            <a
              href="#top"
              onClick={() => setDrawerOpen(false)}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              <House className="h-5 w-5" />
              Início
            </a>
            <a
              href="/account/orders"
              onClick={() => setDrawerOpen(false)}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              <PackageSearch className="h-5 w-5" />
              As minhas encomendas
            </a>
          </nav>
        </aside>
      </div>
    </>
  );
}
