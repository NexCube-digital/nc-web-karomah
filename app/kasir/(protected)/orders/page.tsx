"use client";

import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import {
  fetchCashierOrders,
  fetchCashierSummary,
  fetchReceipt,
  updateCashierOrder,
} from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { DashboardSummary, Order } from "@/types";
import { useCashierContext } from "@/app/kasir/_context/CashierContext";
import { cashierSteps, escapeHtml, paymentLabels } from "@/app/kasir/_lib/cashierConstants";

export default function CashierOrdersPage() {
  const { token, printerConnected } = useCashierContext();
  const [orders, setOrders] = useState<Order[]>([]);
  const [summary, setSummary] = useState<DashboardSummary>({
    totalOrders: 0,
    totalRevenue: 0,
    byStatus: {},
  });
  const [isLoading, setIsLoading] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const refreshOrders = useCallback(async () => {
    const [nextOrders, nextSummary] = await Promise.all([
      fetchCashierOrders(token),
      fetchCashierSummary(token),
    ]);

    setOrders(nextOrders);
    setSummary(nextSummary);
  }, [token]);

  useEffect(() => {
    async function bootstrap() {
      try {
        setIsLoading(true);
        await refreshOrders();
      } finally {
        setIsLoading(false);
      }
    }

    bootstrap();
  }, [refreshOrders]);

  async function handleUpdateStatus(orderId: number, status: Order["status"]) {
    try {
      await updateCashierOrder(orderId, { status }, token);
      setFeedback("Status pesanan berhasil diperbarui.");
      setErrorMessage(null);
      await refreshOrders();
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setErrorMessage(error.response?.data?.message || "Gagal memperbarui status.");
      } else {
        setErrorMessage("Gagal memperbarui status.");
      }
    }
  }

  async function handleMarkPaid(orderId: number) {
    try {
      await updateCashierOrder(orderId, { paymentStatus: "paid" }, token);
      setFeedback("Status pembayaran berhasil diperbarui.");
      setErrorMessage(null);
      await refreshOrders();
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setErrorMessage(error.response?.data?.message || "Gagal memperbarui pembayaran.");
      } else {
        setErrorMessage("Gagal memperbarui pembayaran.");
      }
    }
  }

  async function handlePrint(orderId: number) {
    try {
      const receipt = await fetchReceipt(orderId, token);
      const printWindow = window.open("", "_blank", "width=420,height=720");

      if (!printWindow) {
        setErrorMessage("Popup diblokir browser. Izinkan popup untuk mencetak struk.");
        return;
      }

      printWindow.document.write(`
        <html>
          <head>
            <title>Struk ${escapeHtml(receipt.orderNumber)}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 24px; color: #0f172a; }
              h1 { font-size: 20px; margin-bottom: 8px; }
              pre { white-space: pre-wrap; font-size: 14px; line-height: 1.6; }
              .badge { display: inline-block; padding: 6px 10px; border-radius: 999px; background: #fed7aa; color: #9a3412; font-size: 12px; font-weight: 700; }
            </style>
          </head>
          <body>
            <span class="badge">Printer ${printerConnected ? "terhubung" : "siap browser print"}</span>
            <h1>Struk ${escapeHtml(receipt.orderNumber)}</h1>
            <pre>${escapeHtml(receipt.printableText)}</pre>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      setFeedback("Struk siap dicetak.");
      setErrorMessage(null);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setErrorMessage(error.response?.data?.message || "Gagal menyiapkan struk.");
      } else {
        setErrorMessage("Gagal menyiapkan struk.");
      }
    }
  }

  return (
    <>
      {(feedback || errorMessage) && (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm font-medium ${
            errorMessage
              ? "border-rose-200 bg-rose-50 text-rose-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
        >
          {errorMessage || feedback}
        </div>
      )}

      <section className="rounded-4xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-600">Order kasir</p>
            <h2 className="mt-1 text-2xl font-bold text-slate-950">Antrean pesanan</h2>
          </div>
          <button
            type="button"
            onClick={refreshOrders}
            className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-orange-300 hover:text-orange-600"
          >
            Refresh
          </button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            ["Pending", summary.byStatus.pending || 0],
            ["Diproses", (summary.byStatus.confirmed || 0) + (summary.byStatus.preparing || 0)],
            ["Siap", summary.byStatus.ready || 0],
            ["Selesai", summary.byStatus.completed || 0],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">{label}</p>
              <p className="mt-1 text-2xl font-bold text-slate-950">{value}</p>
            </div>
          ))}
        </div>
      </section>

      {isLoading ? (
        <section className="rounded-4xl bg-white p-8 text-sm text-slate-500 shadow-sm ring-1 ring-slate-100">
          Memuat antrean order...
        </section>
      ) : (
        <section className="space-y-4">
          {orders.length === 0 && (
            <div className="rounded-4xl bg-white p-6 text-sm text-slate-500 shadow-sm ring-1 ring-slate-100">
              Belum ada order masuk.
            </div>
          )}

          {orders.map((order) => (
            <article key={order.id} className="rounded-4xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-600">
                    {order.orderNumber}
                  </p>
                  <h3 className="mt-1 text-lg font-bold text-slate-950">{order.customerName}</h3>
                  <p className="text-sm text-slate-500">
                    {paymentLabels[order.paymentMethod]} • {order.paymentStatus}
                  </p>
                </div>
                <div className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold capitalize text-slate-700">
                  {order.status}
                </div>
              </div>

              <div className="mt-4 space-y-2 text-sm text-slate-600">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-4">
                    <span>
                      {item.quantity}x {item.productName}
                    </span>
                    <span>{formatCurrency(item.lineTotal)}</span>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {cashierSteps.map((step) => (
                  <button
                    key={step}
                    type="button"
                    onClick={() => handleUpdateStatus(order.id, step)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold capitalize transition ${
                      order.status === step
                        ? "bg-slate-950 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-orange-100 hover:text-orange-700"
                    }`}
                  >
                    {step}
                  </button>
                ))}
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-slate-50 p-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Total bayar</p>
                  <p className="mt-1 text-lg font-bold text-slate-950">{formatCurrency(order.totalAmount)}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleMarkPaid(order.id)}
                    disabled={order.paymentStatus === "paid"}
                    className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {order.paymentStatus === "paid" ? "Sudah lunas" : "Tandai lunas"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePrint(order.id)}
                    className="rounded-2xl bg-orange-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-orange-300"
                  >
                    Cetak struk
                  </button>
                </div>
              </div>
            </article>
          ))}
        </section>
      )}
    </>
  );
}
