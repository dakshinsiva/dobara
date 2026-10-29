import Link from "next/link";
import { ArrowRight, Mic, PhoneOutgoing } from "lucide-react";
import { AutoRefresh } from "@/components/AutoRefresh";
import { GettingStarted, type Step } from "@/components/GettingStarted";
import { SetupNotice } from "@/components/SetupNotice";
import { Badge, Bar, Card, EmptyState, LinkButton, PageHeader, Stat, Table, Td, Th, Tr } from "@/components/ui";
import { activeCalls } from "@/lib/calls";
import { optionalEnv } from "@/lib/env";
import { fmtDuration, fmtInrFromCents, pct } from "@/lib/format";
import { describeSignificance, getRetentionHealth, type RetentionHealth } from "@/lib/insights";
import { getIntegration } from "@/lib/shopify/sync";
import { COHORT_HINT, COHORT_LABEL, isLive } from "@/lib/labels";
import type { Cohort } from "@/db/schema";

export const dynamic = "force-dynamic";

const LIFECYCLE: Array<{ key: Cohort; bar: string; dot: string }> = [
  { key: "new", bar: "bg-info", dot: "bg-info" },
  { key: "active", bar: "bg-good", dot: "bg-good" },
  { key: "running_low", bar: "bg-warning", dot: "bg-warning" },
  { key: "lapsed", bar: "bg-danger", dot: "bg-danger" },
];

function inr(n: number): string {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

export default async function OverviewPage() {
  const brand = optionalEnv("BRAND_NAME", "Cosmix");
  const agentReady = Boolean(process.env.BOLNA_AGENT_ID && process.env.BOLNA_API_KEY);
  let h: RetentionHealth;
  let liveIds: string[] = [];
  let storeConnected = false;
  try {
    const [health, live, integration] = await Promise.all([
      getRetentionHealth(),
      activeCalls(),
      getIntegration("shopify"),
    ]);
    h = health;
    liveIds = live.filter((c) => isLive(c)).map((c) => c.id);
    storeConnected = Boolean(integration);
  } catch (e) {
    return <SetupNotice error={e instanceof Error ? e.message : String(e)} />;
  }

  const lifecycleTotal = Object.values(h.lifecycle).reduce((a, b) => a + b, 0);
  const lift = h.lift;
  const steps: Step[] = [
    {
      title: "Bring in customers",
      detail: storeConnected ? "Store connected" : "Connect Shopify or load the sample store",
      href: "/connect",
      done: storeConnected || h.base > 0,
    },
    {
      title: "Add a number you can answer",
      detail: "So you can hear the agent yourself",
      href: "/import",
      done: h.onboarding.csvContacts > 0,
    },
    {
      title: "Hear a conversation",
      detail: "Call now on Customers, or talk in the browser",
      href: h.onboarding.csvContacts > 0 ? "/contacts?cohort=running_low" : "/talk",
      done: h.conversations > 0,
    },
    {
      title: "Clear a follow-up",
      detail: "Send the WhatsApp link the agent promised",
      href: "/actions",
      done: h.onboarding.doneActions > 0,
    },
    {
      title: "Record a reorder",
      detail: "From the store sync or the Import page; this fills the lift",
      href: "/import",
      done: h.onboarding.anyReordered,
    },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={`${brand} · Retention health`}
        title="How the customer base is holding"
        description="Who is coming back, who is about to leave, why they leave, and whether calling them changes it."
        actions={
          <>
            <AutoRefresh callIds={liveIds} />
            <LinkButton href="/contacts" variant="secondary">
              <PhoneOutgoing className="size-4" aria-hidden />
              Call a customer
            </LinkButton>
            <LinkButton href="/talk" variant="primary">
              <Mic className="size-4" aria-hidden />
              Talk to Dobara
            </LinkButton>
          </>
        }
      />

      {!agentReady && (
        <SetupNotice error="BOLNA_API_KEY or BOLNA_AGENT_ID is missing, so calls cannot be started yet." />
      )}

      <GettingStarted steps={steps} />

      {h.base === 0 ? (
        <Card padded={false}>
          <EmptyState
            title="No customers yet"
            description="Connect the Shopify store or import a CSV and this page fills in: repeat rate, who is at risk, why customers leave, and the lift from calling them."
            action={
              <LinkButton href="/connect" variant="primary">
                Connect store
              </LinkButton>
            }
          />
        </Card>
      ) : (
        <>
          <section className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6" aria-label="Health at a glance">
            <Stat
              label="Repeat rate"
              value={h.repeatRate == null ? "—" : `${Math.round(h.repeatRate * 100)}%`}
              hint={`${h.repeaters} of ${h.base} bought more than once`}
              tone={h.repeatRate != null && h.repeatRate >= 0.3 ? "good" : "neutral"}
            />
            <Stat
              label="Days between orders"
              value={h.medianDaysBetweenOrders ?? "—"}
              hint={h.medianDaysBetweenOrders ? "median, repeat buyers" : "needs repeat buyers"}
            />
            <Stat
              label="At risk this week"
              value={h.atRiskThisWeek}
              hint={
                h.revenueAtRisk != null
                  ? `${inr(h.revenueAtRisk)} at ${inr(h.reorderValueInr!)} a reorder`
                  : "running low on product"
              }
              tone={h.atRiskThisWeek ? "warning" : "neutral"}
            />
            <Stat
              label="Lapsed"
              value={h.lifecycle.lapsed}
              hint="no order in 60 days"
              tone={h.lifecycle.lapsed ? "danger" : "neutral"}
            />
            <Stat
              label="Reorder lift"
              value={lift.points == null ? "—" : `${lift.points >= 0 ? "+" : ""}${lift.points.toFixed(0)} pts`}
              hint={
                lift.points == null ? "called vs control" : lift.significant ? "95% confident" : "not yet significant"
              }
              tone={lift.points == null ? "muted" : lift.points > 0 ? "good" : "warning"}
            />
            <Stat
              label="Needs a person"
              value={h.openActions}
              hint={h.redFlags ? `${h.redFlags} red flag${h.redFlags === 1 ? "" : "s"}` : "open follow-ups"}
              tone={h.redFlags ? "danger" : h.openActions ? "warning" : "neutral"}
            />
          </section>

          <Card
            title="Where the base is"
            description="Every customer, by lifecycle stage. Stages come from the store's orders and deliveries."
            padded={false}
          >
            <div className="px-5 py-4">
              <div
                className="flex h-4 w-full overflow-hidden rounded-full bg-surface-2"
                role="img"
                aria-label="Lifecycle split"
              >
                {LIFECYCLE.map(({ key, bar }) => {
                  const share = lifecycleTotal ? h.lifecycle[key] / lifecycleTotal : 0;
                  return share > 0 ? (
                    <div
                      key={key}
                      className={`${bar} border-r-2 border-surface last:border-r-0`}
                      style={{ width: `${share * 100}%` }}
                    />
                  ) : null;
                })}
              </div>
              <ul className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-sm md:grid-cols-4">
                {LIFECYCLE.map(({ key, dot }) => (
                  <li key={key} className="flex items-start gap-2">
                    <span className={`mt-1.5 size-2 shrink-0 rounded-full ${dot}`} aria-hidden />
                    <div>
                      <Link href={`/contacts?cohort=${key}`} className="font-medium hover:underline">
                        {COHORT_LABEL[key]}
                      </Link>
                      <span className="ml-2 text-muted tnum">
                        {h.lifecycle[key]} · {pct(h.lifecycle[key], lifecycleTotal)}
                      </span>
                      <div className="text-xs text-faint">{COHORT_HINT[key]}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card
              title="Why customers leave"
              description="The main problem raised on calls, across every conversation."
            >
              {h.issues.length === 0 ? (
                <p className="text-sm text-faint">
                  No problems raised yet
                  {h.conversations ? ` across ${h.conversations} conversation${h.conversations === 1 ? "" : "s"}` : ""}.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {h.issues.map((b) => (
                    <Bar key={b.value} label={b.label} count={b.count} share={b.share} />
                  ))}
                </div>
              )}
              <p className="mt-4 text-xs text-faint">
                Quotes in the customer&apos;s own words are on{" "}
                <Link href="/insights" className="underline hover:text-fg">
                  Insights
                </Link>
                .
              </p>
            </Card>

            <Card title="Is calling working" description={describeSignificance(lift)}>
              <div className="space-y-3">
                {[lift.called, lift.control].map((g) => (
                  <div key={g.group}>
                    <div className="mb-1 flex items-baseline justify-between text-sm">
                      <span className="font-medium capitalize">{g.group} group</span>
                      <span className="text-muted tnum">
                        {g.reordered} of {g.enrolled} reordered · {pct(g.reordered, g.enrolled)}
                      </span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-r bg-surface-2">
                      <div className="h-full rounded-r bg-accent" style={{ width: `${(g.rate ?? 0) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
                <div>
                  <dt className="text-xs text-muted">Conversations</dt>
                  <dd className="font-medium tnum">{h.conversations}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Reach rate</dt>
                  <dd className="font-medium tnum">
                    {h.reachRate == null ? "—" : `${Math.round(h.reachRate * 100)}%`}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Incremental reorders</dt>
                  <dd className="font-medium tnum">{lift.incrementalReorders ?? "—"}</dd>
                </div>
              </dl>
            </Card>
          </div>

          <Card
            title="By product"
            description="Where retention is weakest, and what customers say about each one."
            padded={false}
          >
            <Table>
              <thead>
                <tr>
                  <Th>Product</Th>
                  <Th align="right">Customers</Th>
                  <Th align="right">Repeat rate</Th>
                  <Th align="right">Running low</Th>
                  <Th align="right">Lapsed</Th>
                  <Th align="right">Happy on calls</Th>
                  <Th>Top issue</Th>
                </tr>
              </thead>
              <tbody>
                {h.byProduct.map((p) => (
                  <Tr key={p.product}>
                    <Td className="font-medium">{p.product}</Td>
                    <Td align="right" className="tnum">
                      {p.customers}
                    </Td>
                    <Td align="right" className="tnum">
                      {p.repeatRate == null ? "—" : `${Math.round(p.repeatRate * 100)}%`}
                    </Td>
                    <Td align="right" className="tnum">
                      {p.runningLow ? (
                        <Badge tone="warning">{p.runningLow}</Badge>
                      ) : (
                        <span className="text-faint">0</span>
                      )}
                    </Td>
                    <Td align="right" className="tnum">
                      {p.lapsed ? <Badge tone="danger">{p.lapsed}</Badge> : <span className="text-faint">0</span>}
                    </Td>
                    <Td align="right" className="tnum">
                      {p.happyShare == null ? (
                        <span className="text-faint">no calls</span>
                      ) : (
                        `${Math.round(p.happyShare * 100)}%`
                      )}
                    </Td>
                    <Td className="text-muted">{p.topIssue ?? "—"}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </Card>

          {h.latest && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface px-5 py-3 text-sm shadow-card">
              <span className="text-muted">
                Latest conversation: <span className="font-medium text-fg">{h.latest.contact?.name ?? "Customer"}</span>
                , {fmtDuration(h.latest.call.conversationDuration)}, {fmtInrFromCents(h.latest.call.totalCostCents)}
              </span>
              <Link
                href={`/calls/${h.latest.call.id}`}
                className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
              >
                Listen <ArrowRight className="size-3.5" aria-hidden />
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}
