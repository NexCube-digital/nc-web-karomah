"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

function shouldHideFooter(pathname: string) {
  return pathname === "/kasir" || (pathname.startsWith("/kasir/") && pathname !== "/kasir/login");
}

export function AppFooter() {
  const pathname = usePathname();

  if (shouldHideFooter(pathname)) {
    return null;
  }

  return (
    <footer className="border-t border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div className="flex items-center gap-3">
          <Image src="/image/logo.svg" alt="Karomah Food" width={44} height={44} className="h-11 w-11" />
          <div>
            <p className="text-sm font-black tracking-[0.18em] text-slate-950">KAROMAH FOOD</p>
            <p className="mt-1 text-sm text-slate-600">
              Pemesanan pelanggan dan dashboard kasir untuk operasional rumah makan.
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2 text-sm text-slate-600 sm:flex-row sm:items-center sm:gap-6">
          <Link href="/" className="font-semibold text-slate-700 transition hover:text-orange-600">
            Menu
          </Link>
          <Link href="/search" className="font-semibold text-slate-700 transition hover:text-orange-600">
            Cari Menu
          </Link>
          <Link href="/kasir/login" className="font-semibold text-slate-700 transition hover:text-orange-600">
            Login Kasir
          </Link>
        </div>
      </div>
      <div className="border-t border-slate-100 px-4 py-4 text-center text-xs text-slate-500 sm:px-6 lg:px-8">
        © 2026 Karomah Food. Semua hak operasional dikelola internal.
      </div>
    </footer>
  );
}
