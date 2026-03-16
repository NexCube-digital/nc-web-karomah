"use client";

import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import axios from "axios";
import { ImagePlus, Pencil, Trash2, X } from "lucide-react";
import { CrudToast } from "@/components/CrudToast";
import {
  createCategory,
  deleteCategory,
  fetchManagedCategories,
  updateCategory,
} from "@/lib/api";
import { Category, CategoryPayload } from "@/types";
import { useCashierContext } from "@/app/kasir/_context/CashierContext";

type CategoryFormState = CategoryPayload & {
  existingImageUrl: string;
};

const acceptedImageTypes = new Set(["image/jpeg", "image/png", "image/svg+xml"]);

const emptyForm: CategoryFormState = {
  name: "",
  imageUrl: "",
  imageFile: null,
  removeImage: false,
  existingImageUrl: "",
  isActive: true,
};

export default function CashierCategoriesPage() {
  const { token } = useCashierContext();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [form, setForm] = useState<CategoryFormState>(emptyForm);
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

      resetForm();
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

  function resetForm() {
    setForm((current) => {
      if (current.imageUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(current.imageUrl);
      }
      return emptyForm;
    });
  }

  function handleSelectedFile(file: File | null) {
    if (!file) {
      return;
    }

    if (!acceptedImageTypes.has(file.type)) {
      setErrorMessage("Foto kategori harus berformat JPG, JPEG, PNG, atau SVG.");
      return;
    }

    setErrorMessage(null);
    setForm((current) => {
      if (current.imageUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(current.imageUrl);
      }

      return {
        ...current,
        imageFile: file,
        imageUrl: URL.createObjectURL(file),
        removeImage: false,
      };
    });
  }

  function handleFileInputChange(event: ChangeEvent<HTMLInputElement>) {
    handleSelectedFile(event.target.files?.[0] || null);
    event.target.value = "";
  }

  function handleRemoveImage() {
    setForm((current) => {
      if (current.imageUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(current.imageUrl);
      }

      return {
        ...current,
        imageUrl: "",
        imageFile: null,
        existingImageUrl: "",
        removeImage: true,
      };
    });
  }

  useEffect(() => {
    return () => {
      if (form.imageUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(form.imageUrl);
      }
    };
  }, [form.imageUrl]);

  function handleEditCategory(category: Category) {
    setEditingId(category.id);
    setForm({
      name: category.name,
      imageUrl: category.imageUrl,
      imageFile: null,
      removeImage: false,
      existingImageUrl: category.imageUrl,
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
      <CrudToast
        message={errorMessage || feedback}
        isError={Boolean(errorMessage)}
        onClose={() => {
          setFeedback(null);
          setErrorMessage(null);
        }}
      />

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
                        src={
                          category.imageUrl?.startsWith("/uploads/")
                            ? `http://localhost:4000${category.imageUrl}`
                            : category.imageUrl || "/image/default.png"
                        }
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

              <div className="space-y-2">
                <span className="text-sm font-semibold text-slate-700">Foto kategori</span>
                {form.imageUrl && !form.removeImage && (
                  <div className="relative inline-block">
                    {form.imageUrl.startsWith("blob:") ? (
                      // Blob URL (preview before upload)
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={form.imageUrl}
                        alt={form.name}
                        className="h-32 w-32 rounded-2xl border border-slate-200 object-cover"
                      />
                    ) : form.imageUrl.startsWith("/uploads/") ? (
                      // Uploaded image from server
                      <Image
                        src={`http://localhost:4000${form.imageUrl}`}
                        alt={form.name}
                        width={128}
                        height={128}
                        className="h-32 w-32 rounded-2xl border border-slate-200 object-cover"
                      />
                    ) : (
                      // External URL
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={form.imageUrl}
                        alt={form.name}
                        className="h-32 w-32 rounded-2xl border border-slate-200 object-cover"
                      />
                    )}
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="absolute -right-2 -top-2 rounded-full bg-rose-500 p-1 text-white transition hover:bg-rose-600"
                      aria-label="Hapus foto"
                      title="Hapus foto"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}

                {!form.imageUrl || form.removeImage ? (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 px-4 py-6 text-slate-500 transition hover:border-orange-300 hover:bg-orange-50"
                  >
                    <ImagePlus className="h-6 w-6" />
                    <span className="text-sm font-medium">Pilih foto kategori</span>
                    <span className="text-xs">JPG, JPEG, PNG, atau SVG</span>
                  </button>
                ) : null}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,.svg"
                  onChange={handleFileInputChange}
                  className="hidden"
                  aria-label="Upload foto kategori"
                />
              </div>
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
                  resetForm();
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
