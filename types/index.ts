export type Product = {
  id: number;
  name: string;
  description: string | null;
  category: string;
  price: number;
  rating: number | null;
  imageUrl: string | null;
  isAvailable: boolean;
};

export type Category = {
  id: number;
  name: string;
  imageUrl: string;
  isActive: boolean;
};

export type CartItem = Product & {
  cartKey: string;
  chickenCut?: "dada" | "paha";
  quantity: number;
};

export type AddCartItemOptions = {
  variantKey?: string;
  displayNameSuffix?: string;
  chickenCut?: "dada" | "paha";
};

export type OrderItem = {
  id: number;
  productId: number;
  productName: string;
  chickenCut?: "dada" | "paha" | null;
  quantity: number;
  price: number;
  lineTotal: number;
};

export type Order = {
  id: number;
  orderNumber: string;
  customerName: string;
  customerPhone: string | null;
  notes: string | null;
  status: "pending" | "confirmed" | "preparing" | "ready" | "completed" | "cancelled";
  paymentStatus: "unpaid" | "paid";
  paymentMethod: "cash" | "qris" | "transfer";
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  createdAt: string;
  items: OrderItem[];
};

export type DashboardSummary = {
  totalOrders: number;
  totalRevenue: number;
  byStatus: Record<string, number>;
};

export type CashierUser = {
  name: string;
  email: string;
  role: string;
};

export type LoginResponse = {
  token: string;
  user: CashierUser;
};

export type MenuPayload = {
  name: string;
  description?: string;
  category: string;
  price: number;
  rating?: number | null;
  imageUrl?: string | null;
  imageFile?: File | null;
  removeImage?: boolean;
  isAvailable: boolean;
};

export type CategoryPayload = {
  name: string;
  imageUrl: string;
  imageFile?: File | null;
  removeImage?: boolean;
  isActive: boolean;
};

export type ReceiptPayload = {
  orderNumber: string;
  customerName: string;
  paymentMethod: Order["paymentMethod"];
  totalAmount: number;
  lines: Array<{
    label: string;
    total: number;
  }>;
  printableText: string;
};

export type OrderHistoryGroup = {
  date: string; // YYYY-MM-DD
  orders: Order[];
  totalOrders: number;
  totalRevenue: number;
};
