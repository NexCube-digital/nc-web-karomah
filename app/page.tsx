 "use client";

 import { useEffect, useMemo, useRef, useState } from "react";
 import Image from "next/image";
 import Link from "next/link";
 import { Search, ShoppingCart, X } from "lucide-react";
 import axios from "axios";
 import { createOrder, fetchCategories, fetchProducts } from "@/lib/api";
 import { formatCurrency } from "@/lib/utils";
 import { CartItem, Category, Order, Product } from "@/types";
import { ProductThumbnail } from "@/components/ProductThumbnail";

 function toCategoryId(category: string) {
   return `kategori-${category.toLowerCase().replace(/\s+/g, "-")}`;
 }

function getApiOrigin() {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

  try {
    return new URL(baseUrl).origin;
  } catch {
    return "http://localhost:4000";
  }
}

function formatProductRating(rating: number | null | undefined) {
  if (typeof rating !== "number" || Number.isNaN(rating) || rating <= 0) {
    return "Baru";
  }

  return rating.toFixed(1);
}

 export default function Home() {
   const [products, setProducts] = useState<Product[]>([]);
   const [categoryItems, setCategoryItems] = useState<Category[]>([]);
   const [cart, setCart] = useState<CartItem[]>([]);
   const [isCartOpen, setIsCartOpen] = useState(false);
   const [customerName, setCustomerName] = useState("");
   const [notes, setNotes] = useState("");
   const [paymentMethod, setPaymentMethod] = useState<Order["paymentMethod"]>("cash");
   const [isSubmitting, setIsSubmitting] = useState(false);
   const [isLoadingMenu, setIsLoadingMenu] = useState(true);
   const [feedback, setFeedback] = useState<string | null>(null);
   const [errorMessage, setErrorMessage] = useState<string | null>(null);
   const [isCartPulse, setIsCartPulse] = useState(false);
   const cartButtonRef = useRef<HTMLButtonElement | null>(null);
   const cartPulseTimeoutRef = useRef<number | null>(null);

   useEffect(() => {
     return () => {
       if (cartPulseTimeoutRef.current) {
         window.clearTimeout(cartPulseTimeoutRef.current);
       }
     };
   }, []);

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
     async function loadProducts() {
       try {
         setIsLoadingMenu(true);
         const [productsResult, categoriesResult] = await Promise.allSettled([
           fetchProducts(),
           fetchCategories(),
         ]);

         if (productsResult.status !== "fulfilled") {
           throw productsResult.reason;
         }

         const loadedProducts = productsResult.value;
         setProducts(loadedProducts);

         if (categoriesResult.status === "fulfilled") {
           setCategoryItems(categoriesResult.value);
         } else {
           const fallbackMap = new Map<string, Category>();

           loadedProducts.forEach((product, index) => {
             if (!fallbackMap.has(product.category)) {
               fallbackMap.set(product.category, {
                 id: index + 1,
                 name: product.category,
                 imageUrl:
                   product.imageUrl ||
                   "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80",
                 isActive: true,
               });
             }
           });

           setCategoryItems(Array.from(fallbackMap.values()));
         }
       } catch {
         setFeedback(null);
         setErrorMessage("Gagal memuat menu dari server.");
       } finally {
         setIsLoadingMenu(false);
       }
     }

     loadProducts();
   }, []);

  const groupedProducts = useMemo(() => {
    return products.reduce<Record<string, Product[]>>((accumulator, product) => {
       if (!accumulator[product.category]) {
         accumulator[product.category] = [];
       }

       accumulator[product.category].push(product);
       return accumulator;
     }, {});
  }, [products]);

   const subtotal = useMemo(
     () => cart.reduce((total, item) => total + item.price * item.quantity, 0),
     [cart]
   );

   const totalItems = useMemo(
     () => cart.reduce((total, item) => total + item.quantity, 0),
     [cart]
   );

   function playAddToCartAnimation(sourceElement: HTMLElement) {
     const cartButton = cartButtonRef.current;

     if (!cartButton) {
       return;
     }

     const sourceRect = sourceElement.getBoundingClientRect();
     const cartRect = cartButton.getBoundingClientRect();
     const startX = sourceRect.left + sourceRect.width / 2;
     const startY = sourceRect.top + sourceRect.height / 2;
     const endX = cartRect.left + cartRect.width / 2;
     const endY = cartRect.top + cartRect.height / 2;
     const deltaX = endX - startX;
     const deltaY = endY - startY;

     const dot = document.createElement("div");
     dot.setAttribute("aria-hidden", "true");
     dot.style.position = "fixed";
     dot.style.left = `${startX}px`;
     dot.style.top = `${startY}px`;
     dot.style.width = "12px";
     dot.style.height = "12px";
     dot.style.borderRadius = "9999px";
     dot.style.background = "linear-gradient(135deg, #d88a58 0%, #a84f24 100%)";
     dot.style.boxShadow = "0 8px 18px rgba(168, 79, 36, 0.35)";
     dot.style.pointerEvents = "none";
     dot.style.opacity = "0.95";
     dot.style.transform = "translate(-50%, -50%) scale(1)";
     dot.style.transition = "transform 580ms cubic-bezier(0.22, 1, 0.36, 1), opacity 580ms ease";
     dot.style.zIndex = "90";

     document.body.appendChild(dot);

     window.requestAnimationFrame(() => {
       dot.style.transform = `translate(calc(-50% + ${deltaX}px), calc(-50% + ${deltaY}px)) scale(0.25)`;
       dot.style.opacity = "0.15";
     });

     window.setTimeout(() => {
       dot.remove();
     }, 620);

     setIsCartPulse(true);
     if (cartPulseTimeoutRef.current) {
       window.clearTimeout(cartPulseTimeoutRef.current);
     }
     cartPulseTimeoutRef.current = window.setTimeout(() => {
       setIsCartPulse(false);
     }, 240);
   }

   function addToCart(product: Product, sourceElement?: HTMLElement) {
     if (sourceElement) {
       playAddToCartAnimation(sourceElement);
     }

     setCart((currentCart) => {
       const existingItem = currentCart.find((item) => item.id === product.id);

       if (existingItem) {
         return currentCart.map((item) =>
           item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
         );
       }

       return [...currentCart, { ...product, cartKey: String(product.id), quantity: 1 }];
     });
   }

   function updateQuantity(productId: number, delta: number) {
     setCart((currentCart) =>
       currentCart
         .map((item) =>
           item.id === productId ? { ...item, quantity: item.quantity + delta } : item
         )
         .filter((item) => item.quantity > 0)
     );
   }

   async function submitOrder() {
     if (!customerName.trim()) {
       setErrorMessage("Nama pelanggan wajib diisi.");
       return;
     }

     if (cart.length === 0) {
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
         items: cart.map((item) => ({
           productId: item.id,
           quantity: item.quantity,
         })),
       });

      setFeedback(
        `Pesanan ${response.data.orderNumber} berhasil dibuat. Silakan tunggu konfirmasi dari kasir.`
      );
       setCart([]);
      setIsCartOpen(false);
       setCustomerName("");
       setNotes("");
     } catch (error) {
       setFeedback(null);
       if (axios.isAxiosError(error)) {
         setErrorMessage(error.response?.data?.message || "Gagal mengirim pesanan.");
       } else {
         setErrorMessage("Gagal mengirim pesanan.");
       }
     } finally {
       setIsSubmitting(false);
     }
   }

   return (
     <main className="relative min-h-screen overflow-x-clip text-[#2b221a]">
       <div className="pointer-events-none absolute inset-0 -z-10">
         <div className="absolute -top-40 left-1/2 h-112 w-md -translate-x-1/2 rounded-full bg-[#f2c9a8]/40 blur-3xl" />
         <div className="absolute -right-28 top-56 h-80 w-80 rounded-full bg-[#8c9d6b]/20 blur-3xl" />
       </div>

       <header className="sticky top-0 z-40 border-b border-[#eadcc8] bg-[#fffaf0]/90 backdrop-blur-lg">
         <div className="mx-auto flex w-full max-w-7xl items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
           <div className="flex shrink-0 items-center gap-2">
             <Image
               src="/image/logo.svg"
               alt="KAROMAH FOOD"
               width={112}
               height={32}
               className="h-8 w-auto"
               priority
             />
             <div className="leading-tight text-[#2b221a]">
               <p className="text-xs font-black tracking-[0.18em]">KAROMAH</p>
               <p className="text-xs font-bold tracking-[0.24em] text-[#a84f24]">FOOD</p>
             </div>
           </div>

           <nav className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto px-1">
             <button
               type="button"
               onClick={() => {
                 const target = document.getElementById("menu-list");
                 target?.scrollIntoView({ behavior: "smooth", block: "start" });
               }}
               className="shrink-0 rounded-full bg-[#2f251d] px-4 py-2 text-sm font-semibold text-[#fffaf0] transition hover:bg-[#a84f24]"
             >
               Home
             </button>
           </nav>

          <Link
            href="/search"
            aria-label="Cari menu"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[#e2d4bf] bg-[#fffaf2] text-[#5f564d] transition hover:border-[#d5956e] hover:text-[#a84f24]"
          >
            <Search className="h-4 w-4" />
          </Link>

          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            ref={cartButtonRef}
            className={`relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[#e2d4bf] bg-[#fffaf2] text-[#5f564d] transition-all duration-300 hover:border-[#d5956e] hover:text-[#a84f24] ${
              isCartPulse ? "scale-110 border-[#d5956e] text-[#a84f24]" : ""
            }`}
            aria-label="Buka keranjang"
          >
            <ShoppingCart className="h-4 w-4" />
            {totalItems > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#c96d3a] px-1 text-[10px] font-bold text-white">
                {totalItems}
              </span>
            )}
          </button>

           <Link
             href="/kasir/login"
             className="inline-flex shrink-0 rounded-2xl bg-[#d88a58] px-4 py-2 text-sm font-semibold text-[#2f251d] transition hover:bg-[#c96d3a] hover:text-[#fffaf0]"
           >
             Log in
           </Link>
         </div>
       </header>

       <section className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <section className="relative overflow-hidden rounded-[2.2rem] border border-[#eadbc4] bg-linear-to-br from-[#fff9ef] via-[#fff3e2] to-[#f4e6d2] p-7 shadow-[0_24px_80px_-48px_rgba(108,62,33,0.5)] sm:p-10">
          <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-[#e8b48d]/45 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-28 -left-28 h-72 w-72 rounded-full bg-[#8c9d6b]/18 blur-3xl" />
          <div className="relative z-10 max-w-3xl">
            <p className="inline-flex rounded-full border border-[#e4ccb2] bg-[#fff7eb] px-4 py-1 text-xs font-bold tracking-[0.2em] text-[#9a5b33]">
              MENU HARI INI
            </p>
            <h1 className="font-display mt-5 text-4xl leading-tight text-[#2f251d] sm:text-5xl lg:text-6xl">
              Kuliner UMKM yang Hangat, Cepat Dipesan, Mudah Dinikmati.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-[#5f564d] sm:text-lg">
              Pilih menu favoritmu, atur pesanan dalam hitungan detik, dan nikmati cita rasa rumahan Karomah Food dengan pengalaman digital yang lebih nyaman.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3 text-sm">
              <span className="rounded-full border border-[#dbcab2] bg-[#fffaf2] px-4 py-2 font-semibold text-[#5f564d]">Pesan tanpa antre</span>
              <span className="rounded-full border border-[#dbcab2] bg-[#fffaf2] px-4 py-2 font-semibold text-[#5f564d]">Kategori rapi</span>
              <span className="rounded-full border border-[#dbcab2] bg-[#fffaf2] px-4 py-2 font-semibold text-[#5f564d]">Checkout praktis</span>
            </div>
          </div>
        </section>

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

         {!isLoadingMenu && categoryItems.length > 0 && (
           <section className="rounded-4xl border border-[#eadcc8] bg-[#fffaf2]/95 p-6 shadow-[0_16px_50px_-34px_rgba(78,50,31,0.55)] sm:p-8">
             <h2 className="font-display text-center text-3xl font-semibold tracking-tight text-[#2f251d]">
               Pilih kategori favorit
             </h2>
             <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
               {categoryItems.map((category) => (
                 <button
                   key={category.id}
                   type="button"
                   onClick={() => {
                     const target = document.getElementById(toCategoryId(category.name));
                     target?.scrollIntoView({ behavior: "smooth", block: "start" });
                   }}
                   className="group flex flex-col items-center rounded-3xl border border-[#efe2d0] bg-[#fffdf8] p-4 text-center transition hover:-translate-y-0.5 hover:border-[#d7b089] hover:bg-[#fff5e9]"
                 >
                   {/* eslint-disable-next-line @next/next/no-img-element */}
                   <img
                     src={
                       category.imageUrl?.startsWith("/uploads/")
                         ? `${getApiOrigin()}${category.imageUrl}`
                         : category.imageUrl
                     }
                     alt={category.name}
                     className="h-28 w-28 rounded-full object-cover ring-4 ring-[#d9e3cd] transition group-hover:ring-[#e8c3a0]"
                   />
                   <p className="mt-4 text-lg font-semibold text-[#352920]">{category.name}</p>
                 </button>
               ))}
             </div>
           </section>
         )}

         <section id="menu-list" className="space-y-6 scroll-mt-28">
             {isLoadingMenu && (
               <div className="rounded-3xl border border-[#e7d7c0] bg-[#fffaf2] p-5 text-sm text-[#6f645a]">
                 Memuat menu...
               </div>
             )}

              {!isLoadingMenu && products.length === 0 && (
                <div className="rounded-3xl border border-dashed border-[#d9c7ad] bg-[#fffaf2] p-5 text-sm text-[#6f645a]">
                  Menu belum tersedia. Silakan input menu dari dashboard kasir.
                </div>
              )}

             {Object.entries(groupedProducts).map(([category, items]) => (
               <div key={category} id={toCategoryId(category)} className="space-y-4 scroll-mt-28">
                 <div className="flex items-center justify-between">
                   <h2 className="font-display text-3xl font-semibold text-[#2f251d]">{category}</h2>
                   <span className="rounded-full border border-[#e3d5c2] bg-[#fff8ee] px-3 py-1 text-sm text-[#6f645a]">
                     {items.length} menu
                   </span>
                 </div>

                 <div className="grid items-stretch gap-3 md:grid-cols-4 xl:grid-cols-5">
                   {items.map((product) => (
                     <article
                       key={product.id}
                       className="h-full overflow-hidden rounded-[28px] border border-[#eadbc6] bg-[#fffefb] p-2.5 shadow-[0_16px_45px_-32px_rgba(86,57,34,0.7)] transition hover:-translate-y-0.5 hover:border-[#deb48c] hover:shadow-[0_22px_50px_-30px_rgba(86,57,34,0.55)]"
                     >
                       <div className="flex h-full items-stretch gap-4 md:flex-col md:gap-0">
                         <ProductThumbnail
                           src={product.imageUrl}
                           alt={product.name}
                            className="relative h-32 w-32 shrink-0 overflow-hidden rounded-3xl bg-[#f4e8d8] md:h-28 md:w-full md:rounded-2xl xl:h-32"
                           overlay={
                             <div className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-full bg-[#fff9ef]/95 px-3 py-1 text-xs font-bold text-[#2f251d] shadow-sm">
                               {typeof product.rating === "number" && product.rating > 0 ? "★" : "☆"} {formatProductRating(product.rating)}
                             </div>
                           }
                         />
                         <div className="flex min-w-0 flex-1 flex-col justify-between py-1 md:p-2.5">
                           <div>
                             <div className="flex items-start justify-between gap-3">
                               <div className="min-w-0">
                                 <h3 className="line-clamp-2 text-lg font-bold leading-tight text-[#2f251d] md:text-xl">
                                   {product.name}
                                 </h3>
                                 <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#6a5d51] md:mt-1 md:min-h-10 md:line-clamp-2 md:text-[13px] md:leading-5">
                                   {product.description || "Menu andalan siap dipesan."}
                                 </p>
                               </div>
                             </div>
                             <p className="mt-2 text-sm font-medium text-[#827666] md:text-xs">{product.category}</p>
                           </div>
                           <div className="mt-3 flex items-center justify-between gap-3 md:mt-0 md:gap-2">
                             <p className="text-base font-bold text-[#31271f] md:text-sm xl:text-base">
                               {formatCurrency(product.price)}
                             </p>
                             <button
                               type="button"
                               onClick={(event) => addToCart(product, event.currentTarget)}
                               className="rounded-2xl bg-[#2f251d] px-4 py-2 text-sm font-semibold text-[#fffaf2] transition hover:bg-[#a84f24] md:px-3 md:py-1.5 md:text-xs"
                             >
                               Tambah
                             </button>
                           </div>
                         </div>
                       </div>
                     </article>
                   ))}
                 </div>
               </div>
             ))}
         </section>
       </section>

       {isCartOpen && (
         <div
           className="fixed inset-0 z-50 bg-[#2b221a]/45 p-4 backdrop-blur-sm"
           onClick={() => setIsCartOpen(false)}
         >
           <div
             className="mx-auto max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded-4xl border border-[#e4d6c2] bg-[#fffaf2] p-6 shadow-2xl"
             onClick={(event) => event.stopPropagation()}
           >
             <div className="flex items-center justify-between">
               <div>
                 <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#a84f24]">
                   Keranjang
                 </p>
                 <h2 className="font-display mt-1 text-2xl font-semibold text-[#2f251d]">Pesanan pelanggan</h2>
               </div>
               <div className="flex items-center gap-2">
                 <div className="rounded-2xl border border-[#e3d5c2] bg-[#fff6e9] px-3 py-2 text-sm font-semibold text-[#6f645a]">
                   {totalItems} item
                 </div>
                 <button
                   type="button"
                   onClick={() => setIsCartOpen(false)}
                   className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[#e3d5c2] text-[#5f564d] transition hover:border-[#d5956e] hover:text-[#a84f24]"
                   aria-label="Tutup keranjang"
                 >
                   <X className="h-4 w-4" />
                 </button>
               </div>
             </div>

             <div className="mt-6 space-y-3">
               {cart.length === 0 ? (
                 <div className="rounded-2xl border border-dashed border-[#d9c8af] bg-[#fffdf8] p-5 text-sm text-[#6f645a]">
                   Belum ada menu dipilih.
                 </div>
               ) : (
                 cart.map((item) => (
                   <div key={item.id} className="rounded-2xl border border-[#e6d8c4] bg-[#fffdf8] p-4">
                     <div className="flex items-start justify-between gap-4">
                       <div>
                         <p className="font-semibold text-[#2f251d]">{item.name}</p>
                         <p className="text-sm text-[#807364]">{formatCurrency(item.price)}</p>
                       </div>
                       <div className="flex items-center gap-2">
                         <button
                           type="button"
                           onClick={() => updateQuantity(item.id, -1)}
                           className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#e1d3bf] bg-[#fff8ee] text-lg font-bold text-[#5f564d]"
                         >
                           −
                         </button>
                         <span className="min-w-6 text-center font-semibold text-[#2f251d]">
                           {item.quantity}
                         </span>
                         <button
                           type="button"
                           onClick={() => updateQuantity(item.id, 1)}
                           className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#e1d3bf] bg-[#fff8ee] text-lg font-bold text-[#5f564d]"
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
                 className="rounded-2xl border border-[#e1d3bf] bg-[#fffdf8] px-4 py-3 outline-none placeholder:text-[#ab9f8f] focus:border-[#d5956e]"
               />
               <select
                 value={paymentMethod}
                 onChange={(event) => setPaymentMethod(event.target.value as Order["paymentMethod"])}
                 className="rounded-2xl border border-[#e1d3bf] bg-[#fffdf8] px-4 py-3 outline-none focus:border-[#d5956e]"
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
                 className="rounded-2xl border border-[#e1d3bf] bg-[#fffdf8] px-4 py-3 outline-none placeholder:text-[#ab9f8f] focus:border-[#d5956e]"
               />
             </div>

             <div className="mt-6 rounded-2xl bg-[#2f251d] p-5 text-[#fffaf2]">
               <div className="flex items-center justify-between text-sm text-[#dbc9b5]">
                 <span>Subtotal</span>
                 <span>{formatCurrency(subtotal)}</span>
               </div>
               <div className="mt-3 flex items-center justify-between text-lg font-bold">
                 <span>Total</span>
                 <span>{formatCurrency(subtotal)}</span>
               </div>
               <button
                 type="button"
                 onClick={submitOrder}
                 disabled={isSubmitting}
                 className="mt-5 w-full rounded-2xl bg-[#d88a58] px-4 py-3 font-semibold text-[#2f251d] transition hover:bg-[#c96d3a] hover:text-[#fffaf2] disabled:cursor-not-allowed disabled:opacity-60"
               >
                 {isSubmitting ? "Memproses pesanan..." : "Pesan"}
               </button>
             </div>
           </div>
         </div>
       )}
     </main>
   );
 }
