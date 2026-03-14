import { Order } from "@/types";

export const paymentLabels: Record<Order["paymentMethod"], string> = {
  cash: "Tunai",
  qris: "QRIS",
  transfer: "Transfer",
};

export const cashierSteps: Order["status"][] = [
  "pending",
  "confirmed",
  "preparing",
  "ready",
  "completed",
];

export function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
