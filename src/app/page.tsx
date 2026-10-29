import Link from "next/link";
import { ArrowRight, Brain, Globe, ListChecks, ShieldCheck } from "lucide-react";
import { and, desc, eq, gt } from "drizzle-orm";
import { AutoRefresh } from "@/components/AutoRefresh";
import { SetupNotice } from "@/components/SetupNotice";
import { Transcript } from "@/components/Transcript";
import { WebCall, type Persona } from "@/components/WebCall";
import { Badge, Card, LinkButton, PageHeader } from "@/components/ui";
import { getDb, schema } from "@/db";
import { optionalEnv } from "@/lib/env";
import { fmtDuration, fmtInrFromCents } from "@/lib/format";
import { isConversation } from "@/lib/insights";
import { isLive, LANGUAGE_LABEL } from "@/lib/labels";
import { CATEGORY, D } from "../../bolna/dispositions.mjs";

export const dynamic = "force-dynamic";

const MARKET = [
  {
    value: "20 to 30%",
    label: "of first-time buyers come back",
    detail:
      "Typical repeat rate for Indian D2C brands. Seven in ten customers are lost after one order, even for products that run out.",
    source: "Indian D2C benchmarks, 2025–26",
  },
  {
    value: "1,00,000",
    label: "Shopify stores in India",
    detail:
      "Each one can connect to Dobara with a single read-only token. Cohorts build themselves from orders and deliveries.",
    source: "Store Leads, 2025",
  },
  {
    value: "₹13",
    label: "for a two-minute conversation",
    detail:
      "In Hindi, Tamil, Kannada or English, telephony included. Cheaper than the SMS campaign it replaces, and it gets answered.",
    source: "Bolna billing on our calls",
  },
];

const CAPABILITIES = [
  {
    icon: Globe,
    title: "Four languages, one agent",
    text: "Starts in the customer's language and switches mid-sentence when they do.",
  },
  {
    icon: Brain,
    title: "Remembers the last call",
    text: "Opens with what the customer said last time. No question asked twice.",
  },
  {
    icon: ListChecks,
    title: "Twelve answers per call",
    text: "Usage, stock, satisfaction, issue, intent and more, extracted after hangup.",
  },
  {
    icon: ShieldCheck,
    title: "Says it is an AI",
    text: "Never gives medical advice, never invents a price, honours stop forever.",
  },
];

export default async function OverviewPage() {
  const brand = optionalEnv("BRAND_NAME", "Cosmix");
  const agentReady = Boolean(process.env.BOLNA_AGENT_ID && process.env.BOLNA_API_KEY);

  let personas: Persona[] = [];
  let latest: { call: typeof schema.calls.$inferSelect; contact: typeof schema.contacts.$inferSelect | null } | null =
    null;
  let liveIds: string[] = [];
  let conversations = 0;
  let costCents = 0;
  try {
    const db = getDb();
    const since = new Date(Date.now() - 24 * 3_600_000);
    const [contactRows, callRows, recent] = await Promise.all([
      db
        .select()
        .from(schema.contacts)
        .where(and(eq(schema.contacts.group, "called"), eq(schema.contacts.doNotCall, 0)))
        .orderBy(schema.contacts.createdAt)
        .limit(6),
      db
        .select({ call: schema.calls, contact: schema.contacts })
        .from(schema.calls)
        .leftJoin(schema.contacts, eq(schema.calls.contactId, schema.contacts.id))
        .orderBy(desc(schema.calls.createdAt))
        .limit(200),
      db
        .select({ id: schema.calls.id, status: schema.calls.status, updatedAt: schema.calls.updatedAt })
        .from(schema.calls)
        .where(gt(schema.calls.updatedAt, since)),
    ]);
    personas = contactRows.map((c) => ({
      id: c.id,
      name: c.name,
      product: c.product,
      flavour: c.flavour,
      cohort: c.cohort,
      language: c.language,
      hasMemory: Boolean(c.lastSummary),
    }));
    const convs = callRows.filter((r) => isConversation(r.call));
    conversations = convs.length;
    costCents = convs.reduce((s, r) => s + (r.call.totalCostCents ?? 0), 0);
    latest = convs.find((r) => r.call.transcript) ?? null;
    liveIds = recent.filter((c) => isLive(c)).map((c) => c.id);
  } catch (e) {
    return <SetupNotice error={e instanceof Error ? e.message : String(e)} />;
  }

  const memory =
    latest?.call.extracted?.[CATEGORY.name]?.[D.nextCallSummary]?.subjective ?? latest?.call.summary ?? null;

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow={`${brand} · Retention`}
        title="Dobara calls your customers before they lapse, in their language."
        description="The retention agent for consumer brands. It remembers every conversation, turns what it hears into follow-ups, and proves the lift against customers it never called."
        actions={
          <>
            <AutoRefresh callIds={liveIds} />
            {agentReady ? (
              <Badge tone="good" dot>
                Live on Bolna · Plivo · Sarvam
              </Badge>
            ) : (
              <Badge tone="warning" dot>
                Agent not configured
              </Badge>
            )}
          </>
        }
      />

      {!agentReady && (
        <SetupNotice error="BOLNA_API_KEY or BOLNA_AGENT_ID is missing, so the agent cannot answer yet." />
      )}

      <section aria-label="Talk to Dobara" className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <WebCall personas={personas} compact />
        </div>
        <div className="space-y-3 lg:col-span-2">
          {CAPABILITIES.map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex gap-3 rounded-xl border border-line bg-surface px-4 py-3 shadow-card">
              <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent">
                <Icon className="size-4" aria-hidden />
              </span>
              <div>
                <div className="text-sm font-medium">{title}</div>
                <p className="text-sm text-muted">{text}</p>
              </div>
            </div>
          ))}
          <p className="px-1 text-xs text-faint">
            Or phone a real customer from{" "}
            <Link href="/contacts" className="underline hover:text-fg">
              Customers
            </Link>
            .
            {conversations > 0 &&
              ` ${conversations} conversation${conversations === 1 ? "" : "s"} so far at ${fmtInrFromCents(costCents / conversations)} each.`}
          </p>
        </div>
      </section>

      <section aria-label="Why retention" className="space-y-3">
        <h2 className="text-sm font-semibold">Why this matters for brands in India</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {MARKET.map((m) => (
            <div key={m.value} className="rounded-xl border border-line bg-surface p-5 shadow-card">
              <div className="text-3xl font-semibold tracking-tight text-accent">{m.value}</div>
              <div className="mt-1 text-sm font-medium">{m.label}</div>
              <p className="mt-2 text-sm leading-6 text-muted">{m.detail}</p>
              <div className="mt-3 text-xs text-faint">{m.source}</div>
            </div>
          ))}
        </div>
      </section>

      {latest && (
        <section aria-label="A real conversation" className="space-y-3">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="text-sm font-semibold">What a call sounds like</h2>
            <Link
              href={`/calls/${latest.call.id}`}
              className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
            >
              Full call <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </div>
          <div className="grid gap-6 lg:grid-cols-5">
            <Card
              className="lg:col-span-3"
              title={latest.contact?.name ?? "Customer"}
              description={`${latest.contact ? LANGUAGE_LABEL[latest.contact.language] : ""} · ${fmtDuration(latest.call.conversationDuration)} · ${fmtInrFromCents(latest.call.totalCostCents)}`}
            >
              {latest.call.executionId && latest.call.recordingUrl && (
                <audio
                  controls
                  preload="none"
                  className="mb-4 w-full"
                  src={`/api/recordings/${latest.call.executionId}`}
                />
              )}
              <Transcript text={latest.call.transcript} limit={6} />
            </Card>
            <Card
              className="lg:col-span-2"
              title={
                <span className="inline-flex items-center gap-1.5">
                  <Brain className="size-4 text-accent" aria-hidden /> Saved for the next call
                </span>
              }
            >
              <p className="text-sm leading-6">
                {memory ?? <span className="text-faint">Written when the call completes.</span>}
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <LinkButton href="/insights" variant="secondary" size="sm">
                  Lift and insights
                </LinkButton>
                <LinkButton href="/actions" variant="secondary" size="sm">
                  Follow-ups
                </LinkButton>
              </div>
            </Card>
          </div>
        </section>
      )}
    </div>
  );
}
