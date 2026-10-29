import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import { Sidebar } from "@/components/Sidebar";
import { optionalEnv } from "@/lib/env";
import { getOpenActionCount } from "@/lib/nav";
import "./globals.css";

const sans = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

const siteUrl = process.env.PUBLIC_BASE_URL || "https://dobara-app.vercel.app";
const description =
  "The retention agent for consumer brands. Dobara calls customers before they lapse, in their language, remembers every call, and proves the lift against customers it never called.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "Dobara", template: "%s · Dobara" },
  description,
  applicationName: "Dobara",
  keywords: ["retention", "voice agent", "D2C", "Shopify", "Bolna", "Plivo", "Sarvam", "India", "customer retention"],
  authors: [{ name: "Dakshin Siva" }, { name: "Chiranjeevi Vijayaraghavan" }],
  creator: "Dobara",
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: siteUrl,
    siteName: "Dobara",
    title: "Dobara, the retention agent for consumer brands",
    description,
  },
  twitter: {
    card: "summary_large_image",
    title: "Dobara, the retention agent for consumer brands",
    description,
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f5f2" },
    { media: "(prefers-color-scheme: dark)", color: "#121413" },
  ],
  colorScheme: "light dark",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const brand = optionalEnv("BRAND_NAME", "Cosmix");
  const [openActions, cookieStore] = await Promise.all([getOpenActionCount(), cookies()]);
  const theme = cookieStore.get("theme")?.value;
  const dataTheme = theme === "light" || theme === "dark" ? theme : undefined;

  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`} data-theme={dataTheme}>
      <body className="min-h-screen bg-canvas text-fg">
        <div className="min-h-screen md:grid md:grid-cols-[232px_minmax(0,1fr)]">
          <Sidebar brand={brand} openActions={openActions} theme={dataTheme ?? "system"} />
          <div className="min-w-0">
            <main className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-8">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
