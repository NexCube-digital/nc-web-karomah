"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  createOrder,
  fetchCashierOrders,
  fetchManagedProducts,
  fetchReceipt,
  updateCashierOrder,
} from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { Order, Product } from "@/types";
import { useCashierContext } from "@/app/kasir/_context/CashierContext";
import { escapeHtml, paymentLabels } from "@/app/kasir/_lib/cashierConstants";
import { useCashierEvents } from "@/app/kasir/_hooks/useCashierEvents";

const cashierStatusActions: Array<{ label: string; value: Order["status"] }> = [
  { label: "Pending", value: "pending" },
  { label: "Selesai", value: "completed" },
  { label: "Batal", value: "cancelled" },
];

export default function CashierOrdersPage() {
  const { token, printerConnected } = useCashierContext();
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [activeCategory, setActiveCategory] = useState<Order["status"]>("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState<number | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<Order["paymentMethod"]>("cash");
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [draftItems, setDraftItems] = useState<Array<{ productId: number; quantity: number }>>([]);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const refreshOrders = useCallback(async () => {
    const nextOrders = await fetchCashierOrders(token);
    setOrders(nextOrders);
  }, [token]);

  const loadProducts = useCallback(async () => {
    const managedProducts = await fetchManagedProducts(token);
    setProducts(managedProducts.filter((product) => product.isAvailable));
  }, [token]);

  useEffect(() => {
    async function bootstrap() {
      try {
        setIsLoading(true);
        await Promise.all([refreshOrders(), loadProducts()]);
      } finally {
        setIsLoading(false);
      }
    }

    bootstrap();
  }, [refreshOrders, loadProducts]);

  useCashierEvents({
    token,
    enabled: Boolean(token),
    onEvent: refreshOrders,
  });

  const filteredOrders = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return orders.filter((order) => {
      if (order.status !== activeCategory) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const searchableText = `${order.orderNumber} ${order.customerName}`.toLowerCase();
      return searchableText.includes(normalizedQuery);
    });
  }, [orders, activeCategory, searchQuery]);

  const draftSubtotal = useMemo(() => {
    const productMap = new Map(products.map((product) => [product.id, product]));
    return draftItems.reduce((total, item) => {
      const product = productMap.get(item.productId);
      if (!product) {
        return total;
      }
      return total + product.price * item.quantity;
    }, 0);
  }, [draftItems, products]);

  const draftDisplayItems = useMemo(() => {
    const productMap = new Map(products.map((product) => [product.id, product]));
    return draftItems
      .map((item) => {
        const product = productMap.get(item.productId);
        if (!product) {
          return null;
        }

        return {
          ...item,
          product,
          lineTotal: product.price * item.quantity,
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));
  }, [draftItems, products]);

  async function handleMarkPaid(orderId: number) {
    try {
      await updateCashierOrder(orderId, { status: "completed", paymentStatus: "paid" }, token);
      setFeedback("Pesanan ditandai lunas dan status menjadi selesai.");
      setErrorMessage(null);
      await refreshOrders();
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setErrorMessage(error.response?.data?.message || "Gagal menandai lunas.");
      } else {
        setErrorMessage("Gagal menandai lunas.");
      }
    }
  }

  async function handleCancelOrder(orderId: number) {
    try {
      window.alert("Pesanan akan dibatalkan.");
      await updateCashierOrder(orderId, { status: "cancelled" }, token);
      setFeedback("Pesanan berhasil dibatalkan.");
      setErrorMessage(null);
      await refreshOrders();
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setErrorMessage(error.response?.data?.message || "Gagal membatalkan pesanan.");
      } else {
        setErrorMessage("Gagal membatalkan pesanan.");
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

  function resetOrderForm() {
    setEditingOrderId(null);
    setCustomerName("");
    setNotes("");
    setPaymentMethod("cash");
    setSelectedProductId(null);
    setSelectedQuantity(1);
    setDraftItems([]);
  }

  function openCreateModal() {
    resetOrderForm();
    setIsOrderModalOpen(true);
    setErrorMessage(null);
    if (products.length === 0) {
      void loadProducts();
    }
  }

  function openEditModal(order: Order) {
    setEditingOrderId(order.id);
    setIsOrderModalOpen(true);
    setCustomerName(order.customerName);
    setNotes(order.notes || "");
    setPaymentMethod(order.paymentMethod);
    setSelectedProductId(null);
    setSelectedQuantity(1);
    setDraftItems(order.items.map((item) => ({ productId: item.productId, quantity: item.quantity })));
    setErrorMessage(null);
    if (products.length === 0) {
      void loadProducts();
    }
  }

  function closeOrderModal() {
    setIsOrderModalOpen(false);
    resetOrderForm();
  }

  function addDraftItem() {
    if (!selectedProductId || selectedQuantity <= 0) {
      return;
    }

    setDraftItems((currentItems) => {
      const existingItem = currentItems.find((item) => item.productId === selectedProductId);

      if (existingItem) {
        return currentItems.map((item) =>
          item.productId === selectedProductId
            ? { ...item, quantity: item.quantity + selectedQuantity }
            : item
        );
      }

      return [...currentItems, { productId: selectedProductId, quantity: selectedQuantity }];
    });

    setSelectedQuantity(1);
  }

  function updateDraftQuantity(productId: number, delta: number) {
    setDraftItems((currentItems) =>
      currentItems
        .map((item) =>
          item.productId === productId ? { ...item, quantity: item.quantity + delta } : item
        )
        .filter((item) => item.quantity > 0)
    );
  }

  async function submitOrderForm() {
    if (!customerName.trim()) {
      setErrorMessage("Nama pelanggan wajib diisi.");
      return;
    }

    if (draftItems.length === 0) {
      setErrorMessage("Tambahkan minimal satu menu ke pesanan.");
      return;
    }

    try {
      setIsSubmittingOrder(true);
      if (editingOrderId) {
        await updateCashierOrder(
          editingOrderId,
          {
            customerName,
            notes,
            paymentMethod,
            items: draftItems,
          },
          token
        );
        setFeedback("Pesanan berhasil diperbarui.");
      } else {
        await createOrder({
          customerName,
          notes,
          paymentMethod,
          items: draftItems,
        });
        setFeedback("Pesanan baru berhasil ditambahkan.");
      }

      setErrorMessage(null);
      closeOrderModal();
      await refreshOrders();
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setErrorMessage(error.response?.data?.message || "Gagal menyimpan pesanan.");
      } else {
        setErrorMessage("Gagal menyimpan pesanan.");
      }
    } finally {
      setIsSubmittingOrder(false);
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

      {isLoading ? (
        <section className="rounded-4xl bg-white p-8 text-sm text-slate-500 shadow-sm ring-1 ring-slate-100">
          Memuat antrean order...
        </section>
      ) : (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-slate-200 bg-white p-4">
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Cari berdasarkan nama pelanggan atau nomor order"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-orange-300 lg:max-w-md"
            />
            <button
              type="button"
              onClick={openCreateModal}
              className="rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-500"
            >
              Tambah pesanan
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {cashierStatusActions.map((category) => (
              <button
                key={category.value}
                type="button"
                onClick={() => setActiveCategory(category.value)}
                className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                  activeCategory === category.value
                    ? "bg-slate-900 text-white"
                    : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-orange-50 hover:text-orange-700"
                }`}
              >
                {category.label}
              </button>
            ))}
          </div>

          {filteredOrders.length === 0 && (
            <div className="rounded-4xl bg-white p-6 text-sm text-slate-500 shadow-sm ring-1 ring-slate-100">
              Belum ada antrean dengan kategori {cashierStatusActions.find((item) => item.value === activeCategory)?.label?.toLowerCase()}.
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredOrders.map((order) => (
            <article key={order.id} className="rounded-4xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-600">
                    {order.orderNumber}
                  </p>
                  <h3 className="mt-1 text-lg font-bold text-slate-950">{order.customerName}</h3>
                  <p className="text-sm text-slate-500">
                    {paymentLabels[order.paymentMethod]} • {order.paymentStatus}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {new Intl.DateTimeFormat("id-ID", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    }).format(new Date(order.createdAt))}
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-3xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Rincian menu
                </p>
                <div className="mt-3 space-y-2 text-sm text-slate-600">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-4">
                    <span>
                      {item.quantity}x {item.productName}
                    </span>
                    <span>{formatCurrency(item.lineTotal)}</span>
                  </div>
                ))}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-slate-50 p-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Total bayar</p>
                  <p className="mt-1 text-lg font-bold text-slate-950">{formatCurrency(order.totalAmount)}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => openEditModal(order)}
                    disabled={order.status !== "pending"}
                    className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-sky-300 hover:text-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMarkPaid(order.id)}
                    disabled={order.status !== "pending"}
                    className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {order.status === "completed" ? "Sudah selesai" : "Tandai lunas"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePrint(order.id)}
                    className="rounded-2xl bg-orange-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-orange-300"
                  >
                    Cetak struk
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCancelOrder(order.id)}
                    disabled={order.status !== "pending"}
                    className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Batal
                  </button>
                </div>
              </div>
            </article>
          ))}
          </div>
        </section>
      )}

      {isOrderModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/50 p-4 backdrop-blur-sm"
          onClick={closeOrderModal}
        >
          <div
            className="mx-auto max-h-[calc(100vh-2rem)] w-full max-w-3xl overflow-y-auto rounded-4xl border border-slate-200 bg-white p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-600">
                  {editingOrderId ? "Edit pesanan" : "Buat pesanan"}
                </p>
                <h3 className="mt-1 text-2xl font-bold text-slate-950">
                  {editingOrderId ? "Edit detail pesanan" : "Tambah pesanan baru"}
                </h3>
              </div>
              <button
                type="button"
                onClick={closeOrderModal}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:border-orange-300 hover:text-orange-600"
              >
                Tutup
              </button>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-2">
              <input
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
                placeholder="Nama pelanggan"
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-orange-300"
              />
              <select
                value={paymentMethod}
                onChange={(event) => setPaymentMethod(event.target.value as Order["paymentMethod"])}
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-orange-300"
              >
                <option value="cash">Tunai</option>
                <option value="qris">QRIS</option>
                <option value="transfer">Transfer</option>
              </select>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={3}
                placeholder="Catatan pesanan"
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-orange-300 md:col-span-2"
              />
            </div>

            <div className="mt-6 rounded-3xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Tambah menu</p>
              <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_120px_auto]">
                <select
                  value={selectedProductId ?? ""}
                  onChange={(event) => setSelectedProductId(event.target.value ? Number(event.target.value) : null)}
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-orange-300"
                >
                  <option value="">Pilih menu</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} - {formatCurrency(product.price)}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={1}
                  value={selectedQuantity}
                  onChange={(event) => setSelectedQuantity(Number(event.target.value) || 1)}
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-orange-300"
                />
                <button
                  type="button"
                  onClick={addDraftItem}
                  className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-500"
                >
                  Tambah item
                </button>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              {draftDisplayItems.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                  Belum ada item di pesanan.
                </div>
              ) : (
                draftDisplayItems.map((item) => (
                  <div
                    key={item.productId}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4"
                  >
                    <div>
                      <p className="font-semibold text-slate-900">{item.product.name}</p>
                      <p className="text-sm text-slate-500">{formatCurrency(item.lineTotal)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => updateDraftQuantity(item.productId, -1)}
                        className="h-8 w-8 rounded-xl border border-slate-200 text-slate-700"
                      >
                        -
                      </button>
                      <span className="min-w-5 text-center text-sm font-semibold text-slate-900">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateDraftQuantity(item.productId, 1)}
                        className="h-8 w-8 rounded-xl border border-slate-200 text-slate-700"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-slate-950 p-4 text-white">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-300">Total draft</p>
                <p className="mt-1 text-xl font-bold">{formatCurrency(draftSubtotal)}</p>
              </div>
              <button
                type="button"
                onClick={submitOrderForm}
                disabled={isSubmittingOrder}
                className="rounded-2xl bg-orange-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-orange-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmittingOrder ? "Menyimpan..." : editingOrderId ? "Simpan perubahan" : "Simpan pesanan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
