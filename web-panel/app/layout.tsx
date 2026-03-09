import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// YENİ: Manifest dosyası eklendi (Uygulama kimliği)
export const metadata: Metadata = {
  title: 'FırsatGoOnline | Anlık Fırsat Platformu',
  description: 'Anlık fırsatları yakala, bütçeni koru!',
  manifest: '/manifest.json',
};

// YENİ: Telefonun üst çubuğunu FırsatGo turuncusu yapar
export const viewport = {
  themeColor: '#f97316',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}