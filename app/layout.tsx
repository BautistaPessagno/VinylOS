import type { Metadata, Viewport } from "next";
import { Bodoni_Moda, IBM_Plex_Mono, Mulish } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

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

export const metadata: Metadata = {
  // Resolves relative OG/Twitter image paths and the per-page canonicals below.
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — Tu colección de vinilos`,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  alternates: { canonical: "/" },
  appleWebApp: {
    capable: true,
    title: SITE_NAME,
    statusBarStyle: "default",
  },
  openGraph: {
    siteName: SITE_NAME,
    title: `${SITE_NAME} — Tu colección de vinilos`,
    description: SITE_DESCRIPTION,
    type: "website",
    locale: "es_ES",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — Tu colección de vinilos`,
    description: SITE_DESCRIPTION,
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
      lang="es"
      className={`${mulish.variable} ${bodoni.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
