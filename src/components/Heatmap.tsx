import type { CohortTable } from "@/lib/retention";
import { cx } from "@/components/ui";

/**
 * Cohort retention heatmap. Rows are first-order months, columns are months
 * since that first order, cells are the share of the cohort that had placed a
 * second order by then. One hue, intensity by value; the diagonal is the month
 * still in progress. Server component: plain table, no client code.
 */
export function Heatmap({ table }: { table: CohortTable }) {
  const { rows, columns, typical } = table;
  const flagged = new Set(table.weak.map((w) => w.month));
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-muted">
              First order
            </th>
            <th scope="col" className="px-2 py-2 text-right text-xs font-medium text-muted" title="Customers">
              n
            </th>
            {Array.from({ length: columns }, (_, k) => (
              <th
                key={k}
                scope="col"
                className="px-1 py-2 text-center text-xs font-medium text-muted tnum"
                title={
                  k === 0 ? "Second order in the same month" : `Second order within ${k} month${k === 1 ? "" : "s"}`
                }
              >
                {k === 0 ? "+0" : `+${k} mo`}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.month} className="border-t border-line">
              <th scope="row" className="whitespace-nowrap px-3 py-1.5 text-left font-medium">
                {r.label}
                {flagged.has(r.month) && (
                  <span className="ml-2 rounded-full bg-warning-bg px-1.5 py-0.5 text-[10px] font-semibold text-warning-fg">
                    weak
                  </span>
                )}
              </th>
              <td className="px-2 py-1.5 text-right text-muted tnum">{r.size}</td>
              {r.cells.map((v, k) => (
                <Cell key={k} value={v} current={k === r.ageMonths} small={r.size < 3} />
              ))}
            </tr>
          ))}
          <tr className="border-t border-line">
            <th scope="row" className="px-3 py-1.5 text-left text-xs font-medium text-muted">
              Typical month
            </th>
            <td />
            {typical.map((v, k) => (
              <td key={k} className="px-1 py-1.5 text-center text-xs text-muted tnum">
                {v == null ? "" : `${Math.round(v * 100)}%`}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function Cell({ value, current, small }: { value: number | null; current: boolean; small: boolean }) {
  if (value == null) return <td className="px-1 py-1.5" />;
  const mix = Math.round(8 + Math.min(1, value / 0.7) * 72);
  return (
    <td className="px-1 py-1">
      <div
        className={cx(
          "rounded-md px-1 py-1.5 text-center text-xs font-medium tnum",
          current && "outline-dashed outline-1 outline-offset-[-1px] outline-faint",
          small && "opacity-70"
        )}
        style={{ background: `color-mix(in oklab, var(--accent) ${mix}%, transparent)` }}
        title={current ? "This month, still filling" : small ? "Fewer than 3 customers" : undefined}
      >
        {Math.round(value * 100)}%
      </div>
    </td>
  );
}
