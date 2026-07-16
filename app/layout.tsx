import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const DESCRIPTION =
  "Track your vinyl collection, see your stats, and find what to buy next.";

export const metadata: Metadata = {
  title: {
    default: "VinylOS",
    template: "%s · VinylOS",
  },
  description: DESCRIPTION,
  applicationName: "VinylOS",
  appleWebApp: {
    capable: true,
    title: "VinylOS",
    statusBarStyle: "default",
  },
  openGraph: {
    siteName: "VinylOS",
    title: "VinylOS",
    description: DESCRIPTION,
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "VinylOS",
    description: DESCRIPTION,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  // Needed for env(safe-area-inset-*) to take effect on notched iPhones.
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
