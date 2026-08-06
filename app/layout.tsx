import type { Metadata, Viewport } from "next";
import { Bodoni_Moda, IBM_Plex_Mono, Mulish } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";

// Display face for headings — a Bodoni revival, the register of a record sleeve.
const bodoni = Bodoni_Moda({
  variable: "--font-bodoni",
  subsets: ["latin"],
  display: "swap",
});

const mulish = Mulish({
  variable: "--font-mulish",
  subsets: ["latin"],
  display: "swap",
});

// Small caps-ish labels: eyebrows, tags, catalogue numbers.
const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
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
  // Must track --room-bg in globals.css, or the browser chrome frames the app in
  // a ground it no longer uses.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#e9e6ee" },
    { media: "(prefers-color-scheme: dark)", color: "#0e0d11" },
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
      className={`${mulish.variable} ${bodoni.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
