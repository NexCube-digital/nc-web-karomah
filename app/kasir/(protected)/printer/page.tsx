"use client";

import { useState } from "react";
import { Printer } from "lucide-react";
import { useCashierContext } from "@/app/kasir/_context/CashierContext";

export default function CashierPrinterPage() {
  const { printerConnected, connectPrinter } = useCashierContext();
  const [feedback, setFeedback] = useState<string | null>(null);

  async function handleConnect() {
    await connectPrinter();
    setFeedback("Printer berhasil disiapkan. Silakan lanjutkan cetak dari halaman order.");
  }

  function handleTestPrint() {
    const printWindow = window.open("", "_blank", "width=420,height=640");

    if (!printWindow) {
      setFeedback("Popup diblokir browser. Izinkan popup untuk test print.");
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Test Printer Karomah</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #0f172a; }
            h1 { margin-bottom: 8px; }
            p { line-height: 1.6; }
          </style>
        </head>
        <body>
          <h1>Test Printer Karomah Food</h1>
          <p>Status printer: ${printerConnected ? "Terhubung" : "Belum terhubung"}</p>
          <p>Jika halaman ini tercetak, integrasi browser print sudah siap dipakai.</p>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  return (
    <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="rounded-4xl bg-white p-8 shadow-sm ring-1 ring-slate-100">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-600">Koneksi printer</p>
        <h1 className="mt-2 text-3xl font-black text-slate-950">Persiapan mesin struk</h1>
        <p className="mt-4 text-sm leading-7 text-slate-600">
          Halaman ini khusus untuk konfigurasi printer kasir. Setelah terhubung, proses cetak struk
          bisa langsung dilakukan dari halaman antrean order.
        </p>

        <div className="mt-6 rounded-3xl bg-slate-50 p-4">
          <p className="text-sm text-slate-500">Status saat ini</p>
          <p className="mt-2 text-lg font-bold text-slate-950">
            {printerConnected ? "Printer terhubung" : "Printer belum terhubung"}
          </p>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleConnect}
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-500"
          >
            <Printer className="h-4 w-4" />
            Hubungkan printer
          </button>
          <button
            type="button"
            onClick={handleTestPrint}
            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-orange-300 hover:text-orange-600"
          >
            Test print
          </button>
        </div>

        {feedback && (
          <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            {feedback}
          </div>
        )}
      </div>

      <div className="rounded-4xl bg-slate-950 p-8 text-white shadow-sm">
        <h2 className="text-2xl font-black">Checklist setup</h2>
        <ul className="mt-6 space-y-4 text-sm leading-6 text-slate-300">
          <li>1. Nyalakan printer thermal dan hubungkan ke USB/Bluetooth.</li>
          <li>2. Klik tombol Hubungkan printer di halaman ini.</li>
          <li>3. Jalankan Test print untuk verifikasi output.</li>
          <li>4. Jika sudah benar, cetak struk nyata dari halaman order.</li>
        </ul>
      </div>
    </section>
  );
}
