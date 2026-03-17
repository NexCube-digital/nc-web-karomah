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
  metadataBase: new URL("https://menukaromahfood.netlify.app"),
  icons: {
    icon: "/image/logo.svg",
    shortcut: "/image/logo.svg",
    apple: "/image/logo.svg",
  },
  openGraph: {
    title: "Karomah Food | Pemesanan & Kasir",
    description: "Aplikasi pemesanan pelanggan dan dashboard kasir untuk rumah makan Karomah Food.",
    url: "https://menukaromahfood.netlify.app",
    siteName: "Karomah Food",
    images: [
      {
        url: "/image/logo.svg",
        width: 512,
        height: 512,
        alt: "Logo Karomah Food",
      },
    ],
    locale: "id_ID",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Karomah Food | Pemesanan & Kasir",
    description: "Aplikasi pemesanan pelanggan dan dashboard kasir untuk rumah makan Karomah Food.",
    images: ["/image/logo.svg"],
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
