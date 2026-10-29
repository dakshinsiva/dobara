import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Sidebar } from "@/components/Sidebar";
import { optionalEnv } from "@/lib/env";
import { getOpenActionCount } from "@/lib/nav";
import "./globals.css";

const sans = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export const metadata: Metadata = {
  title: { default: "Dobara", template: "%s · Dobara" },
  description: "The retention agent for consumer brands. Voice check-ins that bring customers back.",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const brand = optionalEnv("BRAND_NAME", "Cosmix");
  const openActions = await getOpenActionCount();

  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body className="min-h-screen bg-canvas text-fg">
        <div className="min-h-screen md:grid md:grid-cols-[232px_minmax(0,1fr)]">
          <Sidebar brand={brand} openActions={openActions} />
          <div className="min-w-0">
            <main className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-8">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
