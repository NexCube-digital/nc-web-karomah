"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
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
  const [form, setForm] = useState<CategoryPayload>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const stats = useMemo(
    () => ({
      total: categories.length,
      active: categories.filter((category) => category.isActive).length,
      inactive: categories.filter((category) => !category.isActive).length,
    }),
    [categories]
  );

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
          ["Total kategori", `${stats.total} item`],
          ["Kategori aktif", `${stats.active} item`],
          ["Kategori nonaktif", `${stats.inactive} item`],
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
                Form kategori
              </p>
              <h2 className="mt-1 text-2xl font-bold text-slate-950">
                {editingId ? "Edit kategori" : "Tambah kategori"}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => {
                setForm(emptyForm);
                setEditingId(null);
              }}
              className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-orange-300 hover:text-orange-600"
            >
              Reset
            </button>
          </div>

          <div className="mt-6 grid gap-3">
            <input
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="Nama kategori"
              className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-orange-300"
            />
            <input
              value={form.imageUrl}
              onChange={(event) => setForm((current) => ({ ...current, imageUrl: event.target.value }))}
              placeholder="URL foto kategori"
              className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-orange-300"
            />
          </div>

          <label className="mt-4 inline-flex items-center gap-3 text-sm text-slate-600">
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

          <button
            type="button"
            onClick={handleSaveCategory}
            disabled={isSaving}
            className="mt-5 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? "Menyimpan..." : editingId ? "Simpan perubahan" : "Tambah kategori"}
          </button>
        </div>

        <div className="rounded-4xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-2xl font-bold text-slate-950">Daftar kategori</h2>
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
          ) : (
            <div className="mt-5 grid gap-4">
              {categories.map((category) => (
                <article key={category.id} className="rounded-3xl border border-slate-200 p-4">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="flex items-start gap-4">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={category.imageUrl}
                        alt={category.name}
                        className="h-16 w-16 rounded-full object-cover ring-2 ring-slate-100"
                      />
                      <div>
                        <div className="flex items-center gap-2">
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
                        <p className="mt-1 text-sm text-slate-500">Foto kategori tersimpan di URL.</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleEditCategory(category)}
                        className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-orange-300 hover:text-orange-600"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCategory(category.id)}
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
