import { ChevronRight } from "lucide-react";
import type { FunnelStage } from "@/lib/insights";
import { cx } from "@/components/ui";

/** Eligible to incremental, left to right. One hue; the last stage is the one the brand pays for. */
export function Funnel({ stages }: { stages: FunnelStage[] }) {
  return (
    <ol className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-7" aria-label="Retention funnel">
      {stages.map((s, i) => {
        const last = i === stages.length - 1;
        return (
          <li
            key={s.key}
            className={cx(
              "relative rounded-xl border px-4 py-3",
              last ? "border-accent bg-accent-soft" : "border-line bg-surface shadow-card"
            )}
          >
            {i > 0 && !last && (
              <ChevronRight
                className="absolute -left-2.5 top-1/2 hidden size-4 -translate-y-1/2 text-faint xl:block"
                aria-hidden
              />
            )}
            <div className={cx("text-xs", last ? "text-accent" : "text-muted")}>{s.label}</div>
            <div className={cx("mt-1 text-2xl font-semibold tracking-tight", last && "text-accent")}>
              {s.value == null ? "—" : s.value.toLocaleString("en-IN")}
            </div>
            <div className="mt-0.5 text-xs text-faint">
              {s.rate != null ? `${Math.round(s.rate * 100)}% of previous · ` : ""}
              {s.hint}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
