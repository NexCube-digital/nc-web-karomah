"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "axios";
import { loginCashier } from "@/lib/api";
import { getAuthToken, saveAuthSession } from "@/lib/auth";

export default function CashierLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (getAuthToken()) {
      router.replace("/kasir");
    }
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      const response = await loginCashier({ email, password });
      saveAuthSession(response.token, response.user);
      router.replace("/kasir");
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setErrorMessage(error.response?.data?.message || "Login gagal.");
      } else {
        setErrorMessage("Login gagal.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-white sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-4xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur">
          <span className="inline-flex rounded-full bg-orange-400/20 px-4 py-1 text-sm font-semibold text-orange-300">
            Area kasir aman
          </span>
          <h1 className="mt-5 text-4xl font-black tracking-tight sm:text-5xl">
            Login kasir untuk mengelola order, menu, dan printer struk.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
            Halaman kasir dipisah dari halaman pelanggan. Setelah login, kasir bisa memproses order,
            melakukan CRUD menu, dan menyiapkan cetak struk.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              ["Order masuk", "Monitoring antrean"],
              ["CRUD menu", "Tambah, edit, nonaktifkan"],
              ["Printer", "Persiapan struk dan print"],
            ].map(([title, description]) => (
              <div key={title} className="rounded-3xl border border-white/10 bg-black/20 p-4">
                <p className="font-semibold text-white">{title}</p>
                <p className="mt-2 text-sm text-slate-400">{description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-4xl bg-white p-8 text-slate-900 shadow-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-orange-600">
            Login kasir
          </p>
          <h2 className="mt-3 text-3xl font-black">Masuk ke dashboard</h2>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            Atur email dan password kasir di file env backend agar lebih aman saat produksi.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              placeholder="Email kasir"
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none placeholder:text-slate-400 focus:border-orange-300"
            />
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              placeholder="Password"
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none placeholder:text-slate-400 focus:border-orange-300"
            />

            {errorMessage && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                {errorMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-2xl bg-slate-950 px-4 py-3 font-semibold text-white transition hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Memproses login..." : "Masuk ke dashboard kasir"}
            </button>
          </form>

          <div className="mt-6 rounded-3xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
            Belum perlu akun pelanggan. Fokus saat ini: keamanan akses kasir, kontrol menu, dan proses transaksi.
          </div>

          <Link
            href="/"
            className="mt-6 inline-flex rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-orange-300 hover:text-orange-600"
          >
            Kembali ke halaman pemesanan
          </Link>
        </section>
      </div>
    </main>
  );
}
