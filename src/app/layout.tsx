import type { Metadata, Viewport } from "next";
import { Geist, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const base = process.env.NEXT_PUBLIC_BASE_PATH || "";

export const metadata: Metadata = {
  title: "GlowAtlas · Light Up the World",
  description:
    "Mark the countries you have visited on a real world map and watch them glow. Rich statistics, continent progress, travel timeline, wishlist, achievements and shareable summary cards.",
  keywords: [
    "countries visited",
    "travel map",
    "world map",
    "visited countries tracker",
    "travel statistics",
    "Google Maps",
    "country collector",
  ],
  authors: [{ name: "GlowAtlas" }],
  icons: { icon: `${base}/glowatlas.svg` },
  openGraph: {
    title: "GlowAtlas · Light Up the World",
    description: "Mark the countries you have visited on a real world map and watch them glow.",
    siteName: "GlowAtlas",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [{ media: "(prefers-color-scheme: dark)", color: "#0a0a08" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${spaceGrotesk.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster position="bottom-center" />
      </body>
    </html>
  );
}
