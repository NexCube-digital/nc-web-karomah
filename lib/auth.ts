import { CashierUser } from "@/types";

const TOKEN_KEY = "karomah_cashier_token";
const USER_KEY = "karomah_cashier_user";
const PRINTER_KEY = "karomah_printer_ready";

function canUseStorage() {
  return typeof window !== "undefined";
}

export function getAuthToken() {
  if (!canUseStorage()) {
    return null;
  }

  return window.localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): CashierUser | null {
  if (!canUseStorage()) {
    return null;
  }

  const value = window.localStorage.getItem(USER_KEY);

  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as CashierUser;
  } catch {
    return null;
  }
}

export function saveAuthSession(token: string, user: CashierUser) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(TOKEN_KEY, token);
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuthSession() {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
}

export function getPrinterReady() {
  if (!canUseStorage()) {
    return false;
  }

  return window.localStorage.getItem(PRINTER_KEY) === "true";
}

export function setPrinterReady(value: boolean) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(PRINTER_KEY, String(value));
}
