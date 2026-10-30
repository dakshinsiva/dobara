"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChartColumn,
  Grid3x3,
  LayoutDashboard,
  ListChecks,
  MessageCircleMore,
  Mic,
  Moon,
  Sun,
  PhoneCall,
  Settings2,
  Store,
  Upload,
  Users,
  type LucideIcon,
} from "lucide-react";

type Item = { href: string; label: string; icon: LucideIcon; badge?: number; accent?: boolean };

export function Sidebar({
  brand,
  openActions,
  theme,
}: {
  brand: string;
  openActions: number;
  theme: "light" | "dark" | "system";
}) {
  const pathname = usePathname();
  const nextTheme = theme === "dark" ? "light" : "dark";

  const primary: Item[] = [
    { href: "/overview", label: "Overview", icon: LayoutDashboard },
    { href: "/contacts", label: "Customers", icon: Users },
    { href: "/calls", label: "Calls", icon: PhoneCall },
    { href: "/actions", label: "Actions", icon: ListChecks, badge: openActions },
    { href: "/retention", label: "Retention", icon: Grid3x3 },
    { href: "/insights", label: "Insights", icon: ChartColumn },
    { href: "/talk", label: "Talk to Dobara", icon: Mic, accent: true },
    { href: "/ask", label: "Ask Dobara", icon: MessageCircleMore },
  ];
  const secondary: Item[] = [
    { href: "/connect", label: "Connect store", icon: Store },
    { href: "/import", label: "Import data", icon: Upload },
    { href: "/agent", label: "Agent", icon: Settings2 },
  ];

  const isActive = (href: string) => pathname.startsWith(href);

  const renderItem = (item: Item) => {
    const active = isActive(item.href);
    const Icon = item.icon;
    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={[
          "flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
          active
            ? "bg-surface font-medium text-fg shadow-card md:bg-accent-soft md:text-accent md:shadow-none"
            : item.accent
              ? "text-accent hover:bg-accent-soft"
              : "text-muted hover:bg-surface-2 hover:text-fg",
        ].join(" ")}
      >
        <Icon className="size-4 shrink-0" aria-hidden />
        <span className="whitespace-nowrap">{item.label}</span>
        {item.badge ? (
          <span className="ml-auto rounded-full bg-warning-bg px-1.5 py-0.5 text-[11px] font-semibold text-warning-fg tnum">
            {item.badge}
          </span>
        ) : null}
      </Link>
    );
  };

  return (
    <aside className="border-b border-line bg-surface md:sticky md:top-0 md:h-screen md:border-b-0 md:border-r md:relative">
      <div className="flex items-center gap-3 px-4 py-4 md:px-5">
        <Link href="/overview" className="flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-lg bg-accent text-accent-fg">
            <PhoneCall className="size-4" aria-hidden />
          </span>
          <span className="text-base font-semibold tracking-tight">Dobara</span>
        </Link>
        <div className="ml-auto flex items-center gap-2 md:hidden">
          <a
            href={`/api/theme?set=${nextTheme}&back=${encodeURIComponent(pathname)}`}
            className="grid size-8 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-fg"
            title="Switch theme"
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? <Sun className="size-4" aria-hidden /> : <Moon className="size-4" aria-hidden />}
          </a>
          <WorkspaceChip brand={brand} />
        </div>
      </div>

      <div className="hidden px-5 pb-4 md:block">
        <WorkspaceChip brand={brand} />
      </div>

      <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:px-3 md:pb-0" aria-label="Primary">
        {primary.map(renderItem)}
        <div className="hidden pt-3 md:block">
          <div className="px-3 pb-1 text-[11px] font-medium uppercase tracking-wider text-faint">Setup</div>
          {secondary.map(renderItem)}
        </div>
        <div className="flex gap-1 md:hidden">{secondary.map(renderItem)}</div>
      </nav>

      <div className="hidden px-5 pt-6 md:absolute md:bottom-5 md:block">
        <a
          href={`/api/theme?set=${nextTheme}&back=${encodeURIComponent(pathname)}`}
          className="mb-3 inline-flex items-center gap-2 rounded-lg px-2 py-1 text-xs text-muted hover:bg-surface-2 hover:text-fg"
          title="Switch theme"
        >
          {theme === "dark" ? <Sun className="size-3.5" aria-hidden /> : <Moon className="size-3.5" aria-hidden />}
          {theme === "dark" ? "Light mode" : "Dark mode"}
        </a>
        <div className="text-xs leading-5 text-faint">
          Voice by Bolna · Calls on Plivo
          <br />
          Speech by Sarvam
          <br />
          <Link href="/" className="hover:text-fg hover:underline">
            About Dobara
          </Link>
        </div>
      </div>
    </aside>
  );
}

function WorkspaceChip({ brand }: { brand: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-line bg-surface-2 px-2.5 py-1.5">
      <span className="grid size-6 place-items-center rounded-md bg-fg text-[11px] font-semibold text-surface">
        {brand.slice(0, 1).toUpperCase()}
      </span>
      <div className="leading-tight">
        <div className="text-sm font-medium">{brand}</div>
        <div className="hidden text-[11px] text-faint md:block">Retention workspace</div>
      </div>
    </div>
  );
}
