import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppFooter } from "@/components/AppFooter";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Karomah Food | Pemesanan & Kasir",
  description: "Aplikasi pemesanan pelanggan dan dashboard kasir untuk rumah makan Karomah Food.",
  icons: {
    icon: "/image/logo.svg",
    shortcut: "/image/logo.svg",
    apple: "/image/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className={`${geistSans.variable} ${geistMono.variable} flex min-h-screen flex-col antialiased`}>
        <div className="flex-1">{children}</div>
        <AppFooter />
      </body>
    </html>
  );
}
