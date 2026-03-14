"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Pencil, Trash2 } from "lucide-react";
import { ProductThumbnail } from "@/components/ProductThumbnail";
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

function getMockRating(productId: number) {
  const rating = 4.6 + (productId % 5) * 0.1;
  return Math.min(rating, 5).toFixed(1);
}

export default function CashierMenuPage() {
  const { token } = useCashierContext();
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [menuForm, setMenuForm] = useState<MenuPayload>(emptyMenuForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
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

  const filteredProducts = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();

    if (!keyword) {
      return products;
    }

    return products.filter((product) => {
      const searchableText = [
        product.name,
        product.category,
        product.description || "",
        product.isAvailable ? "tersedia" : "nonaktif",
      ]
        .join(" ")
        .toLowerCase();

      return searchableText.includes(keyword);
    });
  }, [products, searchQuery]);

  const groupedProducts = useMemo(() => {
    return filteredProducts.reduce<Record<string, Product[]>>((accumulator, product) => {
      if (!accumulator[product.category]) {
        accumulator[product.category] = [];
      }

      accumulator[product.category].push(product);
      return accumulator;
    }, {});
  }, [filteredProducts]);

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
      setIsModalOpen(false);
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
    setIsModalOpen(true);
  }

  function openCreateModal() {
    setMenuForm(emptyMenuForm);
    setEditingId(null);
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
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
    <div className="space-y-6">
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
          <div key={label} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>
          </div>
        ))}
      </section>

      <section className="rounded-4xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-950">Daftar menu</h2>
              <p className="mt-1 text-sm text-slate-500">Kelola dan pantau menu per kategori.</p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <label className="w-full sm:min-w-72">
                <span className="sr-only">Cari menu</span>
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search menu..."
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none placeholder:text-slate-400 focus:border-orange-300"
                />
              </label>
              <button
                type="button"
                onClick={refreshProducts}
                className="inline-flex shrink-0 items-center justify-center rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-orange-300 hover:text-orange-600"
              >
                Refresh
              </button>
              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex shrink-0 items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-500"
              >
                Tambah menu
              </button>
            </div>
          </div>

          {isLoading ? (
            <p className="mt-4 text-sm text-slate-500">Memuat data menu...</p>
          ) : products.length === 0 ? (
            <p className="mt-4 rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
              Belum ada menu. Tambahkan menu baru dari tombol di atas.
            </p>
          ) : filteredProducts.length === 0 ? (
            <p className="mt-4 rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
              Tidak ada menu yang cocok dengan pencarian.
            </p>
          ) : (
            <div className="mt-5 space-y-8">
              {Object.entries(groupedProducts).map(([category, items]) => (
                <div key={category} className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-2xl font-bold text-slate-950">{category}</h3>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600">
                      {items.length} menu
                    </span>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {items.map((product) => (
                      <article
                        key={product.id}
                        className="overflow-hidden rounded-[30px] border border-slate-200 bg-white p-3 shadow-sm transition hover:shadow-md"
                      >
                        <div className="flex items-stretch gap-4 md:block md:gap-0">
                          <ProductThumbnail
                            src={product.imageUrl}
                            alt={product.name}
                            className="relative h-32 w-32 shrink-0 overflow-hidden rounded-3xl bg-slate-100 md:h-44 md:w-full md:rounded-2xl"
                            overlay={
                              <>
                                <div className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-3 py-1 text-xs font-bold text-slate-900 shadow-sm">
                                  ★ {getMockRating(product.id)}
                                </div>
                                <div
                                  className={`absolute right-3 top-3 rounded-full px-3 py-1 text-xs font-semibold shadow-sm ${
                                    product.isAvailable
                                      ? "bg-emerald-100 text-emerald-700"
                                      : "bg-slate-200 text-slate-600"
                                  }`}
                                >
                                  {product.isAvailable ? "Tersedia" : "Nonaktif"}
                                </div>
                              </>
                            }
                          />

                          <div className="flex min-w-0 flex-1 flex-col justify-between py-1 md:space-y-3 md:p-3">
                            <div>
                              <h4 className="line-clamp-2 text-lg font-bold leading-tight text-slate-950 md:text-2xl">
                                {product.name}
                              </h4>
                              <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600 md:line-clamp-3">
                                {product.description || "Belum ada deskripsi menu."}
                              </p>
                              <p className="mt-2 text-sm font-medium text-slate-500">{product.category}</p>
                            </div>

                            <div className="mt-3 flex items-end justify-between gap-3 md:mt-0">
                              <p className="text-base font-bold text-slate-950 md:text-lg">
                                {formatCurrency(product.price)}
                              </p>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleEditMenu(product)}
                                  className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 text-slate-700 transition hover:border-orange-300 hover:text-orange-600"
                                  aria-label={`Edit menu ${product.name}`}
                                  title="Edit menu"
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteMenu(product.id)}
                                  className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-rose-200 text-rose-700 transition hover:bg-rose-50"
                                  aria-label={`Hapus menu ${product.name}`}
                                  title="Hapus menu"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
      </section>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 p-4 backdrop-blur-sm" onClick={closeModal}>
          <div
            className="mx-auto w-full max-w-xl rounded-4xl border border-slate-200 bg-white p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={editingId ? "Edit menu" : "Tambah menu"}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-600">Form menu</p>
                <h2 className="mt-1 text-2xl font-bold text-slate-950">{editingId ? "Edit menu" : "Tambah menu"}</h2>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-orange-300 hover:text-orange-600"
              >
                Tutup
              </button>
            </div>

            <div className="mt-6 grid gap-4">
              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-700">Nama menu</span>
                <input
                  value={menuForm.name}
                  onChange={(event) => setMenuForm((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Contoh: Nasi Goreng"
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-orange-300"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-700">Kategori</span>
                <input
                  value={menuForm.category}
                  onChange={(event) => setMenuForm((current) => ({ ...current, category: event.target.value }))}
                  placeholder="Makanan / Minuman"
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-orange-300"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-700">Harga</span>
                <input
                  value={menuForm.price || ""}
                  onChange={(event) =>
                    setMenuForm((current) => ({
                      ...current,
                      price: Number(event.target.value || 0),
                    }))
                  }
                  type="number"
                  placeholder="25000"
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-orange-300"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-700">URL gambar</span>
                <input
                  value={menuForm.imageUrl || ""}
                  onChange={(event) => setMenuForm((current) => ({ ...current, imageUrl: event.target.value }))}
                  placeholder="https://..."
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-orange-300"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-700">Deskripsi menu</span>
                <textarea
                  value={menuForm.description || ""}
                  onChange={(event) => setMenuForm((current) => ({ ...current, description: event.target.value }))}
                  rows={3}
                  placeholder="Deskripsi singkat menu"
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-orange-300"
                />
              </label>
            </div>

            <label className="mt-5 inline-flex items-center gap-3 text-sm text-slate-600">
              <input
                checked={menuForm.isAvailable}
                onChange={(event) => setMenuForm((current) => ({ ...current, isAvailable: event.target.checked }))}
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-orange-500"
              />
              Menu tersedia untuk pelanggan
            </label>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setMenuForm(emptyMenuForm);
                  setEditingId(null);
                }}
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-orange-300 hover:text-orange-600"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={handleSaveMenu}
                disabled={isSavingMenu}
                className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSavingMenu ? "Menyimpan..." : editingId ? "Simpan perubahan" : "Tambah menu"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
