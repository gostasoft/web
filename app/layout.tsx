import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Metin3 — Efsane Yeniden",
  description: "Eski ruh, yeni bir efsane. Metin3 dünyasını keşfet.",
  icons: {
    icon: "/assets/brand/metin3-logo.png",
    shortcut: "/assets/brand/metin3-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body className="antialiased">{children}</body>
    </html>
  );
}
