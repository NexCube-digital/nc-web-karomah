"use client";

import { CheckCircle2, CircleAlert, X } from "lucide-react";

type CrudToastProps = {
  message: string | null;
  isError?: boolean;
  onClose: () => void;
};

export function CrudToast({ message, isError = false, onClose }: CrudToastProps) {
  if (!message) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-70 flex justify-center px-4 sm:justify-end sm:px-6 lg:px-8">
      <div
        role="status"
        aria-live="polite"
        className={`pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-2xl border px-4 py-3 text-sm shadow-lg backdrop-blur transition sm:max-w-lg ${
          isError
            ? "border-rose-200 bg-rose-50/95 text-rose-700"
            : "border-emerald-200 bg-emerald-50/95 text-emerald-700"
        }`}
      >
        <span className="mt-0.5 shrink-0" aria-hidden="true">
          {isError ? <CircleAlert className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
        </span>
        <span className="flex-1 font-medium">{message}</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup notifikasi"
          className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-lg opacity-70 transition hover:opacity-100"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
