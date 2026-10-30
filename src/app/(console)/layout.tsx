import { cookies } from "next/headers";
import { Sidebar } from "@/components/Sidebar";
import { optionalEnv } from "@/lib/env";
import { getOpenActionCount } from "@/lib/nav";

/** The console: every workspace page, with the sidebar. The landing page at / lives outside this group. */
export default async function ConsoleLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const brand = optionalEnv("BRAND_NAME", "Cosmix");
  const [openActions, cookieStore] = await Promise.all([getOpenActionCount(), cookies()]);
  const theme = cookieStore.get("theme")?.value;
  const dataTheme = theme === "light" || theme === "dark" ? theme : undefined;

  return (
    <div className="min-h-screen md:grid md:grid-cols-[232px_minmax(0,1fr)]">
      <Sidebar brand={brand} openActions={openActions} theme={dataTheme ?? "system"} />
      <div className="min-w-0">
        <main className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}
