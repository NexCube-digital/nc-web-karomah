"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchCashierHistory } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { OrderHistoryGroup } from "@/types";
import { useCashierContext } from "@/app/kasir/_context/CashierContext";
import { paymentLabels } from "@/app/kasir/_lib/cashierConstants";
import { ChevronDown, ChevronUp } from "lucide-react";

const statusLabels: Record<string, string> = {
  pending: "Pending",
  confirmed: "Dikonfirmasi",
  preparing: "Diproses",
  ready: "Siap",
  completed: "Selesai",
  cancelled: "Dibatalkan",
};

const statusColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  confirmed: "bg-sky-100 text-sky-700",
  preparing: "bg-indigo-100 text-indigo-700",
  ready: "bg-emerald-100 text-emerald-700",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-rose-100 text-rose-700",
};

function formatHistoryDate(dateStr: string) {
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(dateStr));
}

export default function CashierHistoryPage() {
  const { token } = useCashierContext();
  const [groups, setGroups] = useState<OrderHistoryGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchCashierHistory(token);
      setGroups(data);
      // Auto-expand the most recent day
      if (data.length > 0) {
        setExpandedDates(new Set([data[0].date]));
      }
    } catch {
      setError("Gagal memuat riwayat transaksi.");
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  function toggleDate(date: string) {
    setExpandedDates((current) => {
      const next = new Set(current);
      if (next.has(date)) {
        next.delete(date);
      } else {
        next.add(date);
      }
      return next;
    });
  }

  if (isLoading) {
    return (
      <section className="rounded-4xl bg-white p-8 text-sm text-slate-500 shadow-sm ring-1 ring-slate-100">
        Memuat riwayat transaksi...
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-4xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700 shadow-sm">
        {error}
      </section>
    );
  }

  if (groups.length === 0) {
    return (
      <section className="rounded-4xl bg-white p-10 text-center shadow-sm ring-1 ring-slate-100">
        <p className="text-slate-400 text-sm">Belum ada riwayat transaksi.</p>
        <p className="mt-1 text-xs text-slate-300">Riwayat akan muncul di sini setelah hari berganti.</p>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      {groups.map((group) => {
        const isExpanded = expandedDates.has(group.date);
        const completedCount = group.orders.filter((o) => o.status === "completed").length;
        const cancelledCount = group.orders.filter((o) => o.status === "cancelled").length;

        return (
          <div
            key={group.date}
            className="overflow-hidden rounded-4xl border border-slate-200 bg-white shadow-sm"
          >
            {/* Day header */}
            <button
              type="button"
              onClick={() => toggleDate(group.date)}
              className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left transition hover:bg-slate-50"
            >
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-600">
                  {group.date}
                </p>
                <h3 className="mt-0.5 text-lg font-bold text-slate-950">
                  {formatHistoryDate(group.date)}
                </h3>
                <div className="mt-2 flex flex-wrap gap-3 text-sm text-slate-500">
                  <span>
                    <span className="font-semibold text-slate-700">{group.totalOrders}</span> pesanan
                  </span>
                  <span>
                    <span className="font-semibold text-green-700">{completedCount}</span> selesai
                  </span>
                  <span>
                    <span className="font-semibold text-rose-600">{cancelledCount}</span> dibatalkan
                  </span>
                  <span>
                    Pendapatan:{" "}
                    <span className="font-semibold text-slate-900">
                      {formatCurrency(group.totalRevenue)}
                    </span>
                  </span>
                </div>
              </div>
              <div className="shrink-0 text-slate-400">
                {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </div>
            </button>

            {/* Order list */}
            {isExpanded && (
              <div className="border-t border-slate-100 px-6 pb-6 pt-4">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {group.orders.map((order) => (
                    <div
                      key={order.id}
                      className="rounded-3xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-600">
                            {order.orderNumber}
                          </p>
                          <h4 className="mt-0.5 truncate font-bold text-slate-900">
                            {order.customerName}
                          </h4>
                          <p className="text-xs text-slate-500">
                            {paymentLabels[order.paymentMethod]}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            {new Intl.DateTimeFormat("id-ID", {
                              hour: "2-digit",
                              minute: "2-digit",
                            }).format(new Date(order.createdAt))}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusColors[order.status] ?? "bg-slate-100 text-slate-600"}`}
                        >
                          {statusLabels[order.status] ?? order.status}
                        </span>
                      </div>

                      <div className="mt-3 space-y-1 rounded-2xl border border-slate-200 bg-white p-3 text-xs text-slate-600">
                        {order.items.map((item) => (
                          <div key={item.id} className="flex justify-between gap-2">
                            <span>
                              {item.quantity}x {item.productName}
                            </span>
                            <span className="shrink-0">{formatCurrency(item.lineTotal)}</span>
                          </div>
                        ))}
                      </div>

                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-xs text-slate-400">Total</span>
                        <span className="font-bold text-slate-900">
                          {formatCurrency(order.totalAmount)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}
