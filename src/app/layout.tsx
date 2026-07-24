import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

const description =
  "Gestão visual para pequenos negócios: contratos e MRR, estoque, vendas, pipeline, folha e metas — num painel único, bonito e fácil de usar.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "OrbiCore — Gestão visual para pequenos negócios",
    template: "%s · OrbiCore",
  },
  description,
  applicationName: "OrbiCore",
  manifest: "/manifest.webmanifest",
  keywords: [
    "gestão para pequenos negócios",
    "MRR",
    "receita recorrente",
    "controle de estoque",
    "gestão de contratos",
    "pipeline de vendas",
    "dashboard financeiro",
    "OrbiCore",
    "Orbitamos",
  ],
  authors: [{ name: "Orbitamos" }],
  creator: "Orbitamos",
  publisher: "Orbitamos",
  robots: { index: true, follow: true },
  alternates: { canonical: "/" },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "OrbiCore",
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: "/",
    siteName: "OrbiCore",
    title: "OrbiCore — Gestão visual para pequenos negócios",
    description,
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "OrbiCore" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "OrbiCore — Gestão visual para pequenos negócios",
    description,
    images: ["/og-image.png"],
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0f1b",
  colorScheme: "dark light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
      data-theme="dark"
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          {children}
        </ThemeProvider>
        <Toaster />
      </body>
    </html>
  );
}
