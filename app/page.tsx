 "use client";

 import { useEffect, useMemo, useState } from "react";
 import Image from "next/image";
 import Link from "next/link";
 import { Search, ShoppingCart, X } from "lucide-react";
 import axios from "axios";
 import { createOrder, fetchCategories, fetchProducts } from "@/lib/api";
 import { formatCurrency } from "@/lib/utils";
 import { CartItem, Category, Order, Product } from "@/types";

 function toCategoryId(category: string) {
   return `kategori-${category.toLowerCase().replace(/\s+/g, "-")}`;
 }

function getMockRating(productId: number) {
  const rating = 4.6 + (productId % 5) * 0.1;
  return Math.min(rating, 5).toFixed(1);
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

   function addToCart(product: Product) {
     setCart((currentCart) => {
       const existingItem = currentCart.find((item) => item.id === product.id);

       if (existingItem) {
         return currentCart.map((item) =>
           item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
         );
       }

       return [...currentCart, { ...product, quantity: 1 }];
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
     <main className="min-h-screen bg-[radial-gradient(circle_at_top,#fff7ed,#f8fafc_45%,#e2e8f0)] text-slate-900">
       <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
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
             <div className="leading-tight text-slate-900">
               <p className="text-xs font-black tracking-[0.18em]">KAROMAH</p>
               <p className="text-xs font-bold tracking-[0.24em] text-orange-600">FOOD</p>
             </div>
           </div>

           <nav className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto px-1">
             <button
               type="button"
               onClick={() => {
                 const target = document.getElementById("menu-list");
                 target?.scrollIntoView({ behavior: "smooth", block: "start" });
               }}
               className="shrink-0 rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-500"
             >
               Home
             </button>
           </nav>

          <Link
            href="/search"
            aria-label="Cari menu"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition hover:border-orange-300 hover:text-orange-600"
          >
            <Search className="h-4 w-4" />
          </Link>

          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition hover:border-orange-300 hover:text-orange-600"
            aria-label="Buka keranjang"
          >
            <ShoppingCart className="h-4 w-4" />
            {totalItems > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-bold text-white">
                {totalItems}
              </span>
            )}
          </button>

           <Link
             href="/kasir/login"
             className="inline-flex shrink-0 rounded-2xl bg-orange-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-orange-300"
           >
             Log in
           </Link>
         </div>
       </header>

       <section className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">

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
           <section className="rounded-4xl border border-slate-200 bg-white/90 p-6 shadow-sm">
             <h2 className="text-center text-3xl font-black tracking-tight text-slate-950">
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
                   className="group flex flex-col items-center rounded-3xl border border-slate-100 p-4 text-center transition hover:bg-slate-50"
                 >
                   {/* eslint-disable-next-line @next/next/no-img-element */}
                   <img
                     src={category.imageUrl}
                     alt={category.name}
                     className="h-28 w-28 rounded-full object-cover ring-4 ring-emerald-200 transition group-hover:ring-orange-200"
                   />
                   <p className="mt-4 text-lg font-semibold text-slate-900">{category.name}</p>
                 </button>
               ))}
             </div>
           </section>
         )}

         <section id="menu-list" className="space-y-6 scroll-mt-28">
             {isLoadingMenu && (
               <div className="rounded-3xl border border-slate-200 bg-white p-5 text-sm text-slate-500">
                 Memuat menu...
               </div>
             )}

              {!isLoadingMenu && products.length === 0 && (
                <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-500">
                  Menu belum tersedia. Silakan input menu dari dashboard kasir.
                </div>
              )}

             {Object.entries(groupedProducts).map(([category, items]) => (
               <div key={category} id={toCategoryId(category)} className="space-y-4 scroll-mt-28">
                 <div className="flex items-center justify-between">
                   <h2 className="text-2xl font-bold text-slate-950">{category}</h2>
                   <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600">
                     {items.length} menu
                   </span>
                 </div>

                 <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                   {items.map((product) => (
                     <article
                       key={product.id}
                       className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-3 shadow-sm transition hover:shadow-md"
                     >
                       <div
                         className="relative h-40 overflow-hidden rounded-2xl bg-slate-100"
                         style={{
                           backgroundImage: `url(${product.imageUrl || "/image/default.png"})`,
                           backgroundSize: "cover",
                           backgroundPosition: "center",
                         }}
                       >
                         <div className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-3 py-1 text-xs font-bold text-slate-900 shadow-sm">
                           ⭐ {getMockRating(product.id)}
                         </div>
                       </div>
                       <div className="space-y-3 p-3">
                         <div>
                           <h3 className="text-2xl font-bold text-slate-950">{product.name}</h3>
                           <p className="mt-1 text-sm leading-6 text-slate-600">
                             {product.description || "Menu andalan siap dipesan."}
                           </p>
                           <p className="mt-1 text-sm text-slate-500">{product.category}</p>
                         </div>
                         <div className="flex items-center justify-between gap-4">
                           <p className="text-lg font-bold text-slate-950">{formatCurrency(product.price)}</p>
                           <button
                             type="button"
                             onClick={() => addToCart(product)}
                             className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-500"
                           >
                             Tambah
                           </button>
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
           className="fixed inset-0 z-50 bg-slate-950/50 p-4 backdrop-blur-sm"
           onClick={() => setIsCartOpen(false)}
         >
           <div
             className="mx-auto max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded-4xl border border-slate-200 bg-white p-6 shadow-2xl"
             onClick={(event) => event.stopPropagation()}
           >
             <div className="flex items-center justify-between">
               <div>
                 <p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-600">
                   Keranjang
                 </p>
                 <h2 className="mt-1 text-2xl font-bold text-slate-950">Pesanan pelanggan</h2>
               </div>
               <div className="flex items-center gap-2">
                 <div className="rounded-2xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-600">
                   {totalItems} item
                 </div>
                 <button
                   type="button"
                   onClick={() => setIsCartOpen(false)}
                   className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 text-slate-700 transition hover:border-orange-300 hover:text-orange-600"
                   aria-label="Tutup keranjang"
                 >
                   <X className="h-4 w-4" />
                 </button>
               </div>
             </div>

             <div className="mt-6 space-y-3">
               {cart.length === 0 ? (
                 <div className="rounded-2xl border border-dashed border-slate-300 p-5 text-sm text-slate-500">
                   Belum ada menu dipilih.
                 </div>
               ) : (
                 cart.map((item) => (
                   <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                     <div className="flex items-start justify-between gap-4">
                       <div>
                         <p className="font-semibold text-slate-900">{item.name}</p>
                         <p className="text-sm text-slate-500">{formatCurrency(item.price)}</p>
                       </div>
                       <div className="flex items-center gap-2">
                         <button
                           type="button"
                           onClick={() => updateQuantity(item.id, -1)}
                           className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-lg font-bold text-slate-700 ring-1 ring-slate-200"
                         >
                           −
                         </button>
                         <span className="min-w-6 text-center font-semibold text-slate-900">
                           {item.quantity}
                         </span>
                         <button
                           type="button"
                           onClick={() => updateQuantity(item.id, 1)}
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
                 className="mt-5 w-full rounded-2xl bg-orange-400 px-4 py-3 font-semibold text-slate-950 transition hover:bg-orange-300 disabled:cursor-not-allowed disabled:opacity-60"
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
