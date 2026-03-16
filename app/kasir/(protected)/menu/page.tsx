"use client";

import { ChangeEvent, DragEvent, KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { ImagePlus, Pencil, ShoppingCart, Trash2, Upload, X } from "lucide-react";
import { ProductThumbnail } from "@/components/ProductThumbnail";
import { CrudToast } from "@/components/CrudToast";
import {
  createOrder,
  createMenuItem,
  deleteMenuItem,
  fetchManagedCategories,
  fetchManagedProducts,
  updateMenuItem,
} from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { Category, MenuPayload, Order, Product } from "@/types";
import { useCashierContext } from "@/app/kasir/_context/CashierContext";

type MenuFormState = MenuPayload & {
  existingImageUrl: string;
};

const acceptedImageTypes = new Set(["image/jpeg", "image/png", "image/svg+xml"]);

const emptyMenuForm: MenuFormState = {
  name: "",
  description: "",
  category: "",
  price: 0,
  rating: null,
  imageUrl: "",
  imageFile: null,
  removeImage: false,
  existingImageUrl: "",
  isAvailable: true,
};

function formatProductRating(rating: number | null | undefined) {
  if (typeof rating !== "number" || Number.isNaN(rating) || rating <= 0) {
    return "Baru";
  }

  return rating.toFixed(1);
}

export default function CashierMenuPage() {
  const { token, addCartItem, cartItems, updateCartItemQuantity, clearCartItems } = useCashierContext();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [menuForm, setMenuForm] = useState<MenuFormState>(emptyMenuForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCartModalOpen, setIsCartModalOpen] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const [isPreviewMenuOpen, setIsPreviewMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingMenu, setIsSavingMenu] = useState(false);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<Order["paymentMethod"]>("cash");
  const [selectedChickenProduct, setSelectedChickenProduct] = useState<Product | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (menuForm.imageUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(menuForm.imageUrl);
      }
    };
  }, [menuForm.imageUrl]);

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

  useEffect(() => {
    const shouldLockScroll = isModalOpen || isCartModalOpen || Boolean(selectedChickenProduct);

    if (!shouldLockScroll) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isModalOpen, isCartModalOpen, selectedChickenProduct]);

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

  const totalCartItems = useMemo(
    () => cartItems.reduce((total, item) => total + item.quantity, 0),
    [cartItems]
  );

  const cartSubtotal = useMemo(
    () => cartItems.reduce((total, item) => total + item.price * item.quantity, 0),
    [cartItems]
  );

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

  const refreshCategories = useCallback(async () => {
    const nextCategories = await fetchManagedCategories(token);
    setCategories(nextCategories);
  }, [token]);

  const availableCategories = useMemo(() => categories, [categories]);

  useEffect(() => {
    async function bootstrap() {
      try {
        setIsLoading(true);
        await Promise.all([refreshProducts(), refreshCategories()]);
      } finally {
        setIsLoading(false);
      }
    }

    bootstrap();
  }, [refreshProducts, refreshCategories]);

  useEffect(() => {
    if (menuForm.category || availableCategories.length === 0) {
      return;
    }

    setMenuForm((current) => ({
      ...current,
      category: availableCategories[0]?.name || "",
    }));
  }, [availableCategories, menuForm.category]);

  function setImagePreview(file: File | null, fallbackUrl = menuForm.existingImageUrl) {
    setMenuForm((current) => {
      if (current.imageUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(current.imageUrl);
      }

      return {
        ...current,
        imageFile: file,
        imageUrl: file ? URL.createObjectURL(file) : fallbackUrl,
        removeImage: false,
      };
    });
  }

  function handleSelectedFile(file: File | null) {
    if (!file) {
      return;
    }

    if (!acceptedImageTypes.has(file.type)) {
      setErrorMessage("Foto menu harus berformat JPG, JPEG, PNG, atau SVG.");
      return;
    }

    setErrorMessage(null);
    setImagePreview(file);
  }

  function handleFileInputChange(event: ChangeEvent<HTMLInputElement>) {
    handleSelectedFile(event.target.files?.[0] || null);
    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    setIsDragActive(false);
    handleSelectedFile(event.dataTransfer.files?.[0] || null);
  }

  function handleDropzoneKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      fileInputRef.current?.click();
    }
  }

  function resetMenuForm() {
    setMenuForm((current) => {
      if (current.imageUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(current.imageUrl);
      }

      return emptyMenuForm;
    });

    setIsPreviewMenuOpen(false);
  }

  function handleRemoveImage() {
    setMenuForm((current) => {
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

    setIsPreviewMenuOpen(false);
  }

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

      resetMenuForm();
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
      rating: product.rating,
      imageUrl: product.imageUrl || "",
      imageFile: null,
      removeImage: false,
      existingImageUrl: product.imageUrl || "",
      isAvailable: product.isAvailable,
    });
    setIsPreviewMenuOpen(false);
    setIsModalOpen(true);
  }

  function openCreateModal() {
    resetMenuForm();
    setEditingId(null);
    setIsPreviewMenuOpen(false);
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setIsDragActive(false);
    setIsPreviewMenuOpen(false);
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

  function isChickenCategory(product: Product) {
    return product.category.trim().toLowerCase() === "ayam goreng";
  }

  function handleAddToCart(product: Product) {
    if (isChickenCategory(product)) {
      setSelectedChickenProduct(product);
      return;
    }

    addCartItem(product);
    setErrorMessage(null);
    setFeedback(`${product.name} ditambahkan ke keranjang kasir.`);
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
    setErrorMessage(null);
    setFeedback(`${selectedChickenProduct.name} - ${label} ditambahkan ke keranjang kasir.`);
    setSelectedChickenProduct(null);
  }

  async function handleSubmitCartOrder() {
    if (!customerName.trim()) {
      setErrorMessage("Nama pelanggan wajib diisi.");
      return;
    }

    if (cartItems.length === 0) {
      setErrorMessage("Keranjang masih kosong.");
      return;
    }

    try {
      setIsSubmittingOrder(true);
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
      setIsCartModalOpen(false);
      setFeedback(`Pesanan ${response.data.orderNumber} berhasil dibuat.`);
    } catch (error) {
      setFeedback(null);
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
    <div className="space-y-6">
      <CrudToast
        message={errorMessage || feedback}
        isError={Boolean(errorMessage)}
        onClose={() => {
          setFeedback(null);
          setErrorMessage(null);
        }}
      />

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
                onClick={() => setIsCartModalOpen(true)}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-orange-300 hover:text-orange-600"
              >
                <ShoppingCart className="h-4 w-4" />
                Keranjang
                {totalCartItems > 0 && (
                  <span className="rounded-full bg-orange-500 px-2 py-0.5 text-[11px] font-bold text-white">
                    {totalCartItems}
                  </span>
                )}
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

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                    {items.map((product) => (
                      <article
                        key={product.id}
                        onClick={() => handleAddToCart(product)}
                        className="h-full overflow-hidden rounded-[28px] border border-slate-200 bg-white p-2.5 shadow-sm transition hover:shadow-md"
                      >
                        <div className="flex items-stretch gap-3 md:block md:gap-0">
                          <ProductThumbnail
                            src={product.imageUrl}
                            alt={product.name}
                            className="relative h-28 w-28 shrink-0 overflow-hidden rounded-3xl bg-slate-100 md:h-32 md:w-full md:rounded-2xl"
                            overlay={
                              <>
                                <div className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-bold text-slate-900 shadow-sm">
                                  {typeof product.rating === "number" && product.rating > 0 ? "★" : "☆"} {formatProductRating(product.rating)}
                                </div>
                                <div
                                  className={`absolute right-2 top-2 rounded-full px-2.5 py-1 text-[11px] font-semibold shadow-sm ${
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

                          <div className="flex min-w-0 flex-1 flex-col justify-between py-1 md:h-33 md:p-2.5">
                            <div className="space-y-1.5">
                              <h4 className="line-clamp-2 min-h-10 text-base font-bold leading-tight text-slate-950 md:min-h-11 md:text-lg">
                                {product.name}
                              </h4>
                              <p className="text-xs font-medium text-slate-500">{product.category}</p>
                            </div>

                            <div className="mt-2.5 flex items-end justify-between gap-2 md:mt-auto">
                              <p className="text-sm font-bold text-slate-950 md:text-base">
                                {formatCurrency(product.price)}
                              </p>
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    handleEditMenu(product);
                                  }}
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-slate-200 text-slate-700 transition hover:border-orange-300 hover:text-orange-600"
                                  aria-label={`Edit menu ${product.name}`}
                                  title="Edit menu"
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    handleDeleteMenu(product.id);
                                  }}
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-rose-200 text-rose-700 transition hover:bg-rose-50"
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
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-sm" onClick={closeModal}>
          <div
            className="mx-auto w-full max-w-6xl rounded-4xl border border-slate-200 bg-white p-6 shadow-2xl"
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

            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.svg,image/jpeg,image/png,image/svg+xml"
              onChange={handleFileInputChange}
              className="hidden"
            />

            <div className="mt-6 grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
              <section className="space-y-4 rounded-[28px] border border-slate-200 bg-slate-50 p-4">
                <div className="border-b border-slate-200 pb-3">
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-600">Preview menu</p>
                  <p className="mt-1 text-xs text-slate-500">Tampilan foto utama di sisi kiri modal.</p>
                </div>

                {menuForm.imageUrl ? (
                  <button
                    type="button"
                    onClick={() => setIsPreviewMenuOpen((current) => !current)}
                    className="group relative block w-full overflow-hidden rounded-[26px] border border-slate-200 bg-white text-left shadow-sm"
                  >
                    <ProductThumbnail
                      src={menuForm.imageUrl}
                      alt={menuForm.name || "Preview foto menu"}
                      className="h-64 w-full bg-white"
                      overlay={
                        <div className="absolute inset-0 bg-slate-950/0 transition group-hover:bg-slate-950/10" />
                      }
                    />
                    <div className="absolute bottom-3 left-3 rounded-full bg-white/95 px-3 py-1 text-[11px] font-semibold text-slate-800 shadow-sm">
                      Klik preview untuk aksi foto
                    </div>

                    {isPreviewMenuOpen && (
                      <div className="absolute inset-x-3 top-3 z-10 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            fileInputRef.current?.click();
                          }}
                          className="rounded-full bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-800 shadow-sm transition hover:bg-orange-50 hover:text-orange-700"
                        >
                          Update image
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleRemoveImage();
                          }}
                          className="rounded-full bg-rose-50 px-3 py-1.5 text-[11px] font-semibold text-rose-700 shadow-sm transition hover:bg-rose-100"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(event) => {
                      event.preventDefault();
                      setIsDragActive(true);
                    }}
                    onDragLeave={(event) => {
                      event.preventDefault();
                      setIsDragActive(false);
                    }}
                    onDrop={handleDrop}
                    onKeyDown={handleDropzoneKeyDown}
                    className={`flex h-64 w-full flex-col items-center justify-center gap-3 rounded-[26px] border border-dashed bg-white px-5 text-center transition ${
                      isDragActive
                        ? "border-orange-400 bg-orange-50 text-orange-700"
                        : "border-slate-300 text-slate-500 hover:border-orange-300 hover:text-orange-600"
                    }`}
                  >
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 text-orange-500 shadow-sm">
                      <Upload className="h-7 w-7" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold">Klik atau seret foto ke area ini</p>
                      <p className="text-xs text-slate-500">JPG, JPEG, PNG, SVG. Maksimal 4 MB.</p>
                    </div>
                  </button>
                )}

                <div className="space-y-3">
                  <div className="flex gap-3 overflow-x-auto pb-1">
                    <button
                      type="button"
                      onClick={() => setIsPreviewMenuOpen((current) => !current)}
                      className={`shrink-0 overflow-hidden rounded-2xl border p-1 transition ${
                        menuForm.imageUrl
                          ? "border-orange-300 bg-white shadow-sm"
                          : "border-slate-200 bg-white"
                      }`}
                    >
                      <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl bg-slate-100">
                        {menuForm.imageUrl ? (
                          <ProductThumbnail
                            src={menuForm.imageUrl}
                            alt={menuForm.name || "Thumbnail foto menu"}
                            className="h-full w-full bg-white"
                          />
                        ) : (
                          <ImagePlus className="h-5 w-5 text-slate-400" />
                        )}
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex h-18.5 w-18.5 shrink-0 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white text-slate-500 transition hover:border-orange-300 hover:text-orange-600"
                    >
                      <Upload className="h-4 w-4" />
                      <span className="mt-1 text-[10px] font-semibold">Upload</span>
                    </button>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Penilaian bintang
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setMenuForm((current) => ({ ...current, rating: star }))}
                          className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border text-lg transition ${
                            (menuForm.rating || 0) >= star
                              ? "border-amber-300 bg-amber-50 text-amber-500"
                              : "border-slate-200 bg-white text-slate-300 hover:border-amber-200 hover:text-amber-400"
                          }`}
                          aria-label={`Set rating ${star} bintang`}
                        >
                          ★
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setMenuForm((current) => ({ ...current, rating: null }))}
                        className="ml-1 rounded-xl border border-slate-200 px-2.5 py-2 text-xs font-semibold text-slate-600 transition hover:border-orange-300 hover:text-orange-600"
                      >
                        Reset
                      </button>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      Nilai saat ini: {formatProductRating(menuForm.rating)}
                    </p>
                  </div>
                </div>
              </section>

              <section className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2 md:col-span-2">
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
                    <select
                      value={menuForm.category}
                      onChange={(event) => setMenuForm((current) => ({ ...current, category: event.target.value }))}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-orange-300"
                      disabled={availableCategories.length === 0}
                    >
                      {availableCategories.length === 0 ? (
                        <option value="">Belum ada kategori tersedia</option>
                      ) : (
                        availableCategories.map((category) => (
                          <option key={category.id} value={category.name}>
                            {category.name}{category.isActive ? "" : " (nonaktif)"}
                          </option>
                        ))
                      )}
                    </select>
                    <p className="text-xs text-slate-500">
                      Kategori diambil dari data pada halaman kategori.
                    </p>
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

                  <label className="space-y-2 md:col-span-2">
                    <span className="text-sm font-semibold text-slate-700">Deskripsi menu</span>
                    <textarea
                      value={menuForm.description || ""}
                      onChange={(event) => setMenuForm((current) => ({ ...current, description: event.target.value }))}
                      rows={8}
                      placeholder="Deskripsi singkat menu"
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-orange-300"
                    />
                  </label>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">Status menu</p>
                      <p className="mt-1 text-xs text-slate-500">Atur apakah menu tampil untuk pelanggan.</p>
                    </div>
                    <label className="inline-flex items-center gap-3 text-sm text-slate-600">
                      <input
                        checked={menuForm.isAvailable}
                        onChange={(event) => setMenuForm((current) => ({ ...current, isAvailable: event.target.checked }))}
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300 text-orange-500"
                      />
                      Menu tersedia untuk pelanggan
                    </label>
                  </div>
                </div>
              </section>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2 border-t border-slate-200 pt-5">
              <button
                type="button"
                onClick={() => {
                  resetMenuForm();
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

      {isCartModalOpen && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-sm"
          onClick={() => setIsCartModalOpen(false)}
        >
          <div
            className="mx-auto max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded-4xl border border-slate-200 bg-white p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-600">
                  Keranjang kasir
                </p>
                <h2 className="mt-1 text-2xl font-bold text-slate-950">Pesanan baru</h2>
              </div>
              <div className="flex items-center gap-2">
                <div className="rounded-2xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-600">
                  {totalCartItems} item
                </div>
                <button
                  type="button"
                  onClick={() => setIsCartModalOpen(false)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 text-slate-700 transition hover:border-orange-300 hover:text-orange-600"
                  aria-label="Tutup keranjang"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {cartItems.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 p-5 text-sm text-slate-500">
                  Belum ada menu dipilih.
                </div>
              ) : (
                cartItems.map((item) => (
                  <div key={item.cartKey} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-slate-900">{item.name}</p>
                        <p className="text-sm text-slate-500">{formatCurrency(item.price)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => updateCartItemQuantity(item.cartKey, -1)}
                          className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-lg font-bold text-slate-700 ring-1 ring-slate-200"
                        >
                          -
                        </button>
                        <span className="min-w-6 text-center font-semibold text-slate-900">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateCartItemQuantity(item.cartKey, 1)}
                          className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-lg font-bold text-slate-700 ring-1 ring-slate-200"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-6 grid gap-3">
              <input
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
                placeholder="Nama pelanggan"
                className="rounded-2xl border border-slate-200 px-4 py-3 outline-none placeholder:text-slate-400 focus:border-orange-300"
              />
              <select
                value={paymentMethod}
                onChange={(event) => setPaymentMethod(event.target.value as Order["paymentMethod"])}
                className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-orange-300"
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
                className="rounded-2xl border border-slate-200 px-4 py-3 outline-none placeholder:text-slate-400 focus:border-orange-300"
              />
            </div>

            <div className="mt-6 rounded-2xl bg-slate-950 p-5 text-white">
              <div className="flex items-center justify-between text-sm text-slate-300">
                <span>Subtotal</span>
                <span>{formatCurrency(cartSubtotal)}</span>
              </div>
              <div className="mt-3 flex items-center justify-between text-lg font-bold">
                <span>Total</span>
                <span>{formatCurrency(cartSubtotal)}</span>
              </div>
              <button
                type="button"
                onClick={handleSubmitCartOrder}
                disabled={isSubmittingOrder}
                className="mt-5 w-full rounded-2xl bg-orange-400 px-4 py-3 font-semibold text-slate-950 transition hover:bg-orange-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmittingOrder ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedChickenProduct && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
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
    </div>
  );
}
