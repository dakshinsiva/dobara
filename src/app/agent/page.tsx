import { Brain, Globe, Headphones, PhoneCall, ShieldCheck, Wallet } from "lucide-react";
import { Badge, Card, KeyValue, PageHeader } from "@/components/ui";
import { bolna } from "@/lib/bolna";
import { optionalEnv } from "@/lib/env";
import { fmtUsdCents } from "@/lib/format";
import { LANGUAGES } from "../../../bolna/agent.config.mjs";
import { CATEGORY, DISPOSITIONS } from "../../../bolna/dispositions.mjs";
import { AGENT_NAME, SYSTEM_PROMPT, WELCOME_MESSAGE } from "../../../bolna/prompts.mjs";

export const dynamic = "force-dynamic";
export const metadata = { title: "Agent" };

type Account = { name?: string; wallet?: number; concurrency?: { max?: number; current?: number } };

async function getAccount(): Promise<Account | null> {
  if (!process.env.BOLNA_API_KEY) return null;
  try {
    return (await bolna.me()) as Account;
  } catch {
    return null;
  }
}

const GUARDRAILS = [
  "Says it is an AI in the greeting and confirms if asked",
  "Never gives medical, diet or health advice",
  "Never invents prices, discounts or delivery dates",
  "Stops and apologises when asked not to call again",
  "Hands over to a human on request",
  "Does not repeat questions the customer answered on a previous call",
  "Treats nonsense answers as mishearing and re-asks in simpler words",
];

export default async function AgentPage() {
  const account = await getAccount();
  const agentId = process.env.BOLNA_AGENT_ID;
  const webhook = process.env.PUBLIC_BASE_URL
    ? `${process.env.PUBLIC_BASE_URL.replace(/\/$/, "")}/api/webhooks/bolna`
    : null;
  const offer = optionalEnv("OFFER_TEXT", "10% off the next order with code DOBARA10, valid for 7 days");

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Agent"
        title={AGENT_NAME}
        description="One agent, configured in code and synced to Bolna. Everything brand-specific lives in the bolna/ folder of the repository."
        actions={
          agentId ? (
            <Badge tone="good" dot>
              Live · {agentId.slice(0, 8)}
            </Badge>
          ) : (
            <Badge tone="warning" dot>
              Not synced
            </Badge>
          )
        }
      />

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <Card
          title={
            <span className="inline-flex items-center gap-1.5">
              <Headphones className="size-4 text-accent" aria-hidden /> Voice and speech
            </span>
          }
          padded={false}
        >
          <dl className="divide-y divide-line px-5">
            <KeyValue label="Voice">Suhani · Sarvam Bulbul v3</KeyValue>
            <KeyValue label="Speech to text">Sarvam Saaras v4, streaming</KeyValue>
            <KeyValue label="Endpointing">500 ms</KeyValue>
            <KeyValue label="Interrupts after">2 words</KeyValue>
          </dl>
        </Card>

        <Card
          title={
            <span className="inline-flex items-center gap-1.5">
              <Brain className="size-4 text-accent" aria-hidden /> Reasoning
            </span>
          }
          padded={false}
        >
          <dl className="divide-y divide-line px-5">
            <KeyValue label="Model">gpt-4.1-mini via Bolna</KeyValue>
            <KeyValue label="Temperature">0.3</KeyValue>
            <KeyValue label="Max reply">300 tokens, under two sentences</KeyValue>
            <KeyValue label="Post-call extraction">
              {DISPOSITIONS.length} fields · {CATEGORY.model}
            </KeyValue>
          </dl>
        </Card>

        <Card
          title={
            <span className="inline-flex items-center gap-1.5">
              <PhoneCall className="size-4 text-accent" aria-hidden /> Telephony
            </span>
          }
          padded={false}
        >
          <dl className="divide-y divide-line px-5">
            <KeyValue label="Carrier">Plivo, through Bolna</KeyValue>
            <KeyValue label="Caller ID">{process.env.BOLNA_FROM_NUMBER || "Shared +91 number"}</KeyValue>
            <KeyValue label="Calling window">10:00 to 19:00, customer time</KeyValue>
            <KeyValue label="Retry">Once after 30 min on no answer or busy</KeyValue>
            <KeyValue label="Max call">5 min · hangs up after 12 s silence</KeyValue>
          </dl>
        </Card>

        <Card
          title={
            <span className="inline-flex items-center gap-1.5">
              <Globe className="size-4 text-accent" aria-hidden /> Languages
            </span>
          }
        >
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(LANGUAGES).map(([code, name]) => (
              <Badge key={code} tone="neutral">
                {name}
              </Badge>
            ))}
          </div>
          <p className="mt-3 text-xs leading-5 text-muted">
            Each call starts in the customer&apos;s language and switches automatically when they switch.
          </p>
        </Card>

        <Card
          title={
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="size-4 text-accent" aria-hidden /> Guardrails
            </span>
          }
        >
          <ul className="space-y-1.5 text-sm leading-6 text-muted">
            {GUARDRAILS.map((g) => (
              <li key={g} className="flex gap-2">
                <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
                {g}
              </li>
            ))}
          </ul>
        </Card>

        <Card
          title={
            <span className="inline-flex items-center gap-1.5">
              <Wallet className="size-4 text-accent" aria-hidden /> Account and delivery
            </span>
          }
          padded={false}
        >
          <dl className="divide-y divide-line px-5">
            <KeyValue label="Bolna account">{account?.name ?? "—"}</KeyValue>
            <KeyValue label="Wallet">{account?.wallet != null ? fmtUsdCents(account.wallet) : "—"}</KeyValue>
            <KeyValue label="Concurrency">
              {account?.concurrency
                ? `${account.concurrency.current ?? 0} of ${account.concurrency.max ?? "—"} lines`
                : "—"}
            </KeyValue>
            <KeyValue label="Webhook">
              {webhook ? (
                <span className="break-all font-mono text-[11px]">{webhook}</span>
              ) : (
                <Badge tone="warning">Not set</Badge>
              )}
            </KeyValue>
            <KeyValue label="Offer in prompt">
              <span className="text-xs">{offer}</span>
            </KeyValue>
          </dl>
        </Card>
      </div>

      <Card
        title="What the agent extracts after every call"
        description="Objective fields are classified from a fixed option list; subjective fields are short free text."
        padded={false}
      >
        <ul className="divide-y divide-line">
          {DISPOSITIONS.map((d) => (
            <li key={d.name} className="grid gap-2 px-5 py-3 md:grid-cols-[12rem_1fr]">
              <div className="text-sm font-medium">{d.name}</div>
              <div>
                <p className="text-sm text-muted">{d.question}</p>
                {"objective_options" in d && d.objective_options && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {d.objective_options.map((o) => (
                      <Badge key={o.value} tone="muted" title={o.condition}>
                        {o.value}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <Card title="Greeting">
        <p className="text-sm leading-6">&ldquo;{WELCOME_MESSAGE}&rdquo;</p>
        <p className="mt-2 text-xs text-faint">
          Variables in double braces are filled per customer from the workspace.
        </p>
      </Card>

      <details className="rounded-xl border border-line bg-surface shadow-card">
        <summary className="cursor-pointer px-5 py-3.5 text-sm font-semibold">System prompt</summary>
        <pre className="max-h-[32rem] overflow-auto border-t border-line px-5 py-4 font-sans text-xs leading-6 whitespace-pre-wrap text-muted">
          {SYSTEM_PROMPT}
        </pre>
      </details>
    </div>
  );
}
