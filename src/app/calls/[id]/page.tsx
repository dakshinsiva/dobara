import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Brain, ListChecks } from "lucide-react";
import { eq } from "drizzle-orm";
import { ActionItem } from "@/components/ActionItem";
import { AutoRefresh } from "@/components/AutoRefresh";
import { ExtractionPill } from "@/components/ExtractionPill";
import { RefreshButton } from "@/components/RefreshButton";
import { Transcript } from "@/components/Transcript";
import { Badge, Card, KeyValue, PageHeader, StatusBadge } from "@/components/ui";
import { getDb, schema } from "@/db";
import { fmtDateTime, fmtDuration, fmtInrFromCents, fmtPhone, fmtUsdCents } from "@/lib/format";
import { EXTRACTION_LABEL, isLive } from "@/lib/labels";
import { reorderMessage, whatsappLink } from "@/lib/whatsapp";
import { CATEGORY, D } from "../../../../bolna/dispositions.mjs";

export const dynamic = "force-dynamic";
export const metadata = { title: "Call" };

type Raw = {
  context_details?: { recipient_data?: Record<string, unknown> };
  telephony_data?: Record<string, unknown>;
  cost_breakdown?: Record<string, number>;
  usage_breakdown?: Record<string, unknown>;
};

export default async function CallPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const db = getDb();
  const [row] = await db
    .select({ call: schema.calls, contact: schema.contacts })
    .from(schema.calls)
    .leftJoin(schema.contacts, eq(schema.calls.contactId, schema.contacts.id))
    .where(eq(schema.calls.id, id))
    .limit(1);
  if (!row) notFound();
  const { call, contact } = row;
  const actions = await db.select().from(schema.actions).where(eq(schema.actions.callId, call.id));

  const raw = (call.raw ?? {}) as Raw;
  const ex = call.extracted?.[CATEGORY.name] ?? {};
  const obj = (name: string) => ex[name]?.objective ?? null;
  const text = (name: string) => (ex[name]?.subjective?.trim() ? ex[name].subjective : null);
  const memoryBefore =
    (raw.context_details?.recipient_data?.last_summary as string | undefined) ?? contact?.lastSummary;
  const memoryAfter = text(D.nextCallSummary);
  const cost = raw.cost_breakdown;
  const tel = raw.telephony_data ?? {};
  const usage = raw.usage_breakdown ?? {};
  const live = isLive(call);

  const outcomeFields = [D.reached, D.reorderIntent, D.sendLink, D.callback, D.redFlag];
  const productFields = [D.usage, D.stock, D.satisfaction, D.issue];

  return (
    <div className="space-y-6">
      <Link href="/calls" className="inline-flex items-center gap-1 text-sm text-muted hover:text-fg">
        <ArrowLeft className="size-4" aria-hidden /> Calls
      </Link>

      <PageHeader
        eyebrow={call.channel === "web" ? "Browser call" : "Phone call"}
        title={contact?.name ?? (call.channel === "web" ? "Browser guest" : "Unknown customer")}
        description={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {contact && <span className="font-mono text-xs">{fmtPhone(contact.phone)}</span>}
            <span>{fmtDateTime(call.createdAt)}</span>
            <span>{fmtDuration(call.conversationDuration)}</span>
            {call.totalCostCents != null && (
              <span>
                {fmtInrFromCents(call.totalCostCents)}{" "}
                <span className="text-faint">({fmtUsdCents(call.totalCostCents)})</span>
              </span>
            )}
            {call.hangupReason && <span className="text-faint">{call.hangupReason}</span>}
          </span>
        }
        actions={
          <>
            <StatusBadge status={call.status} />
            {live && <AutoRefresh callIds={[call.id]} />}
            <RefreshButton callId={call.id} />
          </>
        }
      />

      {call.executionId && call.recordingUrl && (
        <Card padded>
          <audio controls preload="none" className="w-full" src={`/api/recordings/${call.executionId}`} />
        </Card>
      )}

      {!call.extracted && (
        <Card padded>
          <p className="text-sm text-muted">
            {live
              ? "The call is still in progress. Results appear here automatically when it ends."
              : "No extractions yet. Bolna runs the extraction pass a few seconds after a call completes; press Refresh if this persists."}
          </p>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Outcome" padded={false}>
          <dl className="divide-y divide-line px-5">
            {outcomeFields.map((f) => (
              <KeyValue key={f} label={EXTRACTION_LABEL[f] ?? f}>
                <ExtractionPill field={f} value={obj(f)} />
              </KeyValue>
            ))}
          </dl>
        </Card>

        <Card title="Product signal" padded={false}>
          <dl className="divide-y divide-line px-5">
            {productFields.map((f) => (
              <KeyValue key={f} label={EXTRACTION_LABEL[f] ?? f}>
                <ExtractionPill field={f} value={obj(f)} />
              </KeyValue>
            ))}
          </dl>
          {(text(D.issueDetail) || text(D.changeRequest)) && (
            <div className="space-y-3 border-t border-line px-5 py-4 text-sm">
              {text(D.issueDetail) && (
                <div>
                  <div className="text-xs text-muted">In their words</div>
                  <p className="mt-0.5 leading-6">&ldquo;{text(D.issueDetail)}&rdquo;</p>
                </div>
              )}
              {text(D.changeRequest) && (
                <div>
                  <div className="text-xs text-muted">Would change</div>
                  <p className="mt-0.5 leading-6">&ldquo;{text(D.changeRequest)}&rdquo;</p>
                </div>
              )}
            </div>
          )}
        </Card>

        <Card
          title={
            <span className="inline-flex items-center gap-1.5">
              <Brain className="size-4 text-accent" aria-hidden /> Customer memory
            </span>
          }
          description="What the agent knew going in, and what it will remember next time."
        >
          <div className="space-y-4 text-sm">
            <div>
              <div className="text-xs text-muted">Before this call</div>
              <p className="mt-0.5 leading-6">
                {memoryBefore && memoryBefore !== "This is the first call." ? (
                  memoryBefore
                ) : (
                  <span className="text-faint">First conversation. Nothing to remember yet.</span>
                )}
              </p>
            </div>
            <div>
              <div className="text-xs text-muted">Saved for the next call</div>
              <p className="mt-0.5 leading-6">
                {memoryAfter ?? <span className="text-faint">Written when the call completes.</span>}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {actions.length > 0 && (
        <Card
          title={
            <span className="inline-flex items-center gap-1.5">
              <ListChecks className="size-4 text-accent" aria-hidden /> Follow-ups from this call
            </span>
          }
          padded={false}
        >
          <ul className="divide-y divide-line px-5">
            {actions.map((a) => (
              <ActionItem
                key={a.id}
                action={a}
                contact={contact}
                compact
                whatsappHref={
                  a.type === "send_link" && contact ? whatsappLink(contact.phone, reorderMessage(contact)) : undefined
                }
              />
            ))}
          </ul>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Transcript" className="lg:col-span-2">
          <Transcript text={call.transcript} />
          {call.summary && (
            <div className="mt-5 rounded-lg bg-surface-2 p-4 text-sm">
              <div className="text-xs font-medium text-muted">Summary</div>
              <p className="mt-1 leading-6">{call.summary}</p>
            </div>
          )}
        </Card>

        <Card title="Telemetry" padded={false}>
          <dl className="divide-y divide-line px-5">
            <KeyValue label="Telephony">{String(tel.provider ?? (call.channel === "web" ? "WebRTC" : "—"))}</KeyValue>
            {tel.from_number ? <KeyValue label="From">{fmtPhone(String(tel.from_number))}</KeyValue> : null}
            {tel.ring_duration != null ? <KeyValue label="Ring time">{String(tel.ring_duration)} s</KeyValue> : null}
            {tel.hangup_by ? <KeyValue label="Hung up by">{String(tel.hangup_by)}</KeyValue> : null}
            {usage.transcriber_model ? (
              <KeyValue label="Speech to text">{String(usage.transcriber_model)}</KeyValue>
            ) : null}
            {usage.synthesizer_model ? (
              <KeyValue label="Voice">{`${String(usage.voice_id ?? "")} · ${String(usage.synthesizer_model)}`}</KeyValue>
            ) : null}
            {usage.llmModel ? (
              <KeyValue label="Model">{Object.keys(usage.llmModel as Record<string, unknown>).join(", ")}</KeyValue>
            ) : null}
            {cost && (
              <KeyValue label="Cost split">
                <span className="text-xs text-muted tnum">
                  speech {fmtUsdCents((cost.synthesizer ?? 0) + (cost.transcriber ?? 0))} · model{" "}
                  {fmtUsdCents(cost.llm ?? 0)} · telephony {fmtUsdCents(cost.network ?? 0)} · platform{" "}
                  {fmtUsdCents(cost.platform ?? 0)}
                </span>
              </KeyValue>
            )}
            <KeyValue label="Execution">
              <span className="font-mono text-[11px] text-faint">{call.executionId ?? "—"}</span>
            </KeyValue>
          </dl>
        </Card>
      </div>

      <details className="text-xs">
        <summary className="cursor-pointer text-muted hover:text-fg">
          Raw Bolna payload <Badge tone="muted">debug</Badge>
        </summary>
        <pre className="mt-2 max-h-96 overflow-auto rounded-lg border border-line bg-surface p-3 font-mono text-[11px] leading-5">
          {JSON.stringify(call.raw, null, 2)}
        </pre>
      </details>
    </div>
  );
}
