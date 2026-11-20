import type { Metadata, Viewport } from "next";
import { brand } from "@/lib/brand";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: `${brand.productName} — ${brand.tagline}`, template: `%s · ${brand.name}` },
  description: "QR menus, ordering, POS, kitchen display and restaurant management in one calm, considered system.",
};

export const viewport: Viewport = {
  themeColor: "#f5f3ee",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
