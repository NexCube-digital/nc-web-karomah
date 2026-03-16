"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BarChart3, ClipboardList, ReceiptText, UtensilsCrossed } from "lucide-react";
import { fetchCashierOrders, fetchCashierSummary, fetchManagedProducts } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { DashboardSummary, Order, Product } from "@/types";
import { useCashierContext } from "@/app/kasir/_context/CashierContext";
import { useCashierEvents } from "@/app/kasir/_hooks/useCashierEvents";

export default function CashierOverviewPage() {
  const { token } = useCashierContext();
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [summary, setSummary] = useState<DashboardSummary>({
    totalOrders: 0,
    totalRevenue: 0,
    byStatus: {},
  });
  const [isLoading, setIsLoading] = useState(true);

  const refreshDashboard = useCallback(async () => {
    const [nextOrders, nextSummary, nextProducts] = await Promise.all([
      fetchCashierOrders(token),
      fetchCashierSummary(token),
      fetchManagedProducts(token),
    ]);

    setOrders(nextOrders);
    setSummary(nextSummary);
    setProducts(nextProducts);
  }, [token]);

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
        await refreshDashboard();
      } finally {
        setIsLoading(false);
      }
    }

    bootstrap();
  }, [refreshDashboard]);

  useCashierEvents({
    token,
    enabled: Boolean(token),
    onEvent: refreshDashboard,
  });

  const pendingOrders = useMemo(
    () => orders.filter((order) => order.status === "pending"),
    [orders]
  );

  const paymentTotals = useMemo(
    () =>
      orders.reduce(
        (accumulator, order) => {
          accumulator[order.paymentMethod] += order.totalAmount;
          return accumulator;
        },
        {
          cash: 0,
          qris: 0,
          transfer: 0,
        } as Record<Order["paymentMethod"], number>
      ),
    [orders]
  );

  const summaryCards = [
    { label: "Total order", value: summary.totalOrders, icon: ClipboardList },
    { label: "Omzet hari ini", value: formatCurrency(summary.totalRevenue), icon: ReceiptText },
    { label: "Menu aktif", value: `${productStats.active} item`, icon: UtensilsCrossed },
    { label: "Menu nonaktif", value: `${productStats.inactive} item`, icon: BarChart3 },
  ];

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
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

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_320px]">
        <div className="rounded-4xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-600">
                Order terbaru
              </p>
              <h2 className="mt-1 text-2xl font-bold text-slate-950">Antrean pelanggan</h2>
              <p className="mt-2 text-xs text-slate-500">Data diperbarui otomatis saat order baru masuk.</p>
            </div>
            <span className="rounded-2xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-600">
              {pendingOrders.length} order
            </span>
          </div>

          {isLoading ? (
            <p className="mt-6 text-sm text-slate-500">Memuat data ringkasan...</p>
          ) : pendingOrders.length === 0 ? (
            <p className="mt-6 text-sm text-slate-500">Belum ada order dengan status pending.</p>
          ) : (
            <div className="mt-6 grid gap-3">
              {pendingOrders.slice(0, 5).map((order) => (
                <div key={order.id} className="rounded-3xl border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-500">Menu dipesan</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {order.items.map((item) => (
                          <span
                            key={item.id}
                            className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700"
                          >
                            {item.quantity}x {item.productName}
                          </span>
                        ))}
                      </div>
                      <p className="mt-2 text-sm text-slate-600">Pelanggan: {order.customerName}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold capitalize text-slate-700">
                        {order.status}
                      </span>
                      <p className="mt-3 text-sm font-semibold text-slate-900">
                        {formatCurrency(order.totalAmount)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <aside className="rounded-4xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-600">
                Nominal transaksi
              </p>
              <h2 className="mt-1 text-2xl font-bold text-slate-950">Berdasarkan metode bayar</h2>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {[
              { label: "Tunai", value: paymentTotals.cash },
              { label: "QRIS", value: paymentTotals.qris },
              { label: "Transfer bank", value: paymentTotals.transfer },
            ].map((item) => (
              <div key={item.label} className="rounded-3xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">{item.label}</p>
                <p className="mt-2 text-2xl font-bold text-slate-950">{formatCurrency(item.value)}</p>
              </div>
            ))}
          </div>
        </aside>
      </section>
    </div>
  );
}
