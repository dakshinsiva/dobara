import Link from "next/link";
import { Upload, Users } from "lucide-react";
import { desc } from "drizzle-orm";
import { CallButton } from "@/components/CallButton";
import { CampaignButton } from "@/components/CampaignButton";
import { SetupNotice } from "@/components/SetupNotice";
import { Badge, Card, EmptyState, LinkButton, PageHeader, Table, Td, Th, Tr, cx } from "@/components/ui";
import { getDb, schema } from "@/db";
import { COHORTS, GROUPS, LANGUAGES, type Cohort, type Group, type Language } from "@/db/schema";
import { daysSince, fmtDate, fmtPhone } from "@/lib/format";
import { eligibleForCampaign } from "@/lib/insights";
import { recentCalls } from "@/lib/calls";
import { COHORT_LABEL, GROUP_LABEL, LANGUAGE_LABEL } from "@/lib/labels";

export const dynamic = "force-dynamic";
export const metadata = { title: "Customers" };

type Params = { cohort?: string; group?: string; lang?: string; q?: string };

function href(current: Params, patch: Partial<Params>) {
  const next = { ...current, ...patch };
  const qs = Object.entries(next)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}=${encodeURIComponent(v as string)}`)
    .join("&");
  return qs ? `/contacts?${qs}` : "/contacts";
}

function Chip({ active, href: to, children }: { active: boolean; href: string; children: React.ReactNode }) {
  return (
    <Link
      href={to}
      className={cx(
        "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        active ? "border-accent bg-accent-soft text-accent" : "border-line text-muted hover:bg-surface-2 hover:text-fg"
      )}
    >
      {children}
    </Link>
  );
}

export default async function ContactsPage(props: { searchParams: Promise<Params> }) {
  const params = await props.searchParams;
  const cohort = COHORTS.includes(params.cohort as Cohort) ? (params.cohort as Cohort) : undefined;
  const group = GROUPS.includes(params.group as Group) ? (params.group as Group) : undefined;
  const lang = LANGUAGES.includes(params.lang as Language) ? (params.lang as Language) : undefined;
  const q = params.q?.trim().toLowerCase() ?? "";

  let all;
  let calls;
  try {
    const db = getDb();
    [all, calls] = await Promise.all([
      db.select().from(schema.contacts).orderBy(desc(schema.contacts.createdAt)).limit(500),
      recentCalls(500),
    ]);
  } catch (e) {
    return <SetupNotice error={e instanceof Error ? e.message : String(e)} />;
  }

  const agentReady = Boolean(process.env.BOLNA_AGENT_ID && process.env.BOLNA_API_KEY);
  const rows = all.filter(
    (c) =>
      (!cohort || c.cohort === cohort) &&
      (!group || c.group === group) &&
      (!lang || c.language === lang) &&
      (!q || c.name.toLowerCase().includes(q) || c.phone.includes(q))
  );
  const eligible = eligibleForCampaign(rows, calls, cohort);
  const lastCallByContact = new Map<string, Date>();
  for (const r of calls)
    if (r.call.contactId && !lastCallByContact.has(r.call.contactId))
      lastCallByContact.set(r.call.contactId, r.call.createdAt);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Customers"
        title={`${all.length} customer${all.length === 1 ? "" : "s"}`}
        description="Every customer imported from the brand's order data, split into a called group and an uncalled control group so lift can be measured honestly."
        actions={
          <>
            <CampaignButton cohort={cohort} eligible={eligible.length} size="md" />
            <LinkButton href="/import" variant="primary">
              <Upload className="size-4" aria-hidden />
              Import
            </LinkButton>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Chip active={!cohort} href={href(params, { cohort: undefined })}>
          All cohorts
        </Chip>
        {COHORTS.map((c) => (
          <Chip key={c} active={cohort === c} href={href(params, { cohort: c })}>
            {COHORT_LABEL[c]}
          </Chip>
        ))}
        <span className="mx-1 h-4 w-px bg-line" aria-hidden />
        <Chip active={!group} href={href(params, { group: undefined })}>
          Both groups
        </Chip>
        {GROUPS.map((g) => (
          <Chip key={g} active={group === g} href={href(params, { group: g })}>
            {GROUP_LABEL[g]}
          </Chip>
        ))}
        <span className="mx-1 h-4 w-px bg-line" aria-hidden />
        <Chip active={!lang} href={href(params, { lang: undefined })}>
          Any language
        </Chip>
        {LANGUAGES.map((l) => (
          <Chip key={l} active={lang === l} href={href(params, { lang: l })}>
            {LANGUAGE_LABEL[l]}
          </Chip>
        ))}
        <form className="ml-auto" action="/contacts">
          {cohort && <input type="hidden" name="cohort" value={cohort} />}
          {group && <input type="hidden" name="group" value={group} />}
          {lang && <input type="hidden" name="lang" value={lang} />}
          <input
            type="search"
            name="q"
            defaultValue={params.q ?? ""}
            placeholder="Search name or phone"
            className="h-8 w-56 rounded-lg border border-line bg-surface px-3 text-sm"
          />
        </form>
      </div>

      <Card padded={false}>
        {rows.length === 0 ? (
          <EmptyState
            icon={Users}
            title={all.length === 0 ? "No customers yet" : "No customers match these filters"}
            description={
              all.length === 0
                ? "Import a CSV from the brand's order export. Start with your own number to hear the agent."
                : undefined
            }
            action={
              all.length === 0 ? (
                <LinkButton href="/import" variant="primary">
                  Import customers
                </LinkButton>
              ) : undefined
            }
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Customer</Th>
                <Th>Cohort</Th>
                <Th>Group</Th>
                <Th>Language</Th>
                <Th>Product</Th>
                <Th align="right">Last order</Th>
                <Th>Memory</Th>
                <Th>Reordered</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => {
                const days = daysSince(c.lastOrderAt);
                const last = lastCallByContact.get(c.id);
                return (
                  <Tr key={c.id}>
                    <Td>
                      <div className="font-medium">{c.name}</div>
                      <div className="font-mono text-xs text-faint">{fmtPhone(c.phone)}</div>
                      {c.doNotCall ? (
                        <Badge tone="danger" className="mt-1">
                          Do not call
                        </Badge>
                      ) : null}
                    </Td>
                    <Td>
                      <Badge tone="neutral">{COHORT_LABEL[c.cohort]}</Badge>
                    </Td>
                    <Td>
                      <Badge tone={c.group === "called" ? "info" : "muted"}>{GROUP_LABEL[c.group]}</Badge>
                    </Td>
                    <Td className="text-muted">{LANGUAGE_LABEL[c.language]}</Td>
                    <Td
                      className="max-w-[14rem] truncate text-muted"
                      title={[c.product, c.flavour].filter(Boolean).join(" · ")}
                    >
                      {[c.product, c.flavour].filter(Boolean).join(" · ") || "—"}
                    </Td>
                    <Td align="right" className="whitespace-nowrap text-muted tnum">
                      {days == null ? "—" : `${days} d ago`}
                    </Td>
                    <Td className="max-w-[18rem]">
                      {c.lastSummary ? (
                        <p className="line-clamp-2 text-xs leading-5 text-muted" title={c.lastSummary}>
                          {c.lastSummary}
                        </p>
                      ) : (
                        <span className="text-xs text-faint">{last ? "Call pending results" : "First call"}</span>
                      )}
                    </Td>
                    <Td className="whitespace-nowrap text-muted">
                      {c.reorderedAt ? (
                        <Badge tone="good" dot>
                          {fmtDate(c.reorderedAt)}
                        </Badge>
                      ) : (
                        <span className="text-xs text-faint">—</span>
                      )}
                    </Td>
                    <Td align="right">
                      <CallButton
                        contactId={c.id}
                        disabled={!agentReady || c.group === "control" || Boolean(c.doNotCall)}
                        reason={
                          c.group === "control"
                            ? "Control group is never called"
                            : c.doNotCall
                              ? "Customer opted out"
                              : undefined
                        }
                      />
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
