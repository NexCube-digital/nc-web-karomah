import axios from "axios";
import {
  Category,
  CategoryPayload,
  CashierUser,
  DashboardSummary,
  LoginResponse,
  MenuPayload,
  Order,
  OrderHistoryGroup,
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

const DEFAULT_PRODUCT_IMAGE = "/image/default.png";

function normalizeImageUrl(imageUrl: string | null | undefined) {
  if (typeof imageUrl !== "string") {
    return DEFAULT_PRODUCT_IMAGE;
  }

  const normalizedValue = imageUrl.trim();

  if (!normalizedValue || normalizedValue.toLowerCase() === "null") {
    return DEFAULT_PRODUCT_IMAGE;
  }

  if (/^https?:\/\//i.test(normalizedValue) || normalizedValue.startsWith("data:")) {
    return normalizedValue;
  }

  if (normalizedValue.startsWith("/")) {
    try {
      return new URL(normalizedValue, api.defaults.baseURL || "http://localhost:4000/api").toString();
    } catch {
      return normalizedValue;
    }
  }

  return normalizedValue;
}

function buildMenuFormData(payload: MenuPayload) {
  const formData = new FormData();

  formData.append("name", payload.name);
  formData.append("category", payload.category);
  formData.append("price", String(payload.price));
  if (typeof payload.rating === "number") {
    formData.append("rating", String(payload.rating));
  } else {
    formData.append("rating", "");
  }
  formData.append("isAvailable", String(payload.isAvailable));

  if (typeof payload.description === "string") {
    formData.append("description", payload.description);
  }

  if (payload.removeImage) {
    formData.append("removeImage", "true");
  }

  if (payload.imageFile) {
    formData.append("image", payload.imageFile);
  }

  return formData;
}

function buildCategoryFormData(payload: CategoryPayload) {
  const formData = new FormData();

  formData.append("name", payload.name);
  formData.append("isActive", String(payload.isActive));

  if (payload.removeImage) {
    formData.append("removeImage", "true");
  }

  if (payload.imageFile) {
    formData.append("image", payload.imageFile);
  } else if (typeof payload.imageUrl === "string" && payload.imageUrl.trim()) {
    formData.append("imageUrl", payload.imageUrl);
  }

  return formData;
}

function multipartAuthConfig(token?: string) {
  const config = authConfig(token);

  return {
    ...(config || {}),
    headers: {
      ...(config?.headers || {}),
      "Content-Type": "multipart/form-data",
    },
  };
}

function normalizeProduct(product: Product) {
  return {
    ...product,
    price: Number(product.price),
    rating:
      product.rating === null || product.rating === undefined || product.rating === ("" as never)
        ? null
        : Number(product.rating),
    imageUrl: normalizeImageUrl(product.imageUrl),
  };
}

function normalizeCategory(category: Category) {
  return {
    ...category,
    isActive: Boolean(category.isActive),
  };
}

function toArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
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
    items: toArray(order.items).map((item) => ({
      ...item,
      price: Number(item.price),
      lineTotal: Number(item.lineTotal),
    })),
  };
}

export function getCashierEventsUrl(token: string) {
  const baseUrl = api.defaults.baseURL || "http://localhost:4000/api";
  const separator = baseUrl.includes("?") ? "&" : "?";
  return `${baseUrl}/cashier/events${separator}token=${encodeURIComponent(token)}`;
}

export async function fetchProducts() {
  const response = await api.get<{ success: boolean; data: Product[] | null }>("/products");
  return toArray(response.data.data).map(normalizeProduct);
}

export async function fetchCategories() {
  const response = await api.get<{ success: boolean; data: Category[] | null }>("/categories");
  return toArray(response.data.data).map(normalizeCategory);
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
  const response = await api.get<{ success: boolean; data: Order[] | null }>(
    "/cashier/orders",
    authConfig(token)
  );
  return toArray(response.data.data).map(normalizeOrder);
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
  const response = await api.get<{ success: boolean; data: Product[] | null }>(
    "/products/manage",
    authConfig(token)
  );

  return toArray(response.data.data).map(normalizeProduct);
}

export async function fetchManagedCategories(token?: string) {
  const response = await api.get<{ success: boolean; data: Category[] | null }>(
    "/categories/manage",
    authConfig(token)
  );

  return toArray(response.data.data).map(normalizeCategory);
}

export async function createCategory(payload: CategoryPayload, token?: string) {
  const formData = buildCategoryFormData(payload);
  const response = await api.post<{ success: boolean; data: Category }>(
    "/categories",
    formData,
    multipartAuthConfig(token)
  );

  return normalizeCategory(response.data.data);
}

export async function updateCategory(id: number, payload: CategoryPayload, token?: string) {
  const formData = buildCategoryFormData(payload);
  const response = await api.put<{ success: boolean; data: Category }>(
    `/categories/${id}`,
    formData,
    multipartAuthConfig(token)
  );

  return normalizeCategory(response.data.data);
}

export async function deleteCategory(id: number, token?: string) {
  await api.delete(`/categories/${id}`, authConfig(token));
}

export async function createMenuItem(payload: MenuPayload, token?: string) {
  const formData = buildMenuFormData(payload);
  const response = await api.post<{ success: boolean; data: Product }>(
    "/products",
    formData,
    multipartAuthConfig(token)
  );

  return normalizeProduct(response.data.data);
}

export async function updateMenuItem(id: number, payload: MenuPayload, token?: string) {
  const formData = buildMenuFormData(payload);
  const response = await api.put<{ success: boolean; data: Product }>(
    `/products/${id}`,
    formData,
    multipartAuthConfig(token)
  );

  return normalizeProduct(response.data.data);
}

export async function deleteMenuItem(id: number, token?: string) {
  await api.delete(`/products/${id}`, authConfig(token));
}

export async function updateCashierOrder(
  id: number,
  payload: Partial<Pick<Order, "status" | "paymentStatus" | "customerName" | "notes" | "paymentMethod">> & {
    items?: Array<{ productId: number; quantity: number }>;
  },
  token?: string
) {
  const response = await api.patch<{ success: boolean; message: string; data: Order }>(
    `/cashier/orders/${id}`,
    payload,
    authConfig(token)
  );
  return normalizeOrder(response.data.data);
}

export async function fetchCashierHistory(token?: string) {
  const response = await api.get<{ success: boolean; data: OrderHistoryGroup[] | null }>(
    "/cashier/history",
    authConfig(token)
  );
  return toArray(response.data.data).map((group) => ({
    ...group,
    totalRevenue: Number(group.totalRevenue),
    orders: toArray(group.orders).map(normalizeOrder),
  }));
}

export async function fetchReceipt(id: number, token?: string) {
  const response = await api.get<{ success: boolean; data: ReceiptPayload }>(
    `/cashier/orders/${id}/receipt`,
    authConfig(token)
  );

  return response.data.data;
}

export default api;
