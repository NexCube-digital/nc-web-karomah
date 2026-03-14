"use client";

import { createContext, useContext } from "react";
import { CartItem, CashierUser, Product } from "@/types";

type CashierContextValue = {
  token: string;
  user: CashierUser;
  printerConnected: boolean;
  setPrinterConnected: (value: boolean) => void;
  connectPrinter: () => Promise<void>;
  logout: () => void;
  cartItems: CartItem[];
  addCartItem: (product: Product) => void;
  updateCartItemQuantity: (productId: number, delta: number) => void;
  clearCartItems: () => void;
};

const CashierContext = createContext<CashierContextValue | null>(null);

export function CashierContextProvider({
  value,
  children,
}: {
  value: CashierContextValue;
  children: React.ReactNode;
}) {
  return <CashierContext.Provider value={value}>{children}</CashierContext.Provider>;
}

export function useCashierContext() {
  const context = useContext(CashierContext);

  if (!context) {
    throw new Error("useCashierContext harus dipakai di dalam CashierContextProvider.");
  }

  return context;
}
