import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/Providers";
import { Analytics } from '@vercel/analytics/next';

export const metadata: Metadata = {
  title: "Kaizen Tracker | Tamarind",
  description:
    "Internal platform for submitting and tracking Kaizen (continuous improvement) projects across Tamarind branches.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
        <Analytics />
      </body>
    </html>
  );
}
