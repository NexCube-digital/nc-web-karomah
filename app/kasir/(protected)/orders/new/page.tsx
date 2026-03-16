"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { ArrowLeft, ShoppingCart, X } from "lucide-react";
import { ProductThumbnail } from "@/components/ProductThumbnail";
import { createOrder, fetchManagedCategories, fetchManagedProducts } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { Category, Order, Product } from "@/types";
import { useCashierContext } from "@/app/kasir/_context/CashierContext";
import { paymentLabels } from "@/app/kasir/_lib/cashierConstants";

export default function CashierCreateOrderPage() {
  const router = useRouter();
  const {
    token,
    cartItems,
    addCartItem,
    updateCartItemQuantity,
    clearCartItems,
  } = useCashierContext();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<Order["paymentMethod"]>("cash");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedChickenProduct, setSelectedChickenProduct] = useState<Product | null>(null);

  const refreshData = useCallback(async () => {
    const [managedProducts, managedCategories] = await Promise.all([
      fetchManagedProducts(token),
      fetchManagedCategories(token),
    ]);

    setProducts(managedProducts.filter((item) => item.isAvailable));
    setCategories(managedCategories);
  }, [token]);

  useEffect(() => {
    async function bootstrap() {
      try {
        setIsLoading(true);
        await refreshData();
      } finally {
        setIsLoading(false);
      }
    }

    bootstrap();
  }, [refreshData]);

  const categoryTabs = useMemo(() => {
    const categoriesFromProducts = Array.from(new Set(products.map((item) => item.category)));
    const categoriesFromManage = categories.map((item) => item.name);

    const merged = Array.from(new Set([...categoriesFromManage, ...categoriesFromProducts]));
    return ["all", ...merged];
  }, [categories, products]);

  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return products.filter((product) => {
      if (activeCategory !== "all" && product.category !== activeCategory) {
        return false;
      }

      if (!query) {
        return true;
      }

      return `${product.name} ${product.category}`.toLowerCase().includes(query);
    });
  }, [products, activeCategory, searchQuery]);

  const totalItems = useMemo(
    () => cartItems.reduce((total, item) => total + item.quantity, 0),
    [cartItems]
  );

  const subtotal = useMemo(
    () => cartItems.reduce((total, item) => total + item.price * item.quantity, 0),
    [cartItems]
  );

  const isChickenCategory = useCallback((product: Product) => {
    return product.category.trim().toLowerCase() === "ayam goreng";
  }, []);

  function handleAddProduct(product: Product) {
    if (isChickenCategory(product)) {
      setSelectedChickenProduct(product);
      return;
    }

    addCartItem(product);
  }

  function handleChooseChickenCut(cut: "dada" | "paha") {
    if (!selectedChickenProduct) {
      return;
    }

    const label = cut === "dada" ? "Dada" : "Paha";
    addCartItem(selectedChickenProduct, {
      variantKey: cut,
      displayNameSuffix: label,
      chickenCut: cut,
    });
    setSelectedChickenProduct(null);
  }

  async function handleSubmitOrder() {
    if (!customerName.trim()) {
      setErrorMessage("Nama pelanggan wajib diisi.");
      return;
    }

    if (cartItems.length === 0) {
      setErrorMessage("Keranjang masih kosong.");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      setFeedback(null);

      const response = await createOrder({
        customerName,
        notes,
        paymentMethod,
        items: cartItems.map((item) => ({
          productId: item.id,
          quantity: item.quantity,
        })),
      });

      clearCartItems();
      setCustomerName("");
      setNotes("");
      setPaymentMethod("cash");
      setFeedback(`Pesanan ${response.data.orderNumber} berhasil dibuat.`);
      router.push("/kasir/orders");
    } catch (error) {
      setFeedback(null);
      if (axios.isAxiosError(error)) {
        setErrorMessage(error.response?.data?.message || "Gagal menyimpan pesanan.");
      } else {
        setErrorMessage("Gagal menyimpan pesanan.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="space-y-4">
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

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-slate-200 bg-white p-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.push("/kasir/orders")}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-orange-300 hover:text-orange-600"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali
          </button>
          <p className="text-sm text-slate-500">Pilih menu, lalu simpan pesanan dari keranjang.</p>
        </div>

        <input
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Cari menu"
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-orange-300 lg:max-w-sm"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {categoryTabs.map((category) => {
              const active = activeCategory === category;

              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => setActiveCategory(category)}
                  className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                    active
                      ? "bg-slate-900 text-white"
                      : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-orange-50 hover:text-orange-700"
                  }`}
                >
                  {category === "all" ? "Semua" : category}
                </button>
              );
            })}
          </div>

          {isLoading ? (
            <div className="rounded-3xl bg-white p-6 text-sm text-slate-500 shadow-sm ring-1 ring-slate-100">
              Memuat menu...
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="rounded-3xl bg-white p-6 text-sm text-slate-500 shadow-sm ring-1 ring-slate-100">
              Menu tidak ditemukan untuk filter yang dipilih.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredProducts.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => handleAddProduct(product)}
                  className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:border-orange-300 hover:shadow-md"
                >
                  <ProductThumbnail
                    src={product.imageUrl}
                    alt={product.name}
                    className="h-36 w-full overflow-hidden rounded-2xl bg-slate-100"
                  />
                  <div className="mt-3 space-y-1">
                    <p className="line-clamp-2 text-sm font-bold text-slate-900">{product.name}</p>
                    <p className="text-xs text-slate-500">{product.category}</p>
                    <p className="text-sm font-bold text-slate-950">{formatCurrency(product.price)}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <aside className="xl:sticky xl:top-24">
          <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-600">Keranjang</p>
                <h3 className="mt-1 text-lg font-bold text-slate-950">Pesanan kasir</h3>
              </div>
              <div className="inline-flex items-center gap-2 rounded-2xl bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
                <ShoppingCart className="h-3.5 w-3.5" />
                {totalItems} item
              </div>
            </div>

            <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
              {cartItems.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                  Klik card menu untuk menambah item.
                </div>
              ) : (
                cartItems.map((item) => (
                  <div key={item.cartKey} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{item.name}</p>
                        <p className="text-xs text-slate-500">{formatCurrency(item.price)}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => updateCartItemQuantity(item.cartKey, -1)}
                          className="h-7 w-7 rounded-lg border border-slate-200 bg-white text-sm font-bold text-slate-700"
                        >
                          -
                        </button>
                        <span className="min-w-5 text-center text-sm font-semibold text-slate-900">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateCartItemQuantity(item.cartKey, 1)}
                          className="h-7 w-7 rounded-lg border border-slate-200 bg-white text-sm font-bold text-slate-700"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <input
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
                placeholder="Nama pelanggan"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-300"
              />
              <select
                value={paymentMethod}
                onChange={(event) => setPaymentMethod(event.target.value as Order["paymentMethod"])}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-300"
              >
                <option value="cash">{paymentLabels.cash}</option>
                <option value="qris">{paymentLabels.qris}</option>
                <option value="transfer">{paymentLabels.transfer}</option>
              </select>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={2}
                placeholder="Catatan pesanan"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-300"
              />
            </div>

            <div className="rounded-2xl bg-slate-950 p-4 text-white">
              <div className="flex items-center justify-between text-sm text-slate-300">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-lg font-bold">
                <span>Total</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <button
                type="button"
                onClick={handleSubmitOrder}
                disabled={isSubmitting}
                className="mt-4 w-full rounded-xl bg-orange-400 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-orange-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Menyimpan..." : "Simpan pesanan"}
              </button>
            </div>
          </div>
        </aside>
      </div>

      {selectedChickenProduct && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
          onClick={() => setSelectedChickenProduct(null)}
        >
          <div
            className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-600">
                  Pilih potongan ayam
                </p>
                <h3 className="mt-1 text-xl font-bold text-slate-950">{selectedChickenProduct.name}</h3>
                <p className="mt-2 text-sm text-slate-500">Pilih bagian sebelum dimasukkan ke keranjang.</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedChickenProduct(null)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:border-orange-300 hover:text-orange-600"
                aria-label="Tutup modal pilihan ayam"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleChooseChickenCut("dada")}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-orange-300 hover:text-orange-700"
              >
                Dada
              </button>
              <button
                type="button"
                onClick={() => handleChooseChickenCut("paha")}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-orange-300 hover:text-orange-700"
              >
                Paha
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
