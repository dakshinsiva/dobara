import Link from "next/link";
import { ChartColumn } from "lucide-react";
import { SetupNotice } from "@/components/SetupNotice";
import { Badge, Bar, Card, EmptyState, LinkButton, PageHeader, Stat } from "@/components/ui";
import { fmtDate, fmtDuration, fmtInrFromCents, fmtUsdCents, pct } from "@/lib/format";
import { getInsights, type Bucket, type Insights } from "@/lib/insights";
import { humanize } from "@/lib/labels";

export const dynamic = "force-dynamic";
export const metadata = { title: "Insights" };

function Distribution({ title, description, buckets }: { title: string; description?: string; buckets: Bucket[] }) {
  return (
    <Card title={title} description={description}>
      {buckets.length === 0 ? (
        <p className="text-sm text-faint">Not enough conversations yet.</p>
      ) : (
        <div className="space-y-2.5">
          {buckets.map((b) => (
            <Bar key={b.value} label={b.label} count={b.count} share={b.share} />
          ))}
        </div>
      )}
    </Card>
  );
}

export default async function InsightsPage() {
  let data: Insights;
  try {
    data = await getInsights();
  } catch (e) {
    return <SetupNotice error={e instanceof Error ? e.message : String(e)} />;
  }
  const { lift, cost, distributions: d } = data;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Insights"
        title="Voice of the customer"
        description="Structured answers from every conversation, aggregated. The same questions, asked the same way, at the moment customers decide whether to buy again."
      />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Key figures">
        <Stat label="Conversations analysed" value={data.conversations} />
        <Stat label="Average length" value={cost.avgSeconds == null ? "—" : fmtDuration(cost.avgSeconds)} />
        <Stat
          label="Cost per conversation"
          value={cost.perConversationCents == null ? "—" : fmtInrFromCents(cost.perConversationCents)}
          hint={cost.perConversationCents == null ? undefined : `${fmtUsdCents(cost.perConversationCents)} all-in`}
        />
        <Stat
          label="Reorder lift"
          value={lift.points == null ? "—" : `${lift.points >= 0 ? "+" : ""}${lift.points.toFixed(0)} pts`}
          hint={
            lift.relative == null ? "Needs reorders in both groups" : `${Math.round(lift.relative * 100)}% relative`
          }
          tone={lift.points == null ? "muted" : lift.points > 0 ? "good" : "warning"}
        />
      </section>

      {data.conversations === 0 ? (
        <Card padded={false}>
          <EmptyState
            icon={ChartColumn}
            title="No conversations yet"
            description="Insights fill in as calls complete. Place a call or talk to Dobara in the browser."
            action={
              <LinkButton href="/talk" variant="primary">
                Talk to Dobara
              </LinkButton>
            }
          />
        </Card>
      ) : (
        <>
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            <Distribution title="Reorder intent" description="Will they buy again?" buckets={d.reorderIntent} />
            <Distribution title="Stock left" description="How close to running out" buckets={d.stock} />
            <Distribution title="Usage" description="How often they take it" buckets={d.usage} />
            <Distribution title="Satisfaction" buckets={d.satisfaction} />
            <Distribution title="Issues raised" description="The main problem, if any" buckets={d.issue} />
            <Distribution title="Red flags" description="Things the brand must act on" buckets={d.redFlag} />
          </div>

          <div className="grid gap-6 lg:grid-cols-5">
            <Card
              className="lg:col-span-2"
              title="Reorder lift"
              description="Called customers against an uncalled control group drawn from the same import."
            >
              <div className="space-y-3">
                {[lift.called, lift.control].map((g) => (
                  <div key={g.group}>
                    <div className="mb-1 flex items-baseline justify-between text-sm">
                      <span className="font-medium capitalize">{g.group} group</span>
                      <span className="text-muted tnum">
                        {g.reordered} of {g.enrolled} · {pct(g.reordered, g.enrolled)}
                      </span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-r bg-surface-2">
                      <div className="h-full rounded-r bg-accent" style={{ width: `${(g.rate ?? 0) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-xs leading-5 text-faint">
                Record reorders from the order export on the Import page. Phones are assigned to groups by a stable
                hash, so re-imports never move a customer between groups.
              </p>
            </Card>

            <Card
              className="lg:col-span-3"
              title="In their words"
              description="Change requests and complaints, verbatim where the agent could capture them."
              padded={false}
            >
              {data.quotes.length === 0 ? (
                <p className="p-5 text-sm text-faint">No quotes captured yet.</p>
              ) : (
                <ul className="divide-y divide-line">
                  {data.quotes.slice(0, 12).map((q) => (
                    <li key={q.callId} className="px-5 py-3.5 text-sm">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                        <Link href={`/calls/${q.callId}`} className="font-medium text-fg hover:underline">
                          {q.name}
                        </Link>
                        <span>{fmtDate(q.at)}</span>
                        {q.issue && q.issue !== "none" && <Badge tone="warning">{humanize(q.issue)}</Badge>}
                        {q.satisfaction && q.satisfaction !== "unknown" && (
                          <Badge tone="neutral">{humanize(q.satisfaction)}</Badge>
                        )}
                      </div>
                      {q.changeRequest && <p className="mt-1.5 leading-6">&ldquo;{q.changeRequest}&rdquo;</p>}
                      {q.issueDetail && <p className="mt-1 leading-6 text-muted">{q.issueDetail}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
