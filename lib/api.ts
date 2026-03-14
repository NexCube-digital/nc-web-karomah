import axios from "axios";
import {
  Category,
  CategoryPayload,
  CashierUser,
  DashboardSummary,
  LoginResponse,
  MenuPayload,
  Order,
  Product,
  ReceiptPayload,
} from "@/types";
import { getAuthToken } from "@/lib/auth";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api",
  headers: {
    "Content-Type": "application/json",
  },
});

function normalizeProduct(product: Product) {
  return {
    ...product,
    price: Number(product.price),
  };
}

function normalizeCategory(category: Category) {
  return {
    ...category,
    isActive: Boolean(category.isActive),
  };
}

function authConfig(token?: string) {
  const bearerToken = token || getAuthToken();

  return bearerToken
    ? {
        headers: {
          Authorization: `Bearer ${bearerToken}`,
        },
      }
    : undefined;
}

function normalizeOrder(order: Order) {
  return {
    ...order,
    subtotal: Number(order.subtotal),
    taxAmount: Number(order.taxAmount),
    totalAmount: Number(order.totalAmount),
    items: order.items.map((item) => ({
      ...item,
      price: Number(item.price),
      lineTotal: Number(item.lineTotal),
    })),
  };
}

export async function fetchProducts() {
  const response = await api.get<{ success: boolean; data: Product[] }>("/products");
  return response.data.data.map(normalizeProduct);
}

export async function fetchCategories() {
  const response = await api.get<{ success: boolean; data: Category[] }>("/categories");
  return response.data.data.map(normalizeCategory);
}

export async function createOrder(payload: {
  customerName: string;
  customerPhone?: string;
  notes?: string;
  paymentMethod: "cash" | "qris" | "transfer";
  items: Array<{ productId: number; quantity: number }>;
}) {
  const response = await api.post<{ success: boolean; message: string; data: Order }>(
    "/orders",
    payload
  );
  return response.data;
}

export async function loginCashier(payload: { email: string; password: string }) {
  const response = await api.post<{ success: boolean; data: LoginResponse }>(
    "/auth/login",
    payload
  );

  return response.data.data;
}

export async function fetchCashierProfile(token?: string) {
  const response = await api.get<{ success: boolean; data: CashierUser }>(
    "/auth/me",
    authConfig(token)
  );

  return response.data.data;
}

export async function fetchCashierOrders(token?: string) {
  const response = await api.get<{ success: boolean; data: Order[] }>(
    "/cashier/orders",
    authConfig(token)
  );
  return response.data.data.map(normalizeOrder);
}

export async function fetchCashierSummary(token?: string) {
  const response = await api.get<{ success: boolean; data: DashboardSummary }>(
    "/cashier/summary",
    authConfig(token)
  );
  return {
    ...response.data.data,
    totalRevenue: Number(response.data.data.totalRevenue),
  };
}

export async function fetchManagedProducts(token?: string) {
  const response = await api.get<{ success: boolean; data: Product[] }>(
    "/products/manage",
    authConfig(token)
  );

  return response.data.data.map(normalizeProduct);
}

export async function fetchManagedCategories(token?: string) {
  const response = await api.get<{ success: boolean; data: Category[] }>(
    "/categories/manage",
    authConfig(token)
  );

  return response.data.data.map(normalizeCategory);
}

export async function createCategory(payload: CategoryPayload, token?: string) {
  const response = await api.post<{ success: boolean; data: Category }>(
    "/categories",
    payload,
    authConfig(token)
  );

  return normalizeCategory(response.data.data);
}

export async function updateCategory(id: number, payload: CategoryPayload, token?: string) {
  const response = await api.put<{ success: boolean; data: Category }>(
    `/categories/${id}`,
    payload,
    authConfig(token)
  );

  return normalizeCategory(response.data.data);
}

export async function deleteCategory(id: number, token?: string) {
  await api.delete(`/categories/${id}`, authConfig(token));
}

export async function createMenuItem(payload: MenuPayload, token?: string) {
  const response = await api.post<{ success: boolean; data: Product }>(
    "/products",
    payload,
    authConfig(token)
  );

  return normalizeProduct(response.data.data);
}

export async function updateMenuItem(id: number, payload: MenuPayload, token?: string) {
  const response = await api.put<{ success: boolean; data: Product }>(
    `/products/${id}`,
    payload,
    authConfig(token)
  );

  return normalizeProduct(response.data.data);
}

export async function deleteMenuItem(id: number, token?: string) {
  await api.delete(`/products/${id}`, authConfig(token));
}

export async function updateCashierOrder(
  id: number,
  payload: Partial<Pick<Order, "status" | "paymentStatus">>,
  token?: string
) {
  const response = await api.patch<{ success: boolean; message: string; data: Order }>(
    `/cashier/orders/${id}`,
    payload,
    authConfig(token)
  );
  return normalizeOrder(response.data.data);
}

export async function fetchReceipt(id: number, token?: string) {
  const response = await api.get<{ success: boolean; data: ReceiptPayload }>(
    `/cashier/orders/${id}/receipt`,
    authConfig(token)
  );

  return response.data.data;
}

export default api;
