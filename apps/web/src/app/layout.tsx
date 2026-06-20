import type { Metadata, Viewport } from "next";

import { PwaRuntime } from "@/components/pwa/pwa-runtime";
import { metadataBrand } from "@/config/brand";

import "./globals.css";

export const metadata: Metadata = {
  title: metadataBrand.title,
  description: metadataBrand.description,
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f5f7f4",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body>
        <PwaRuntime />
        {children}
      </body>
    </html>
  );
}
