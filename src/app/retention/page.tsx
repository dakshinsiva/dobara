import Link from "next/link";
import { Grid3x3, Mic } from "lucide-react";
import { CampaignButton } from "@/components/CampaignButton";
import { Heatmap } from "@/components/Heatmap";
import { SetupNotice } from "@/components/SetupNotice";
import { Badge, Card, EmptyState, LinkButton, PageHeader, Stat, Table, Td, Th, Tr } from "@/components/ui";
import { optionalEnv } from "@/lib/env";
import { rangeText } from "@/lib/benchmarks";
import { getRetention, type Retention } from "@/lib/retention";
import { SEGMENT_TONE } from "@/lib/segments";
import { MIN_GAPS } from "@/lib/windows";

export const dynamic = "force-dynamic";
export const metadata = { title: "Retention" };

const pct = (r: number | null | undefined) => (r == null ? "—" : `${Math.round(r * 100)}%`);
const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
const ORDINAL = ["", "First", "Second", "Third", "Fourth"];

export default async function RetentionPage() {
  const brand = optionalEnv("BRAND_NAME", "Cosmix");
  let r: Retention;
  try {
    r = await getRetention();
  } catch (e) {
    return <SetupNotice error={e instanceof Error ? e.message : String(e)} />;
  }
  const atRisk = r.segments.find((s) => s.segment === "at_risk")!;
  const anyRevenue = r.segments.some((s) => s.revenue != null);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={`${brand} · Retention`}
        title="Who comes back, and when"
        description="Cohort curves, the purchase ladder, the reorder cycle learned from real gaps, and segments that each map to a call. The analysis a retention lead builds in a spreadsheet, with the phone call attached."
        actions={
          <>
            <LinkButton href="/contacts?segment=at_risk" variant="secondary">
              At-risk customers
            </LinkButton>
            <LinkButton href="/talk" variant="primary">
              <Mic className="size-4" aria-hidden />
              Talk to Dobara
            </LinkButton>
          </>
        }
      />

      {r.withPurchases === 0 ? (
        <Card padded={false}>
          <EmptyState
            icon={Grid3x3}
            title="No purchases on record yet"
            description="Connect the Shopify store or load the sample store. Cohorts, the reorder cycle and segments build themselves from the orders."
            action={
              <LinkButton href="/connect" variant="primary">
                Connect store
              </LinkButton>
            }
          />
        </Card>
      ) : (
        <>
          <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Retention at a glance">
            <Stat
              label="Second-order rate"
              value={pct(r.secondOrderRate)}
              hint={`D2C ${rangeText(r.benchmarks.secondOrder)} · India ${rangeText(r.benchmarks.indiaD2C)}`}
              tone={r.ladder[0].verdict === "above" ? "good" : r.ladder[0].verdict === "below" ? "warning" : "neutral"}
            />
            <Stat
              label="Reorder cycle"
              value={`${r.cycleDays ?? r.defaultDays} d`}
              hint={
                r.cycleDays == null
                  ? "default; no repeat gaps yet"
                  : `median of ${r.cycleGaps} gap${r.cycleGaps === 1 ? "" : "s"} · calls on day ${r.callDay}`
              }
            />
            <Stat
              label="Weak cohorts"
              value={r.cohorts.weak.length}
              hint={
                r.cohorts.referenceOffset == null
                  ? "needs 3 cohorts older than a month"
                  : `15+ points under typical at +${r.cohorts.referenceOffset} mo`
              }
              tone={r.cohorts.weak.length ? "warning" : "neutral"}
            />
            <Stat
              label="At risk"
              value={atRisk.customers}
              hint={
                atRisk.revenue != null
                  ? `${inr(atRisk.revenue)} past spend · ${atRisk.callable} callable`
                  : `repeat buyers gone quiet · ${atRisk.callable} callable`
              }
              tone={atRisk.customers ? "warning" : "neutral"}
            />
          </section>

          <div className="grid gap-6 lg:grid-cols-5">
            <Card
              className="lg:col-span-3"
              title="Cohort curves"
              description="Share of each month's new customers who had placed a second order by +N months."
              padded={false}
            >
              <div className="p-3">
                <Heatmap table={r.cohorts} />
              </div>
              <p className="border-t border-line px-5 py-3 text-xs leading-5 text-faint">
                A cohort is the month of the first order. The dashed cell is the current month, still filling.
                {r.orderRows === 0 &&
                  " Without a store connection, first, last and recorded reorder dates from the import stand in for order history."}
              </p>
            </Card>

            <Card className="lg:col-span-2" title="What the cohorts say" description="The numbers, read for you.">
              <ul className="space-y-3 text-sm leading-6">
                {r.insights.map((line) => (
                  <li key={line} className="flex gap-2.5">
                    <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
              {r.cohorts.weak.length > 0 && (
                <p className="mt-4 text-xs leading-5 text-faint">
                  A weak month is where to look first: what changed in the product, the offer or the channel that month.
                  The calls to those customers will tell you.
                </p>
              )}
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card
              title="Purchase ladder"
              description="Each step is where a customer either becomes a habit or disappears. The grey band is the published D2C range."
            >
              <ol className="space-y-4">
                {r.ladder.map((s) => (
                  <li key={s.from}>
                    <div className="mb-1 flex items-baseline justify-between text-sm">
                      <span className="font-medium">
                        {ORDINAL[s.from]} → {ORDINAL[s.to].toLowerCase()} order
                      </span>
                      <span className="text-muted tnum">
                        {s.converted} of {s.base} · {pct(s.rate)}
                      </span>
                    </div>
                    <div className="relative h-2.5 overflow-hidden rounded-r bg-surface-2">
                      <div
                        className="absolute inset-y-0 bg-faint/30"
                        style={{
                          left: `${s.benchmark.low * 100}%`,
                          width: `${(s.benchmark.high - s.benchmark.low) * 100}%`,
                        }}
                        title={`Benchmark ${rangeText(s.benchmark)}`}
                      />
                      <div
                        className="relative h-full rounded-r bg-accent"
                        style={{ width: `${(s.rate ?? 0) * 100}%` }}
                      />
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-3 text-xs text-faint">
                      <span>{s.benchmark.label}</span>
                      {s.verdict && (
                        <Badge tone={s.verdict === "below" ? "warning" : s.verdict === "above" ? "good" : "neutral"}>
                          {s.verdict === "within" ? "in range" : s.verdict}
                        </Badge>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </Card>

            <Card
              title="This week against last"
              description="Seven days to now, against the seven before."
              padded={false}
            >
              <Table>
                <thead>
                  <tr>
                    <Th />
                    <Th align="right">This week</Th>
                    <Th align="right">Last week</Th>
                    <Th align="right">Change</Th>
                  </tr>
                </thead>
                <tbody>
                  {r.week.map((w) => {
                    const delta = w.thisWeek - w.lastWeek;
                    return (
                      <Tr key={w.label}>
                        <Td className="text-muted">{w.label}</Td>
                        <Td align="right" className="font-medium tnum">
                          {w.thisWeek}
                        </Td>
                        <Td align="right" className="text-muted tnum">
                          {w.lastWeek}
                        </Td>
                        <Td align="right" className="tnum">
                          {delta === 0 ? (
                            <span className="text-faint">—</span>
                          ) : (
                            <span className={delta > 0 ? "text-good-fg" : "text-danger-fg"}>
                              {delta > 0 ? "+" : ""}
                              {delta}
                            </span>
                          )}
                        </Td>
                      </Tr>
                    );
                  })}
                </tbody>
              </Table>
            </Card>
          </div>

          <Card
            title="Segments, each with a call"
            description={`Recency in reorder cycles of ${r.cycleDays ?? r.defaultDays} days, frequency in orders. Where other tools sync a segment to an email flow, Dobara dials it.`}
            padded={false}
          >
            <Table>
              <thead>
                <tr>
                  <Th>Segment</Th>
                  <Th align="right">Customers</Th>
                  {anyRevenue && <Th align="right">Past spend</Th>}
                  <Th align="right">Orders each</Th>
                  <Th>What Dobara does</Th>
                  <Th align="right">Call</Th>
                </tr>
              </thead>
              <tbody>
                {[...r.segments]
                  .sort((a, b) => a.priority - b.priority)
                  .map((s) => (
                    <Tr key={s.segment}>
                      <Td>
                        <Link href={`/contacts?segment=${s.segment}`} className="hover:underline">
                          <Badge tone={SEGMENT_TONE[s.segment]}>{s.label}</Badge>
                        </Link>
                        <div className="mt-1 text-xs text-faint">{s.rule}</div>
                      </Td>
                      <Td align="right" className="whitespace-nowrap tnum">
                        <span className="font-medium">{s.customers}</span>
                        <span className="ml-1 text-xs text-muted">{pct(s.share)}</span>
                      </Td>
                      {anyRevenue && (
                        <Td align="right" className="whitespace-nowrap text-muted tnum">
                          {s.revenue ? inr(s.revenue) : "—"}
                        </Td>
                      )}
                      <Td align="right" className="text-muted tnum">
                        {s.avgOrders == null ? "—" : s.avgOrders.toFixed(1)}
                      </Td>
                      <Td className="min-w-[16rem] max-w-[26rem] text-muted">{s.playbook}</Td>
                      <Td align="right">
                        <CampaignButton segment={s.segment} eligible={s.callable} />
                      </Td>
                    </Tr>
                  ))}
              </tbody>
            </Table>
          </Card>

          <Card
            title="When to call, per product"
            description={`How long one order lasts, learned from the gaps between repeat orders. A product's own window replaces the ${r.defaultDays}-day default once it has ${MIN_GAPS} gaps; calls go out at 80% of the cycle.`}
            padded={false}
          >
            {r.windows.length === 0 ? (
              <p className="p-5 text-sm text-faint">
                Windows learn from order rows, which come from the store sync.{" "}
                <Link href="/connect" className="underline hover:text-fg">
                  Connect the store
                </Link>{" "}
                or load the sample store.
              </p>
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>Product</Th>
                    <Th align="right">Customers</Th>
                    <Th align="right">Repeat gaps</Th>
                    <Th align="right">Median</Th>
                    <Th align="right">Middle half</Th>
                    <Th align="right">Call on day</Th>
                    <Th>Window</Th>
                  </tr>
                </thead>
                <tbody>
                  {r.windows.map((w) => (
                    <Tr key={w.product}>
                      <Td className="font-medium">{w.product}</Td>
                      <Td align="right" className="tnum">
                        {w.customers}
                      </Td>
                      <Td align="right" className="tnum">
                        {w.gaps}
                      </Td>
                      <Td align="right" className="tnum">
                        {w.median == null ? "—" : `${w.median} d`}
                      </Td>
                      <Td align="right" className="whitespace-nowrap text-muted tnum">
                        {w.p25 == null || w.p75 == null ? "—" : `${w.p25}–${w.p75} d`}
                      </Td>
                      <Td align="right" className="font-medium tnum">
                        {w.callDay}
                      </Td>
                      <Td>
                        {w.applied ? (
                          <Badge tone="good" dot>
                            Learned · {w.daysPerOrder} days
                          </Badge>
                        ) : w.gaps > 0 ? (
                          <Badge tone="info">
                            Learning · {w.gaps} of {MIN_GAPS} gaps
                          </Badge>
                        ) : (
                          <Badge tone="muted">Default · {w.daysPerOrder} days</Badge>
                        )}
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>

          <p className="text-xs leading-5 text-faint">
            Benchmarks are published D2C ranges (Datadrew, 2026; Growwwtech on Indian D2C, 2026), shown for context.
            Cohort cells are cumulative second-order rates by month since first order. Segments: champions, loyal and
            promising bought within 1.5 cycles with 3+, 2 and 1 orders; at risk and hibernating are overdue repeat and
            one-time buyers; lost is 90 days or three cycles without an order.
          </p>
        </>
      )}
    </div>
  );
}
