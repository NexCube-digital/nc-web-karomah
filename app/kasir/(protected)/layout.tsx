"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
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
import { useEffect, useRef, useState } from "react";

const navItems = [
  { href: "/kasir", label: "Ringkasan", icon: LayoutDashboard },
  { href: "/kasir/orders", label: "Antrean Order", icon: ReceiptText },
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
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

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
    setIsProfileMenuOpen(false);
    router.replace("/kasir/login");
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
      }}
    >
      <main className="min-h-screen bg-slate-100 text-slate-900">
        <div className="flex min-h-screen">
          <aside className="sticky top-0 hidden h-screen w-72 shrink-0 flex-col border-r border-slate-800 bg-slate-950 text-white xl:flex">
            <div className="border-b border-white/10 px-6 py-6">
              <div className="flex items-center gap-3">
                <Image src="/image/logo.svg" alt="Karomah Food" width={44} height={44} className="h-11 w-11" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-orange-300">
                    Admin Panel
                  </p>
                  <h1 className="mt-1 text-2xl font-black text-white">Dashboard Kasir</h1>
                </div>
              </div>
            </div>

            <nav className="flex-1 space-y-2 px-4 py-5">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                      active
                        ? "bg-orange-400 text-slate-950"
                        : "text-slate-200 hover:bg-white/8 hover:text-white"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
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
