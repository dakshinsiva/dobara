import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dobara",
  description: "Retention calls for consumer brands, built on Bolna and Plivo.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-gray-900 antialiased dark:bg-neutral-950 dark:text-gray-100">
        <header className="border-b border-gray-200 dark:border-neutral-800">
          <nav className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3 text-sm">
            <Link href="/" className="font-semibold">
              Dobara
            </Link>
            <Link href="/" className="text-gray-600 hover:text-black dark:text-gray-400 dark:hover:text-white">
              Dashboard
            </Link>
            <Link href="/import" className="text-gray-600 hover:text-black dark:text-gray-400 dark:hover:text-white">
              Import contacts
            </Link>
          </nav>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
