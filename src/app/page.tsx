import Link from "next/link";
import { ChevronRight, Inbox, Mic, Upload } from "lucide-react";
import { ActionItem } from "@/components/ActionItem";
import { AutoRefresh } from "@/components/AutoRefresh";
import { CampaignButton } from "@/components/CampaignButton";
import { ExtractionPill } from "@/components/ExtractionPill";
import { SetupNotice } from "@/components/SetupNotice";
import { Badge, Card, EmptyState, KeyValue, LinkButton, PageHeader, Stat, StatusBadge, Table, Td, Th, Tr } from "@/components/ui";
import { COHORTS } from "@/db/schema";
import { optionalEnv } from "@/lib/env";
import { fmtDateTime, fmtDuration, fmtInrFromCents, fmtUsdCents, pct } from "@/lib/format";
import { eligibleForCampaign, getOverview, type Overview } from "@/lib/insights";
import { COHORT_HINT, COHORT_LABEL, isLive } from "@/lib/labels";
import { reorderMessage, whatsappLink } from "@/lib/whatsapp";
import { CATEGORY, D } from "../../bolna/dispositions.mjs";
import { LANGUAGES } from "../../bolna/agent.config.mjs";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const brand = optionalEnv("BRAND_NAME", "Cosmix");
  let data: Overview;
  try {
    data = await getOverview();
  } catch (e) {
    return <SetupNotice error={e instanceof Error ? e.message : String(e)} />;
  }

  const agentReady = Boolean(process.env.BOLNA_AGENT_ID && process.env.BOLNA_API_KEY);
  const webhookReady = Boolean(process.env.PUBLIC_BASE_URL);
  const t = data.totals;
  const liveIds = data.calls.filter((r) => isLive(r.call)).map((r) => r.call.id);
  const reorderRate = t.conversations ? (t.reorderYes / t.conversations) * 100 : null;
  const perConversation = t.conversations ? t.costCents / t.conversations : null;
  const lift = data.lift;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`${brand} · Retention`}
        title="Overview"
        description="Dobara calls customers at the moment they would otherwise lapse, remembers every conversation, and turns what it hears into follow-ups and reorders."
        actions={
          <>
            <AutoRefresh callIds={liveIds} />
            <LinkButton href="/import" variant="secondary">
              <Upload className="size-4" aria-hidden />
              Import
            </LinkButton>
            <LinkButton href="/talk" variant="primary">
              <Mic className="size-4" aria-hidden />
              Talk to Dobara
            </LinkButton>
          </>
        }
      />

      {!agentReady && <SetupNotice error="BOLNA_API_KEY or BOLNA_AGENT_ID is missing, so calls cannot be started yet." />}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6" aria-label="Key figures">
        <Stat label="Customers enrolled" value={t.contacts} hint={`${t.called} called · ${t.control} control`} />
        <Stat label="Conversations" value={t.conversations} hint={t.conversations ? `${pct(t.reached, t.conversations)} reached the customer` : "No completed calls yet"} />
        <Stat
          label="Reorder intent"
          value={reorderRate == null ? "—" : `${Math.round(reorderRate)}%`}
          hint={t.conversations ? `${t.reorderYes} yes · ${t.reorderMaybe} maybe` : "Share of conversations"}
          tone={reorderRate != null && reorderRate >= 50 ? "good" : "neutral"}
        />
        <Stat
          label="Reorder lift"
          value={lift.points == null ? "—" : `${lift.points >= 0 ? "+" : ""}${lift.points.toFixed(0)} pts`}
          hint={
            lift.points == null
              ? "Needs reorders in both groups"
              : `${pct(lift.called.reordered, lift.called.enrolled)} called vs ${pct(lift.control.reordered, lift.control.enrolled)} control`
          }
          tone={lift.points == null ? "muted" : lift.points > 0 ? "good" : "warning"}
        />
        <Stat label="Open actions" value={t.openActions} hint={t.redFlags ? `${t.redFlags} red flag${t.redFlags === 1 ? "" : "s"}` : "Follow-ups for the team"} tone={t.openActions ? "warning" : "neutral"} />
        <Stat
          label="Cost per conversation"
          value={perConversation == null ? "—" : fmtInrFromCents(perConversation)}
          hint={perConversation == null ? "Telephony, speech and LLM" : `${fmtUsdCents(perConversation)} all-in`}
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card
          className="lg:col-span-3"
          title="Action queue"
          description="What the agent heard that a person must act on."
          action={
            <Link href="/actions" className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline">
              All actions <ChevronRight className="size-3.5" aria-hidden />
            </Link>
          }
          padded={false}
        >
          {data.openActions.length === 0 ? (
            <EmptyState icon={Inbox} title="Nothing waiting" description="Follow-ups appear here as soon as a call finishes: WhatsApp links to send, callbacks, red flags." />
          ) : (
            <ul className="divide-y divide-line px-5">
              {data.openActions.slice(0, 6).map(({ action, contact }) => (
                <ActionItem
                  key={action.id}
                  action={action}
                  contact={contact}
                  compact
                  whatsappHref={action.type === "send_link" && contact ? whatsappLink(contact.phone, reorderMessage(contact)) : undefined}
                />
              ))}
            </ul>
          )}
        </Card>

        <div className="space-y-6 lg:col-span-2">
          <Card title="Cohorts" description="Who gets called, and when." padded={false}>
            <ul className="divide-y divide-line">
              {COHORTS.map((c) => {
                const eligible = eligibleForCampaign(data.contacts, data.calls, c);
                return (
                  <li key={c} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div className="min-w-0">
                      <Link href={`/contacts?cohort=${c}`} className="text-sm font-medium hover:underline">
                        {COHORT_LABEL[c]}
                      </Link>
                      <div className="text-xs text-muted">{COHORT_HINT[c]}</div>
                      <div className="mt-1 text-xs text-faint tnum">
                        {t.byCohort[c].called} called · {t.byCohort[c].control} control
                      </div>
                    </div>
                    <CampaignButton cohort={c} eligible={eligible.length} />
                  </li>
                );
              })}
            </ul>
          </Card>

          <Card
            title="Agent"
            action={
              <Link href="/agent" className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline">
                Configure <ChevronRight className="size-3.5" aria-hidden />
              </Link>
            }
            padded={false}
          >
            <dl className="divide-y divide-line px-5">
              <KeyValue label="Status">
                {agentReady ? (
                  <Badge tone="good" dot>
                    Live on Bolna
                  </Badge>
                ) : (
                  <Badge tone="warning" dot>
                    Not configured
                  </Badge>
                )}
              </KeyValue>
              <KeyValue label="Voice">Suhani · Sarvam Bulbul</KeyValue>
              <KeyValue label="Languages">{Object.values(LANGUAGES).join(", ")}</KeyValue>
              <KeyValue label="Calling window">10:00 to 19:00 IST</KeyValue>
              <KeyValue label="Telephony">Plivo via Bolna</KeyValue>
              <KeyValue label="Webhook">
                {webhookReady ? (
                  <Badge tone="good" dot>
                    Receiving
                  </Badge>
                ) : (
                  <Badge tone="warning" dot>
                    Polling only
                  </Badge>
                )}
              </KeyValue>
            </dl>
          </Card>
        </div>
      </div>

      <Card
        title="Recent calls"
        action={
          <Link href="/calls" className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline">
            All calls <ChevronRight className="size-3.5" aria-hidden />
          </Link>
        }
        padded={false}
      >
        {data.calls.length === 0 ? (
          <EmptyState
            icon={Mic}
            title="No calls yet"
            description="Press Call now on a customer, or talk to Dobara in the browser to see a conversation end to end."
            action={<LinkButton href="/talk" variant="primary">Talk to Dobara</LinkButton>}
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>When</Th>
                <Th>Customer</Th>
                <Th>Status</Th>
                <Th align="right">Length</Th>
                <Th>Reached</Th>
                <Th>Stock left</Th>
                <Th>Reorder</Th>
                <Th>Red flag</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {data.calls.slice(0, 8).map(({ call, contact }) => {
                const v = (name: string) => call.extracted?.[CATEGORY.name]?.[name]?.objective ?? null;
                return (
                  <Tr key={call.id}>
                    <Td className="whitespace-nowrap text-xs text-muted">{fmtDateTime(call.createdAt)}</Td>
                    <Td>
                      <Link href={`/calls/${call.id}`} className="font-medium hover:underline">
                        {contact?.name ?? (call.channel === "web" ? "Browser guest" : "Unknown")}
                      </Link>
                      {call.channel === "web" && <span className="ml-2 text-xs text-faint">browser</span>}
                    </Td>
                    <Td>
                      <StatusBadge status={call.status} />
                    </Td>
                    <Td align="right" className="tnum">
                      {fmtDuration(call.conversationDuration)}
                    </Td>
                    <Td>
                      <ExtractionPill field={D.reached} value={v(D.reached)} />
                    </Td>
                    <Td>
                      <ExtractionPill field={D.stock} value={v(D.stock)} />
                    </Td>
                    <Td>
                      <ExtractionPill field={D.reorderIntent} value={v(D.reorderIntent)} />
                    </Td>
                    <Td>
                      <ExtractionPill field={D.redFlag} value={v(D.redFlag)} />
                    </Td>
                    <Td align="right">
                      <Link href={`/calls/${call.id}`} className="text-xs font-medium text-accent hover:underline">
                        Open
                      </Link>
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
