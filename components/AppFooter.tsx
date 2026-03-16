"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageCircle, ShoppingBag } from "lucide-react";

function shouldHideFooter(pathname: string) {
  return pathname === "/kasir" || (pathname.startsWith("/kasir/") && pathname !== "/kasir/login");
}

export function AppFooter() {
  const pathname = usePathname();

  if (shouldHideFooter(pathname)) {
    return null;
  }

  return (
    <footer className="border-t border-[#e3d2ba] bg-[#fcf4e8]">
      <section className="bg-[#cc2e2e] text-[#fff7ea]">
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-12 sm:px-6 sm:py-14 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-8 lg:px-8">
          <div>
            <div className="inline-flex items-center gap-3 rounded-full bg-white/14 px-4 py-2 ring-1 ring-white/20 backdrop-blur">
              <Image src="/image/logo.svg" alt="Karomah Food" width={28} height={28} className="h-7 w-7 rounded-full bg-white/90 p-1" />
              <span className="text-sm font-semibold tracking-[0.16em] text-white">KAROMAH FOOD</span>
            </div>

            <h2 className="font-display mt-5 max-w-xl text-3xl font-semibold leading-tight sm:text-4xl">
              Rasa rumahan favorit pelangganmu, kini lebih mudah dipesan dari mana saja.
            </h2>

            <p className="mt-4 max-w-xl text-base leading-7 text-[#ffe8d1]/95 sm:text-lg">
              Hubungi kami langsung untuk pemesanan cepat atau kunjungi ShopeFOOD untuk promo dan pengantaran.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="https://wa.me/6289647173354?text=Halo%20Karomah%20Food%2C%20saya%20ingin%20pesan%20menu."
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-2xl bg-[#1f9d55] px-5 py-3 text-sm font-semibold text-white transition hover:scale-[1.02] hover:bg-[#178347]"
              >
                <MessageCircle className="h-4 w-4" />
                Chat WhatsApp
              </Link>
              <Link
                href="https://shopee.co.id/m/shopeefood"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-2xl bg-[#2f251d] px-5 py-3 text-sm font-semibold text-[#fff7ea] transition hover:scale-[1.02] hover:bg-[#1f1813]"
              >
                <ShoppingBag className="h-4 w-4" />
                ShopeFOOD
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-6 text-sm text-[#ffe8d1]">
              <Link href="/" className="font-semibold transition hover:text-white">
                Home
              </Link>
              <Link href="/search" className="font-semibold transition hover:text-white">
                Cari Menu
              </Link>
              <Link href="/kasir/login" className="font-semibold transition hover:text-white">
                Login Kasir
              </Link>
            </div>

            <p className="mt-7 max-w-xl text-sm leading-6 text-[#ffd9bc]">
              © 2026 Karomah Food. Seluruh layanan pemesanan digital dikelola untuk mendukung operasional UMKM makanan dan minuman.
            </p>
          </div>

          <div className="relative mx-auto w-full max-w-96">
            <div className="absolute -left-6 top-10 h-24 w-24 rounded-full bg-[#f3d7b3]/40 blur-2xl" />
            <div className="absolute -right-6 bottom-16 h-28 w-28 rounded-full bg-[#f3d7b3]/30 blur-2xl" />

            <div className="relative rounded-4xl border border-white/30 bg-white/95 p-3 shadow-[0_24px_60px_-32px_rgba(33,10,10,0.55)] sm:p-4">
              <div className="mx-auto w-full max-w-72 rounded-3xl border border-[#f0dfcb] bg-[#fffaf2] p-2 sm:p-3">
                <Image
                  src="/image/whatsapp-qr.png"
                  alt="QR WhatsApp Karomah Food"
                  width={768}
                  height={1178}
                  className="h-auto w-full rounded-2xl border border-[#ead7c2] bg-[#121212] object-contain"
                  sizes="(max-width: 1024px) 70vw, 288px"
                  onError={(event) => {
                    const target = event.currentTarget;
                    target.src = "/image/default.png";
                  }}
                />
                <p className="px-1 pt-3 text-center text-sm font-medium text-[#75695d]">
                  Pindai kode untuk memulai chat WhatsApp dengan Karomah Food.
                </p>
              </div>

            </div>
          </div>
        </div>
      </section>
    </footer>
  );
}
