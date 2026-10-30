import Link from "next/link";
import { PhoneCall } from "lucide-react";
import { AutoRefresh } from "@/components/AutoRefresh";
import { ExtractionPill } from "@/components/ExtractionPill";
import { RefreshButton } from "@/components/RefreshButton";
import { SetupNotice } from "@/components/SetupNotice";
import { Card, EmptyState, LinkButton, PageHeader, StatusBadge, Table, Td, Th, Tr } from "@/components/ui";
import { recentCalls } from "@/lib/calls";
import { fmtDateTime, fmtDuration, fmtInrFromCents } from "@/lib/format";
import { isLive } from "@/lib/labels";
import { CATEGORY, D } from "../../../../bolna/dispositions.mjs";

export const dynamic = "force-dynamic";
export const metadata = { title: "Calls" };

export default async function CallsPage() {
  let rows;
  try {
    rows = await recentCalls(200);
  } catch (e) {
    return <SetupNotice error={e instanceof Error ? e.message : String(e)} />;
  }
  const liveIds = rows.filter((r) => isLive(r.call)).map((r) => r.call.id);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Calls"
        title={`${rows.length} call${rows.length === 1 ? "" : "s"}`}
        description="Every attempt, phone or browser, with what the agent extracted once the conversation ended."
        actions={<AutoRefresh callIds={liveIds} />}
      />
      <Card padded={false}>
        {rows.length === 0 ? (
          <EmptyState
            icon={PhoneCall}
            title="No calls yet"
            action={
              <LinkButton href="/talk" variant="primary">
                Talk to Dobara
              </LinkButton>
            }
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
                <Th>Usage</Th>
                <Th>Stock</Th>
                <Th>Issue</Th>
                <Th>Reorder</Th>
                <Th>Red flag</Th>
                <Th align="right">Cost</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {rows.map(({ call, contact }) => {
                const v = (name: string) => call.extracted?.[CATEGORY.name]?.[name]?.objective ?? null;
                return (
                  <Tr key={call.id}>
                    <Td className="whitespace-nowrap text-xs text-muted">{fmtDateTime(call.createdAt)}</Td>
                    <Td>
                      <Link href={`/calls/${call.id}`} className="font-medium hover:underline">
                        {contact?.name ?? (call.channel === "web" ? "Browser guest" : "Unknown")}
                      </Link>
                      <div className="text-xs text-faint">{call.channel === "web" ? "Browser" : "Phone"}</div>
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
                      <ExtractionPill field={D.usage} value={v(D.usage)} />
                    </Td>
                    <Td>
                      <ExtractionPill field={D.stock} value={v(D.stock)} />
                    </Td>
                    <Td>
                      <ExtractionPill field={D.issue} value={v(D.issue)} />
                    </Td>
                    <Td>
                      <ExtractionPill field={D.reorderIntent} value={v(D.reorderIntent)} />
                    </Td>
                    <Td>
                      <ExtractionPill field={D.redFlag} value={v(D.redFlag)} />
                    </Td>
                    <Td align="right" className="whitespace-nowrap text-muted tnum">
                      {fmtInrFromCents(call.totalCostCents)}
                    </Td>
                    <Td align="right">
                      <RefreshButton callId={call.id} label="" />
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
