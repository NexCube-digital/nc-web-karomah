"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import axios from "axios";
import { fetchProducts } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { Product } from "@/types";
import { ProductThumbnail } from "@/components/ProductThumbnail";

function getMockRating(productId: number) {
  const rating = 4.6 + (productId % 5) * 0.1;
  return Math.min(rating, 5).toFixed(1);
}

export default function SearchPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadProducts() {
      try {
        setIsLoading(true);
        const result = await fetchProducts();
        setProducts(result);
      } catch (error) {
        if (axios.isAxiosError(error)) {
          setErrorMessage(error.response?.data?.message || "Gagal memuat menu.");
        } else {
          setErrorMessage("Gagal memuat menu.");
        }
      } finally {
        setIsLoading(false);
      }
    }

    loadProducts();
  }, []);

  const filteredProducts = useMemo(() => {
    const keyword = query.trim().toLowerCase();

    if (!keyword) {
      return products;
    }

    return products.filter((product) => {
      const searchableText = [product.name, product.category, product.description || ""]
        .join(" ")
        .toLowerCase();

      return searchableText.includes(keyword);
    });
  }, [products, query]);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#fff7ed,#f8fafc_45%,#e2e8f0)] text-slate-900">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex shrink-0 items-center gap-2">
            <Image
              src="/image/logo.svg"
              alt="KAROMAH FOOD"
              width={112}
              height={32}
              className="h-8 w-auto"
              priority
            />
            <div className="leading-tight text-slate-900">
              <p className="text-xs font-black tracking-[0.18em]">KAROMAH</p>
              <p className="text-xs font-bold tracking-[0.24em] text-orange-600">FOOD</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="inline-flex rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-orange-300 hover:text-orange-600"
            >
              Kembali ke menu
            </Link>
            <Link
              href="/kasir/login"
              className="inline-flex rounded-2xl bg-orange-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-orange-300"
            >
              Log in
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <label className="text-sm font-semibold text-slate-700" htmlFor="search-menu">
            Cari menu
          </label>
          <input
            id="search-menu"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari nama menu, kategori, atau deskripsi..."
            className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:border-orange-300"
          />
        </div>

        {errorMessage && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
            {errorMessage}
          </div>
        )}

        {isLoading ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-5 text-sm text-slate-500">
            Memuat menu...
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-500">
            Tidak ada menu yang cocok dengan pencarian.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredProducts.map((product) => (
              <article
                key={product.id}
                className="overflow-hidden rounded-[30px] border border-slate-200 bg-white p-3 shadow-sm"
              >
                <div className="flex items-stretch gap-4 md:block md:gap-0">
                  <ProductThumbnail
                    src={product.imageUrl}
                    alt={product.name}
                    className="relative h-32 w-32 shrink-0 overflow-hidden rounded-3xl bg-slate-100 md:h-40 md:w-full md:rounded-2xl"
                    overlay={
                      <div className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-3 py-1 text-xs font-bold text-slate-900 shadow-sm">
                        ★ {getMockRating(product.id)}
                      </div>
                    }
                  />
                  <div className="flex min-w-0 flex-1 flex-col justify-between py-1 md:space-y-3 md:p-3">
                    <div>
                      <h2 className="line-clamp-2 text-lg font-bold leading-tight text-slate-950 md:text-2xl">
                        {product.name}
                      </h2>
                      <p className="mt-2 text-sm font-medium text-slate-500">{product.category}</p>
                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600 md:line-clamp-3">
                        {product.description || "Menu andalan siap dipesan."}
                      </p>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3 md:mt-0">
                      <p className="text-base font-bold text-slate-950 md:text-lg">
                        {formatCurrency(product.price)}
                      </p>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                        {product.category}
                      </span>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
