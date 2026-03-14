"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart3, ClipboardList, ReceiptText, UtensilsCrossed } from "lucide-react";
import { fetchCashierOrders, fetchCashierSummary, fetchManagedProducts } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { DashboardSummary, Order, Product } from "@/types";
import { useCashierContext } from "@/app/kasir/_context/CashierContext";

export default function CashierOverviewPage() {
  const { token, user } = useCashierContext();
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [summary, setSummary] = useState<DashboardSummary>({
    totalOrders: 0,
    totalRevenue: 0,
    byStatus: {},
  });
  const [isLoading, setIsLoading] = useState(true);

  const productStats = useMemo(
    () => ({
      total: products.length,
      active: products.filter((product) => product.isAvailable).length,
      inactive: products.filter((product) => !product.isAvailable).length,
    }),
    [products]
  );

  useEffect(() => {
    async function bootstrap() {
      try {
        setIsLoading(true);
        const [nextOrders, nextSummary, nextProducts] = await Promise.all([
          fetchCashierOrders(token),
          fetchCashierSummary(token),
          fetchManagedProducts(token),
        ]);

        setOrders(nextOrders);
        setSummary(nextSummary);
        setProducts(nextProducts);
      } finally {
        setIsLoading(false);
      }
    }

    bootstrap();
  }, [token]);

  return (
    <>
      <section className="rounded-4xl bg-slate-950 p-8 text-white shadow-2xl">
        <span className="inline-flex rounded-full bg-orange-400/20 px-4 py-1 text-sm font-semibold text-orange-300">
          Selamat datang, {user.name}
        </span>
        <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">
          Ringkasan operasional kasir hari ini.
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300">
          Dashboard sudah dipisah per halaman agar lebih rapi. Gunakan sidebar untuk akses kelola menu,
          antrean order, dan pengaturan printer.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Total order", value: summary.totalOrders, icon: ClipboardList },
          { label: "Omzet", value: formatCurrency(summary.totalRevenue), icon: ReceiptText },
          { label: "Menu aktif", value: `${productStats.active} item`, icon: UtensilsCrossed },
          { label: "Menu nonaktif", value: `${productStats.inactive} item`, icon: BarChart3 },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-slate-500">{label}</p>
              <span className="rounded-2xl bg-orange-50 p-2 text-orange-600">
                <Icon className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-4 text-2xl font-bold text-slate-950">{value}</p>
          </div>
        ))}
      </section>

      <section className="rounded-4xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-2xl font-bold text-slate-950">Antrean terbaru</h2>
          <span className="rounded-2xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-600">
            {orders.length} order
          </span>
        </div>

        {isLoading ? (
          <p className="mt-4 text-sm text-slate-500">Memuat data ringkasan...</p>
        ) : orders.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">Belum ada order masuk.</p>
        ) : (
          <div className="mt-4 grid gap-3">
            {orders.slice(0, 5).map((order) => (
              <div key={order.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-slate-900">{order.orderNumber}</p>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold capitalize text-slate-700">
                    {order.status}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-600">{order.customerName}</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {formatCurrency(order.totalAmount)}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
