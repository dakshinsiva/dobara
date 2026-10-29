import Link from "next/link";
import { Check, ChevronRight } from "lucide-react";
import { cx } from "@/components/ui";

export type Step = { title: string; detail: string; href: string; done: boolean };

/** Shown on the Overview until every step is done. Each step is one page away. */
export function GettingStarted({ steps }: { steps: Step[] }) {
  const remaining = steps.filter((s) => !s.done).length;
  if (remaining === 0) return null;
  const next = steps.find((s) => !s.done);
  return (
    <section className="rounded-xl border border-accent/40 bg-accent-soft/40 p-5" aria-label="Getting started">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold">Getting started</h2>
        <span className="text-xs text-muted">
          {steps.length - remaining} of {steps.length} done
        </span>
      </div>
      <ol className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-5">
        {steps.map((s, i) => (
          <li key={s.title}>
            <Link
              href={s.href}
              className={cx(
                "flex h-full items-start gap-2.5 rounded-lg border px-3 py-2.5 text-sm transition-colors",
                s.done
                  ? "border-line bg-surface text-muted"
                  : s === next
                    ? "border-accent bg-surface shadow-card hover:bg-surface-2"
                    : "border-line bg-surface hover:bg-surface-2"
              )}
            >
              <span
                className={cx(
                  "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full text-[11px] font-semibold",
                  s.done ? "bg-good-bg text-good-fg" : "bg-surface-2 text-muted"
                )}
                aria-hidden
              >
                {s.done ? <Check className="size-3" /> : i + 1}
              </span>
              <span className="min-w-0">
                <span className={cx("block font-medium", s.done && "line-through decoration-faint")}>{s.title}</span>
                <span className="block text-xs text-muted">{s.detail}</span>
              </span>
              {s === next && <ChevronRight className="ml-auto mt-0.5 size-4 shrink-0 text-accent" aria-hidden />}
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
