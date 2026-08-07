import type { Metadata, Viewport } from "next";

import { PwaRuntime } from "@/components/pwa/pwa-runtime";
import { metadataBrand } from "@/config/brand";

import "./globals.css";

export const metadata: Metadata = {
  title: metadataBrand.title,
  description: metadataBrand.description,
  manifest: "/manifest.webmanifest",
  icons: {
    apple: "/icons/apple-touch-icon.png",
    icon: [
      { url: "/brand/nagovori-icon.svg", type: "image/svg+xml" },
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#081814",
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
