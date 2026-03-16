import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Fraunces } from "next/font/google";
import "./globals.css";
import { AppFooter } from "@/components/AppFooter";

const jakartaSans = Plus_Jakarta_Sans({
  variable: "--font-jakarta-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
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
      <body className={`${jakartaSans.variable} ${fraunces.variable} flex min-h-screen flex-col antialiased`}>
        <div className="flex-1">{children}</div>
        <AppFooter />
      </body>
    </html>
  );
}
