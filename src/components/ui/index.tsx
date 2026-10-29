/**
 * Small presentational primitives shared by every page. Server-safe (no hooks).
 */
import Link from "next/link";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import type { Tone } from "@/lib/labels";
import { statusInfo } from "@/lib/labels";

export function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

/* ---------- Layout ---------- */

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        {eyebrow && <div className="mb-1 text-xs font-medium uppercase tracking-wider text-faint">{eyebrow}</div>}
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm leading-6 text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({
  title,
  description,
  action,
  children,
  className,
  padded = true,
}: {
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <section className={cx("rounded-xl border border-line bg-surface shadow-card", className)}>
      {(title || action) && (
        <header className="flex items-start justify-between gap-3 border-b border-line px-5 py-3.5">
          <div>
            {title && <h2 className="text-sm font-semibold">{title}</h2>}
            {description && <p className="mt-0.5 text-xs text-muted">{description}</p>}
          </div>
          {action}
        </header>
      )}
      <div className={padded ? "p-5" : undefined}>{children}</div>
    </section>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-10 text-center">
      {Icon && (
        <span className="mb-3 grid size-10 place-items-center rounded-full bg-surface-2 text-muted">
          <Icon className="size-5" aria-hidden />
        </span>
      )}
      <div className="text-sm font-medium">{title}</div>
      {description && <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/* ---------- Figures ---------- */

export function Stat({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: Tone;
}) {
  const valueTone: Record<Tone, string> = {
    neutral: "text-fg",
    good: "text-good-fg",
    warning: "text-warning-fg",
    danger: "text-danger-fg",
    info: "text-info-fg",
    muted: "text-faint",
  };
  return (
    <div className="rounded-xl border border-line bg-surface px-4 py-3.5 shadow-card">
      <div className="text-xs text-muted">{label}</div>
      <div className={cx("mt-1 text-2xl font-semibold tracking-tight", valueTone[tone])}>{value}</div>
      {hint && <div className="mt-0.5 text-xs text-faint">{hint}</div>}
    </div>
  );
}

/** Horizontal bar for a magnitude; one hue, track in a lighter step of the same surface. */
export function Bar({ label, count, share, hint }: { label: string; count: number; share: number; hint?: string }) {
  const width = Math.max(share * 100, count > 0 ? 2 : 0);
  return (
    <div className="grid grid-cols-[minmax(0,9rem)_1fr_auto] items-center gap-3 text-sm">
      <div className="truncate text-muted" title={hint}>
        {label}
      </div>
      <div className="h-2.5 overflow-hidden rounded-r bg-surface-2" role="img" aria-label={`${label}: ${count}`}>
        <div className="h-full rounded-r bg-accent" style={{ width: `${width}%` }} />
      </div>
      <div className="w-14 text-right text-xs text-muted tnum">
        <span className="font-medium text-fg">{count}</span> · {Math.round(share * 100)}%
      </div>
    </div>
  );
}

/* ---------- Badges ---------- */

const badgeTone: Record<Tone, string> = {
  neutral: "bg-surface-2 text-fg",
  good: "bg-good-bg text-good-fg",
  warning: "bg-warning-bg text-warning-fg",
  danger: "bg-danger-bg text-danger-fg",
  info: "bg-info-bg text-info-fg",
  muted: "border border-line text-faint",
};

const dotTone: Record<Tone, string> = {
  neutral: "bg-faint",
  good: "bg-good",
  warning: "bg-warning",
  danger: "bg-danger",
  info: "bg-info",
  muted: "bg-faint",
};

export function Badge({
  tone = "neutral",
  children,
  dot,
  pulse,
  className,
  title,
}: {
  tone?: Tone;
  children: ReactNode;
  dot?: boolean;
  pulse?: boolean;
  className?: string;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={cx(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium",
        badgeTone[tone],
        className
      )}
    >
      {dot && <span className={cx("size-1.5 rounded-full", dotTone[tone], pulse && "animate-pulse")} aria-hidden />}
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const s = statusInfo(status);
  return (
    <Badge tone={s.tone} dot pulse={s.live}>
      {s.label}
    </Badge>
  );
}

/* ---------- Buttons ---------- */

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

export function buttonClass(variant: Variant = "secondary", size: Size = "md", extra?: string) {
  const base =
    "inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50";
  const sizes: Record<Size, string> = { sm: "h-8 px-2.5 text-xs", md: "h-9 px-3.5 text-sm" };
  const variants: Record<Variant, string> = {
    primary: "bg-accent text-accent-fg hover:bg-accent-hover",
    secondary: "border border-line bg-surface text-fg hover:bg-surface-2",
    ghost: "text-muted hover:bg-surface-2 hover:text-fg",
    danger: "bg-danger text-white hover:opacity-90",
  };
  return cx(base, sizes[size], variants[variant], extra);
}

export function LinkButton({
  href,
  variant,
  size,
  className,
  children,
  external,
}: {
  href: string;
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
  external?: boolean;
}) {
  if (external) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={buttonClass(variant, size, className)}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={buttonClass(variant, size, className)}>
      {children}
    </Link>
  );
}

/* ---------- Tables ---------- */

export function Table({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cx("overflow-x-auto", className)}>
      <table className="w-full text-sm">{children}</table>
    </div>
  );
}

export function Th({ children, className, align = "left" }: { children?: ReactNode; className?: string; align?: "left" | "right" }) {
  return (
    <th
      scope="col"
      className={cx(
        "border-b border-line px-4 py-2.5 text-xs font-medium text-muted",
        align === "right" ? "text-right" : "text-left",
        className
      )}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  className,
  align = "left",
  title,
}: {
  children?: ReactNode;
  className?: string;
  align?: "left" | "right";
  title?: string;
}) {
  return (
    <td title={title} className={cx("px-4 py-3 align-middle", align === "right" && "text-right", className)}>
      {children}
    </td>
  );
}

export function Tr({ children, className }: { children: ReactNode; className?: string }) {
  return <tr className={cx("border-b border-line last:border-b-0 hover:bg-surface-2/60", className)}>{children}</tr>;
}

/* ---------- Misc ---------- */

export function KeyValue({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 text-sm">
      <dt className="shrink-0 text-muted">{label}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  );
}
