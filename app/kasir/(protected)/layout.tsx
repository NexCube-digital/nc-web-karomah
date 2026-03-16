"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronsLeft,
  ChevronsRight,
  ChevronDown,
  CircleUserRound,
  Layers3,
  House,
  LayoutDashboard,
  LogOut,
  Printer,
  ReceiptText,
  Rows3,
  UtensilsCrossed,
  History,
} from "lucide-react";
import { clearAuthSession, getPrinterReady, setPrinterReady } from "@/lib/auth";
import { useCashierSession } from "@/app/kasir/_hooks/useCashierSession";
import { CashierContextProvider } from "@/app/kasir/_context/CashierContext";
import { AddCartItemOptions, CartItem, Product } from "@/types";
import { Fragment, useEffect, useRef, useState } from "react";

const navItems = [
  { href: "/kasir", label: "Ringkasan", icon: LayoutDashboard },
  {
    label: "Antrean",
    icon: ReceiptText,
    children: [
      { href: "/kasir/orders", label: "Order" },
      { href: "/kasir/orders/new", label: "Baru" },
    ],
  },
  { href: "/kasir/history", label: "Riwayat", icon: History },
  { href: "/kasir/categories", label: "Kategori", icon: Layers3 },
  { href: "/kasir/menu", label: "Kelola Menu", icon: UtensilsCrossed },
  { href: "/kasir/printer", label: "Printer Struk", icon: Printer },
];

const headerCopyByRoute: Array<{
  href: string;
  eyebrow: string;
  title: string;
}> = [
  {
    href: "/kasir/orders/new",
    eyebrow: "Area Antrean",
    title: "Tambah pesanan baru",
  },
  {
    href: "/kasir/orders",
    eyebrow: "Area Antrean",
    title: "Antrean pesanan",
  },
  {
    href: "/kasir/history",
    eyebrow: "Area Riwayat",
    title: "Riwayat transaksi harian",
  },
  {
    href: "/kasir/categories",
    eyebrow: "Area Kategori",
    title: "Kelola kategori menu",
  },
  {
    href: "/kasir/menu",
    eyebrow: "Area Menu",
    title: "Kelola daftar menu",
  },
  {
    href: "/kasir/printer",
    eyebrow: "Area Printer",
    title: "Pengaturan printer struk",
  },
  {
    href: "/kasir",
    eyebrow: "Area Ringkasan",
    title: "Ringkasan operasional kasir",
  },
];

export default function ProtectedCashierLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { token, user, isChecking } = useCashierSession();
  const [printerConnected, setPrinterConnectedState] = useState(getPrinterReady);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isQueueMenuOpen, setIsQueueMenuOpen] = useState(false);
  const [isSidebarMinimized, setIsSidebarMinimized] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const isQueueMenuExpanded = pathname.startsWith("/kasir/orders") || isQueueMenuOpen;

  const headerCopy =
    headerCopyByRoute.find((item) => item.href !== "/kasir" && pathname.startsWith(item.href)) ||
    headerCopyByRoute.find((item) => item.href === "/kasir") || {
      eyebrow: "Area Operasional Kasir",
      title: "Kontrol Order, Menu, dan Printer",
    };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    }

    window.addEventListener("mousedown", handleClickOutside);
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function logout() {
    clearAuthSession();
    setCartItems([]);
    setIsProfileMenuOpen(false);
    router.replace("/kasir/login");
  }

  function addCartItem(product: Product, options?: AddCartItemOptions) {
    const variantKey = options?.variantKey?.trim() || "default";
    const cartKey = `${product.id}:${variantKey}`;
    const displayNameSuffix = options?.displayNameSuffix?.trim();

    setCartItems((currentCart) => {
      const existingItem = currentCart.find((item) => item.cartKey === cartKey);

      if (existingItem) {
        return currentCart.map((item) =>
          item.cartKey === cartKey ? { ...item, quantity: item.quantity + 1 } : item
        );
      }

      return [
        ...currentCart,
        {
          ...product,
          cartKey,
          chickenCut: options?.chickenCut,
          name: displayNameSuffix ? `${product.name} - ${displayNameSuffix}` : product.name,
          quantity: 1,
        },
      ];
    });
  }

  function updateCartItemQuantity(cartKey: string, delta: number) {
    setCartItems((currentCart) =>
      currentCart
        .map((item) =>
          item.cartKey === cartKey ? { ...item, quantity: item.quantity + delta } : item
        )
        .filter((item) => item.quantity > 0)
    );
  }

  function clearCartItems() {
    setCartItems([]);
  }

  async function connectPrinter() {
    try {
      const navigatorUsb = (
        navigator as Navigator & {
          usb?: {
            requestDevice(options: { filters: Array<Record<string, unknown>> }): Promise<{
              productName?: string;
            }>;
          };
        }
      ).usb;

      if (navigatorUsb) {
        await navigatorUsb.requestDevice({ filters: [] });
      }

      setPrinterReady(true);
      setPrinterConnectedState(true);
      setIsProfileMenuOpen(false);
    } catch {
      setPrinterReady(true);
      setPrinterConnectedState(true);
      setIsProfileMenuOpen(false);
    }
  }

  if (isChecking || !token || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10 sm:px-6 lg:px-8">
        <div className="w-full max-w-3xl text-center text-sm text-slate-500">
          Memuat dashboard kasir...
        </div>
      </main>
    );
  }

  return (
    <CashierContextProvider
      value={{
        token,
        user,
        printerConnected,
        setPrinterConnected: setPrinterConnectedState,
        connectPrinter,
        logout,
        cartItems,
        addCartItem,
        updateCartItemQuantity,
        clearCartItems,
      }}
    >
      <main className="min-h-screen bg-slate-100 text-slate-900">
        <div className="flex min-h-screen">
          <aside
            className={`sticky top-0 hidden h-screen shrink-0 flex-col border-r border-slate-800 bg-slate-950 text-white transition-all duration-300 xl:flex ${
              isSidebarMinimized ? "w-24" : "w-72"
            }`}
          >
            <div
              className={`border-b border-white/10 transition-all duration-300 ${
                isSidebarMinimized ? "px-3 py-4" : "px-6 py-6"
              }`}
            >
              <div className={`flex items-center gap-3 ${isSidebarMinimized ? "justify-center" : "justify-between"}`}>
                <div className="flex items-center gap-3">
                <Image src="/image/logo.svg" alt="Karomah Food" width={44} height={44} className="h-11 w-11" />
                  {!isSidebarMinimized && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-orange-300">
                        Admin Panel
                      </p>
                      <h1 className="mt-1 text-2xl font-black text-white">Dashboard Kasir</h1>
                    </div>
                  )}
                </div>

                {!isSidebarMinimized && (
                  <button
                    type="button"
                    onClick={() => setIsSidebarMinimized(true)}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 text-slate-300 transition hover:border-orange-300 hover:text-orange-300"
                    aria-label="Minimize sidebar"
                    title="Minimize sidebar"
                  >
                    <ChevronsLeft className="h-4 w-4" />
                  </button>
                )}
              </div>

              {isSidebarMinimized && (
                <button
                  type="button"
                  onClick={() => setIsSidebarMinimized(false)}
                  className="mt-3 inline-flex h-9 w-full items-center justify-center rounded-xl border border-white/10 text-slate-300 transition hover:border-orange-300 hover:text-orange-300"
                  aria-label="Perluas sidebar"
                  title="Perluas sidebar"
                >
                  <ChevronsRight className="h-4 w-4" />
                </button>
              )}
            </div>

            <nav
              className={`flex-1 space-y-2 transition-all duration-300 ${
                isSidebarMinimized ? "px-2 py-4" : "px-4 py-5"
              }`}
            >
              {navItems.map((item) => {
                const Icon = item.icon;

                if ("children" in item) {
                  const parentActive = item.children.some((child) => pathname === child.href);

                  if (isSidebarMinimized) {
                    const activeChild = item.children.find((child) => pathname === child.href) || item.children[0];

                    return (
                      <Link
                        key={item.label}
                        href={activeChild.href}
                        className={`flex items-center justify-center rounded-2xl px-2 py-3 text-sm font-semibold transition ${
                          parentActive
                            ? "bg-orange-400 text-slate-950"
                            : "text-slate-200 hover:bg-white/8 hover:text-white"
                        }`}
                        aria-label={item.label}
                        title={item.label}
                      >
                        <Icon className="h-4 w-4" />
                      </Link>
                    );
                  }

                  return (
                    <div key={item.label} className="space-y-2">
                      <button
                        type="button"
                        onClick={() => setIsQueueMenuOpen((current) => !current)}
                        className={`flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                          parentActive
                            ? "bg-orange-400 text-slate-950"
                            : "text-slate-200 hover:bg-white/8 hover:text-white"
                        }`}
                      >
                        <span className="inline-flex items-center gap-3">
                          <Icon className="h-4 w-4" />
                          {item.label}
                        </span>
                        <ChevronDown
                          className={`h-4 w-4 transition-transform ${
                            isQueueMenuExpanded ? "rotate-180" : "rotate-0"
                          }`}
                        />
                      </button>

                      {isQueueMenuExpanded && (
                        <div className="space-y-1 pl-6">
                          {item.children.map((child) => {
                            const childActive = pathname === child.href;

                            return (
                              <Link
                                key={child.href}
                                href={child.href}
                                className={`block rounded-xl px-3 py-2 text-sm font-semibold transition ${
                                  childActive
                                    ? "bg-orange-200 text-slate-950"
                                    : "text-slate-300 hover:bg-white/8 hover:text-white"
                                }`}
                              >
                                {child.label}
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                }

                const active = pathname === item.href;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center rounded-2xl py-3 text-sm font-semibold transition ${
                      isSidebarMinimized ? "justify-center px-2" : "gap-3 px-4"
                    } ${
                      active
                        ? "bg-orange-400 text-slate-950"
                        : "text-slate-200 hover:bg-white/8 hover:text-white"
                    }`}
                    aria-label={item.label}
                    title={item.label}
                  >
                    <Icon className="h-4 w-4" />
                    {!isSidebarMinimized && item.label}
                  </Link>
                );
              })}
            </nav>
          </aside>

          <div className="min-w-0 flex-1">
            <header className="sticky top-0 z-30 border-b border-slate-200 bg-slate-950 text-white shadow-sm">
              <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-white/10 p-3 text-orange-300">
                    <Rows3 className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-orange-300">
                      {headerCopy.eyebrow}
                    </p>
                    <h2 className="text-xl font-black text-white sm:text-2xl">
                      {headerCopy.title}
                    </h2>
                  </div>
                </div>

                <div className="relative flex flex-wrap items-center gap-2 sm:gap-3" ref={profileMenuRef}>
                  <Link
                    href="/"
                    className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm font-semibold text-white transition hover:border-orange-300 hover:text-orange-300"
                  >
                    <House className="h-4 w-4" />
                    Pelanggan
                  </Link>

                  <button
                    type="button"
                    onClick={() => setIsProfileMenuOpen((current) => !current)}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm font-semibold text-white transition hover:border-orange-300 hover:text-orange-300"
                  >
                    <CircleUserRound className="h-4 w-4" />
                    Profil
                    <ChevronDown className="h-4 w-4" />
                  </button>

                  {isProfileMenuOpen && (
                    <div className="absolute right-0 top-full z-40 mt-2 w-72 rounded-2xl border border-slate-700 bg-slate-900 p-3 text-white shadow-2xl">
                      <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                        <p className="text-sm font-bold text-white">{user.name}</p>
                        <p className="text-xs text-slate-300">{user.email}</p>
                      </div>

                      <div className="mt-3 space-y-2">
                        <button
                          type="button"
                          onClick={connectPrinter}
                          className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-semibold transition ${
                            printerConnected
                              ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                              : "bg-orange-100 text-orange-700 hover:bg-orange-200"
                          }`}
                        >
                          <span className="inline-flex items-center gap-2">
                            <Printer className="h-4 w-4" />
                            {printerConnected ? "Printer terhubung" : "Hubungkan printer"}
                          </span>
                          <span className="text-xs">{printerConnected ? "Hijau" : "Oranye"}</span>
                        </button>

                        <button
                          type="button"
                          onClick={logout}
                          className="flex w-full items-center gap-2 rounded-xl border border-rose-300/30 px-3 py-2 text-sm font-semibold text-rose-300 transition hover:bg-rose-500/10"
                        >
                          <LogOut className="h-4 w-4" />
                          Logout
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-white/10 px-4 py-3 sm:px-6 lg:px-8 xl:hidden">
                <div className="flex gap-1 overflow-x-auto">
                  {navItems.map((item) => {
                    const Icon = item.icon;

                    if ("children" in item) {
                      return (
                        <Fragment key={item.label}>
                          {item.children.map((child) => {
                            const active = pathname === child.href;

                            return (
                              <Link
                                key={child.href}
                                href={child.href}
                                className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                                  active
                                    ? "bg-orange-400 text-slate-950"
                                    : "bg-white/5 text-slate-200 hover:bg-white/10 hover:text-white"
                                }`}
                              >
                                <Icon className="h-4 w-4" />
                                {item.label}: {child.label}
                              </Link>
                            );
                          })}
                        </Fragment>
                      );
                    }

                    const active = pathname === item.href;

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                          active
                            ? "bg-orange-400 text-slate-950"
                            : "bg-white/5 text-slate-200 hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            </header>

            <section className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</section>
          </div>
        </div>
      </main>
    </CashierContextProvider>
  );
}
