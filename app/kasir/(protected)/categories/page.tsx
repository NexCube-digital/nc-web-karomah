"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { Pencil, Trash2 } from "lucide-react";
import {
  createCategory,
  deleteCategory,
  fetchManagedCategories,
  updateCategory,
} from "@/lib/api";
import { Category, CategoryPayload } from "@/types";
import { useCashierContext } from "@/app/kasir/_context/CashierContext";

const emptyForm: CategoryPayload = {
  name: "",
  imageUrl: "",
  isActive: true,
};

export default function CashierCategoriesPage() {
  const { token } = useCashierContext();
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [form, setForm] = useState<CategoryPayload>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const listSectionRef = useRef<HTMLDivElement | null>(null);

  const stats = useMemo(
    () => ({
      total: categories.length,
      active: categories.filter((category) => category.isActive).length,
      inactive: categories.filter((category) => !category.isActive).length,
    }),
    [categories]
  );

  const filteredCategories = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();

    if (!keyword) {
      return categories;
    }

    return categories.filter((category) => {
      const searchableText = [category.name, category.imageUrl || "", category.isActive ? "aktif" : "nonaktif"]
        .join(" ")
        .toLowerCase();

      return searchableText.includes(keyword);
    });
  }, [categories, searchQuery]);

  const refreshCategories = useCallback(async () => {
    const data = await fetchManagedCategories(token);
    setCategories(data);
  }, [token]);

  useEffect(() => {
    async function bootstrap() {
      try {
        setIsLoading(true);
        await refreshCategories();
      } finally {
        setIsLoading(false);
      }
    }

    bootstrap();
  }, [refreshCategories]);

  useEffect(() => {
    if (!feedback && !errorMessage) {
      return;
    }

    const timer = window.setTimeout(() => {
      setFeedback(null);
      setErrorMessage(null);
    }, 4500);

    return () => window.clearTimeout(timer);
  }, [feedback, errorMessage]);

  async function handleSaveCategory() {
    try {
      setIsSaving(true);
      setFeedback(null);
      setErrorMessage(null);

      if (editingId) {
        await updateCategory(editingId, form, token);
        setFeedback(`Kategori ${form.name} berhasil diperbarui.`);
      } else {
        await createCategory(form, token);
        setFeedback(`Kategori ${form.name} berhasil ditambahkan.`);
      }

      setForm(emptyForm);
      setEditingId(null);
      setIsModalOpen(false);
      await refreshCategories();
    } catch (error) {
      setFeedback(null);
      if (axios.isAxiosError(error)) {
        setErrorMessage(error.response?.data?.message || "Gagal menyimpan kategori.");
      } else {
        setErrorMessage("Gagal menyimpan kategori.");
      }
    } finally {
      setIsSaving(false);
    }
  }

  function handleEditCategory(category: Category) {
    setEditingId(category.id);
    setForm({
      name: category.name,
      imageUrl: category.imageUrl,
      isActive: category.isActive,
    });
    setIsModalOpen(true);
  }

  function openCreateModal() {
    setForm(emptyForm);
    setEditingId(null);
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
  }

  async function handleDeleteCategory(id: number) {
    const target = categories.find((category) => category.id === id);
    const confirmed = window.confirm("Hapus kategori ini?");

    if (!confirmed) {
      return;
    }

    try {
      await deleteCategory(id, token);
      setErrorMessage(null);
      setFeedback(`Kategori ${target?.name || ""} berhasil dihapus.`);
      await refreshCategories();
    } catch (error) {
      setFeedback(null);
      if (axios.isAxiosError(error)) {
        setErrorMessage(error.response?.data?.message || "Gagal menghapus kategori.");
      } else {
        setErrorMessage("Gagal menghapus kategori.");
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

      <section className="rounded-4xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="w-full sm:max-w-md">
            <span className="sr-only">Cari kategori</span>
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search kategori..."
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none placeholder:text-slate-400 focus:border-orange-300"
            />
          </label>
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex shrink-0 items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-500"
          >
            Tambah kategori
          </button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          ["Total kategori", `${stats.total} item`],
          ["Kategori aktif", `${stats.active} item`],
          ["Kategori nonaktif", `${stats.inactive} item`],
        ].map(([label, value]) => (
          <div key={label} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>
          </div>
        ))}
      </section>

      <section ref={listSectionRef} className="rounded-4xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold text-slate-950">Daftar kategori</h2>
              <p className="mt-1 text-sm text-slate-500">{filteredCategories.length} kategori ditampilkan</p>
            </div>
            <button
              type="button"
              onClick={refreshCategories}
              className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-orange-300 hover:text-orange-600"
            >
              Refresh
            </button>
          </div>

          {isLoading ? (
            <p className="mt-4 text-sm text-slate-500">Memuat data kategori...</p>
          ) : categories.length === 0 ? (
            <p className="mt-4 rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
              Belum ada kategori. Tambahkan kategori baru dari form di kiri.
            </p>
          ) : filteredCategories.length === 0 ? (
            <p className="mt-4 rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
              Tidak ada kategori yang cocok dengan pencarian.
            </p>
          ) : (
            <div className="mt-5 grid gap-4">
              {filteredCategories.map((category) => (
                <article key={category.id} className="rounded-3xl border border-slate-200 p-4 shadow-sm">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-4">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={category.imageUrl || "/image/default.png"}
                        alt={category.name}
                        className="h-16 w-16 rounded-2xl object-cover ring-2 ring-slate-100"
                        onError={(event) => {
                          event.currentTarget.src = "/image/default.png";
                        }}
                      />
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-bold text-slate-950">{category.name}</h3>
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              category.isActive
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-slate-200 text-slate-600"
                            }`}
                          >
                            {category.isActive ? "Aktif" : "Nonaktif"}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">Sumber gambar: {category.imageUrl || "default"}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleEditCategory(category)}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 text-slate-700 transition hover:border-orange-300 hover:text-orange-600"
                        aria-label={`Edit kategori ${category.name}`}
                        title="Edit kategori"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCategory(category.id)}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-rose-200 text-rose-700 transition hover:bg-rose-50"
                        aria-label={`Hapus kategori ${category.name}`}
                        title="Hapus kategori"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </article>
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
            aria-label={editingId ? "Edit kategori" : "Tambah kategori"}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-600">Form kategori</p>
                <h2 className="mt-1 text-2xl font-bold text-slate-950">
                  {editingId ? "Edit kategori" : "Tambah kategori"}
                </h2>
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
                <span className="text-sm font-semibold text-slate-700">Nama kategori</span>
                <input
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Contoh: Makanan"
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-orange-300"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-700">URL foto kategori</span>
                <input
                  value={form.imageUrl}
                  onChange={(event) => setForm((current) => ({ ...current, imageUrl: event.target.value }))}
                  placeholder="https://..."
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-orange-300"
                />
              </label>
            </div>

            <label className="mt-5 inline-flex items-center gap-3 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    isActive: event.target.checked,
                  }))
                }
                className="h-4 w-4 rounded border-slate-300 text-orange-500"
              />
              Kategori aktif ditampilkan di halaman pelanggan
            </label>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setForm(emptyForm);
                  setEditingId(null);
                }}
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-orange-300 hover:text-orange-600"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={handleSaveCategory}
                disabled={isSaving}
                className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? "Menyimpan..." : editingId ? "Simpan perubahan" : "Tambah kategori"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
