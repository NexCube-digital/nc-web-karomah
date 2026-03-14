"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  createMenuItem,
  deleteMenuItem,
  fetchManagedProducts,
  updateMenuItem,
} from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { MenuPayload, Product } from "@/types";
import { useCashierContext } from "@/app/kasir/_context/CashierContext";

const emptyMenuForm: MenuPayload = {
  name: "",
  description: "",
  category: "Makanan",
  price: 0,
  imageUrl: "",
  isAvailable: true,
};

export default function CashierMenuPage() {
  const { token } = useCashierContext();
  const [products, setProducts] = useState<Product[]>([]);
  const [menuForm, setMenuForm] = useState<MenuPayload>(emptyMenuForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingMenu, setIsSavingMenu] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!feedback && !errorMessage) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setFeedback(null);
      setErrorMessage(null);
    }, 4500);

    return () => window.clearTimeout(timeout);
  }, [feedback, errorMessage]);

  const productStats = useMemo(
    () => ({
      total: products.length,
      active: products.filter((product) => product.isAvailable).length,
      inactive: products.filter((product) => !product.isAvailable).length,
    }),
    [products]
  );

  const refreshProducts = useCallback(async () => {
    const nextProducts = await fetchManagedProducts(token);
    setProducts(nextProducts);
  }, [token]);

  useEffect(() => {
    async function bootstrap() {
      try {
        setIsLoading(true);
        await refreshProducts();
      } finally {
        setIsLoading(false);
      }
    }

    bootstrap();
  }, [refreshProducts]);

  async function handleSaveMenu() {
    try {
      setIsSavingMenu(true);
      setErrorMessage(null);
      setFeedback(null);

      if (editingId) {
        await updateMenuItem(editingId, menuForm, token);
        setFeedback(`Menu ${menuForm.name || ""} berhasil diperbarui.`);
      } else {
        await createMenuItem(menuForm, token);
        setFeedback(`Menu ${menuForm.name || ""} berhasil ditambahkan.`);
      }

      setMenuForm(emptyMenuForm);
      setEditingId(null);
      await refreshProducts();
    } catch (error) {
      setFeedback(null);
      if (axios.isAxiosError(error)) {
        setErrorMessage(error.response?.data?.message || "Gagal menyimpan menu.");
      } else {
        setErrorMessage("Gagal menyimpan menu.");
      }
    } finally {
      setIsSavingMenu(false);
    }
  }

  function handleEditMenu(product: Product) {
    setEditingId(product.id);
    setMenuForm({
      name: product.name,
      description: product.description || "",
      category: product.category,
      price: product.price,
      imageUrl: product.imageUrl || "",
      isAvailable: product.isAvailable,
    });
  }

  async function handleDeleteMenu(id: number) {
    const targetMenu = products.find((product) => product.id === id);
    const confirmed = window.confirm("Hapus menu ini?");

    if (!confirmed) {
      return;
    }

    try {
      await deleteMenuItem(id, token);
      setErrorMessage(null);
      setFeedback(`Menu ${targetMenu?.name || ""} berhasil dihapus.`);
      await refreshProducts();
    } catch (error) {
      setFeedback(null);
      if (axios.isAxiosError(error)) {
        setErrorMessage(error.response?.data?.message || "Gagal menghapus menu.");
      } else {
        setErrorMessage("Gagal menghapus menu.");
      }
    }
  }

  return (
    <>
      {(feedback || errorMessage) && (
        <div
          role="status"
          aria-live="polite"
          className={`rounded-2xl border px-4 py-3 text-sm font-medium ${
            errorMessage
              ? "border-rose-200 bg-rose-50 text-rose-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <span>{errorMessage || feedback}</span>
            <button
              type="button"
              onClick={() => {
                setFeedback(null);
                setErrorMessage(null);
              }}
              className="rounded-lg px-2 py-1 text-xs font-semibold opacity-80 transition hover:opacity-100"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-3">
        {[
          ["Total menu", `${productStats.total} item`],
          ["Menu aktif", `${productStats.active} item`],
          ["Menu nonaktif", `${productStats.inactive} item`],
        ].map(([label, value]) => (
          <div key={label} className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1.1fr]">
        <div className="rounded-4xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-600">
                Form menu
              </p>
              <h2 className="mt-1 text-2xl font-bold text-slate-950">{editingId ? "Edit menu" : "Tambah menu"}</h2>
            </div>
            <button
              type="button"
              onClick={() => {
                setMenuForm(emptyMenuForm);
                setEditingId(null);
              }}
              className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-orange-300 hover:text-orange-600"
            >
              Reset
            </button>
          </div>

          <div className="mt-6 grid gap-3">
            <input
              value={menuForm.name}
              onChange={(event) => setMenuForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="Nama menu"
              className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-orange-300"
            />
            <input
              value={menuForm.category}
              onChange={(event) => setMenuForm((current) => ({ ...current, category: event.target.value }))}
              placeholder="Kategori"
              className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-orange-300"
            />
            <input
              value={menuForm.price || ""}
              onChange={(event) =>
                setMenuForm((current) => ({
                  ...current,
                  price: Number(event.target.value || 0),
                }))
              }
              type="number"
              placeholder="Harga"
              className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-orange-300"
            />
            <input
              value={menuForm.imageUrl || ""}
              onChange={(event) => setMenuForm((current) => ({ ...current, imageUrl: event.target.value }))}
              placeholder="URL gambar"
              className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-orange-300"
            />
            <textarea
              value={menuForm.description || ""}
              onChange={(event) => setMenuForm((current) => ({ ...current, description: event.target.value }))}
              rows={3}
              placeholder="Deskripsi menu"
              className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-orange-300"
            />
          </div>

          <label className="mt-4 inline-flex items-center gap-3 text-sm text-slate-600">
            <input
              checked={menuForm.isAvailable}
              onChange={(event) => setMenuForm((current) => ({ ...current, isAvailable: event.target.checked }))}
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-orange-500"
            />
            Menu tersedia untuk pelanggan
          </label>

          <button
            type="button"
            onClick={handleSaveMenu}
            disabled={isSavingMenu}
            className="mt-5 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSavingMenu ? "Menyimpan..." : editingId ? "Simpan perubahan" : "Tambah menu"}
          </button>
        </div>

        <div className="rounded-4xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-2xl font-bold text-slate-950">Daftar menu</h2>
            <button
              type="button"
              onClick={refreshProducts}
              className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-orange-300 hover:text-orange-600"
            >
              Refresh
            </button>
          </div>

          {isLoading ? (
            <p className="mt-4 text-sm text-slate-500">Memuat data menu...</p>
          ) : (
            <div className="mt-5 grid gap-4">
              {products.map((product) => (
                <article key={product.id} className="rounded-3xl border border-slate-200 p-4">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-bold text-slate-950">{product.name}</h3>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            product.isAvailable
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-slate-200 text-slate-600"
                          }`}
                        >
                          {product.isAvailable ? "Tersedia" : "Nonaktif"}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-slate-500">{product.category}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        {product.description || "Belum ada deskripsi menu."}
                      </p>
                      <p className="mt-3 font-semibold text-slate-950">{formatCurrency(product.price)}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleEditMenu(product)}
                        className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-orange-300 hover:text-orange-600"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteMenu(product.id)}
                        className="rounded-2xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
