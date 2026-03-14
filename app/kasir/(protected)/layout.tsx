"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Layers3,
  House,
  LayoutDashboard,
  LogOut,
  Printer,
  ReceiptText,
  Rows3,
  UtensilsCrossed,
} from "lucide-react";
import { clearAuthSession, getPrinterReady, setPrinterReady } from "@/lib/auth";
import { useCashierSession } from "@/app/kasir/_hooks/useCashierSession";
import { CashierContextProvider } from "@/app/kasir/_context/CashierContext";
import { useState } from "react";

const navItems = [
  { href: "/kasir", label: "Ringkasan", icon: LayoutDashboard },
  { href: "/kasir/categories", label: "Kategori", icon: Layers3 },
  { href: "/kasir/menu", label: "Kelola Menu", icon: UtensilsCrossed },
  { href: "/kasir/orders", label: "Antrean Order", icon: ReceiptText },
  { href: "/kasir/printer", label: "Printer Struk", icon: Printer },
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

  function logout() {
    clearAuthSession();
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
    } catch {
      setPrinterReady(true);
      setPrinterConnectedState(true);
    }
  }

  if (isChecking || !token || !user) {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl rounded-4xl bg-white p-8 text-sm text-slate-500 shadow-sm">
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
        <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:px-8">
          <aside className="sticky top-6 hidden h-[calc(100vh-3rem)] w-72 shrink-0 flex-col rounded-4xl bg-slate-950 p-6 text-white shadow-2xl xl:flex">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.35em] text-orange-300">
                Karomah Food
              </p>
              <h1 className="mt-3 text-3xl font-black leading-tight">Dashboard Kasir</h1>
            </div>

            <div className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Login sebagai</p>
              <p className="mt-2 text-lg font-bold text-white">{user.name}</p>
              <p className="text-sm text-slate-300">{user.email}</p>
            </div>

            <nav className="mt-6 space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                      active
                        ? "bg-white text-slate-950"
                        : "text-white hover:bg-white/10 hover:text-orange-300"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="mt-auto space-y-3">
              <button
                type="button"
                onClick={connectPrinter}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-orange-300"
              >
                <Printer className="h-4 w-4" />
                {printerConnected ? "Printer terhubung" : "Hubungkan printer"}
              </button>
              <Link
                href="/"
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:border-orange-300 hover:text-orange-300"
              >
                <House className="h-4 w-4" />
                Halaman pelanggan
              </Link>
              <button
                type="button"
                onClick={logout}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:border-rose-300 hover:text-rose-300"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          </aside>

          <div className="min-w-0 flex-1 space-y-6">
            <header className="sticky top-4 z-20 rounded-[28px] border border-white/70 bg-white/90 p-4 shadow-lg backdrop-blur">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-slate-950 p-3 text-orange-300">
                    <Rows3 className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-600">
                      Panel operasional
                    </p>
                    <h2 className="text-xl font-black text-slate-950 sm:text-2xl">
                      Kasir & Manajemen Menu
                    </h2>
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-600">
                  Printer {printerConnected ? "siap" : "belum terhubung"}
                </div>
              </div>
            </header>

            {children}
          </div>
        </div>
      </main>
    </CashierContextProvider>
  );
}
