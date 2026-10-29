import Link from "next/link";
import { desc } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { flattenExtracted } from "@/lib/bolna";
import { recentCalls } from "@/lib/calls";
import { CallButton } from "@/components/CallButton";
import { RefreshButton } from "@/components/RefreshButton";
import { CATEGORY, D } from "../../bolna/dispositions.mjs";

export const dynamic = "force-dynamic";

function Setup({ error }: { error: string }) {
  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100">
      <p className="font-medium">Not configured yet</p>
      <p className="mt-1">{error}</p>
      <ol className="mt-3 list-decimal space-y-1 pl-5">
        <li>Copy <code>.env.example</code> to <code>.env.local</code> and fill in <code>DATABASE_URL</code> and <code>BOLNA_API_KEY</code>.</li>
        <li>Run <code>pnpm db:migrate</code>, then <code>pnpm agent:sync</code> and paste the printed <code>BOLNA_AGENT_ID</code>.</li>
        <li>Restart <code>pnpm dev</code>.</li>
      </ol>
    </div>
  );
}

export default async function Dashboard() {
  let contactRows;
  let callRows;
  try {
    const db = getDb();
    contactRows = await db.select().from(schema.contacts).orderBy(desc(schema.contacts.createdAt)).limit(200);
    callRows = await recentCalls(50);
  } catch (e) {
    return <Setup error={e instanceof Error ? e.message : String(e)} />;
  }

  const agentReady = Boolean(process.env.BOLNA_AGENT_ID && process.env.BOLNA_API_KEY);
  const called = contactRows.filter((c) => c.group === "called").length;
  const control = contactRows.length - called;
  const completed = callRows.filter((r) => r.call.status === "completed" && r.call.conversationDuration > 0);
  const reached = completed.filter((r) => {
    const f = flattenExtracted(r.call.extracted);
    return f[`${CATEGORY.name}/${D.reached}`]?.objective === "yes";
  }).length;
  const reorderYes = completed.filter((r) => {
    const f = flattenExtracted(r.call.extracted);
    return f[`${CATEGORY.name}/${D.reorderIntent}`]?.objective === "yes";
  }).length;

  return (
    <div className="space-y-8">
      {!agentReady && (
        <Setup error="BOLNA_API_KEY or BOLNA_AGENT_ID is missing, so calls cannot be started yet." />
      )}

      <section className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label="Contacts" value={contactRows.length} />
        <Stat label="Called group" value={called} />
        <Stat label="Control group" value={control} />
        <Stat label="Conversations" value={completed.length} hint={`${reached} reached the customer`} />
        <Stat label="Reorder intent: yes" value={reorderYes} />
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Contacts</h2>
          <Link href="/import" className="text-sm underline">
            Import
          </Link>
        </div>
        {contactRows.length === 0 ? (
          <p className="text-sm text-gray-500">No contacts yet. Import a few, starting with your own number.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-neutral-800">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left dark:bg-neutral-900">
                <tr>
                  <th className="p-2">Name</th>
                  <th className="p-2">Phone</th>
                  <th className="p-2">Lang</th>
                  <th className="p-2">Cohort</th>
                  <th className="p-2">Group</th>
                  <th className="p-2">Product</th>
                  <th className="p-2">Memory</th>
                  <th className="p-2"></th>
                </tr>
              </thead>
              <tbody>
                {contactRows.map((c) => (
                  <tr key={c.id} className="border-t border-gray-100 dark:border-neutral-800">
                    <td className="p-2 font-medium">
                      {c.name}
                      {c.doNotCall ? <span className="ml-2 rounded bg-red-100 px-1 text-xs text-red-700">do not call</span> : null}
                    </td>
                    <td className="p-2 font-mono text-xs">{c.phone}</td>
                    <td className="p-2">{c.language}</td>
                    <td className="p-2">{c.cohort}</td>
                    <td className="p-2">{c.group}</td>
                    <td className="p-2">{[c.product, c.flavour].filter(Boolean).join(" · ")}</td>
                    <td className="max-w-xs truncate p-2 text-xs text-gray-500" title={c.lastSummary ?? ""}>
                      {c.lastSummary ?? "—"}
                    </td>
                    <td className="p-2">
                      <CallButton
                        contactId={c.id}
                        disabled={!agentReady || c.group === "control" || Boolean(c.doNotCall)}
                        reason={c.group === "control" ? "Control group is never called" : undefined}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold">Recent calls</h2>
        {callRows.length === 0 ? (
          <p className="text-sm text-gray-500">No calls yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-neutral-800">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left dark:bg-neutral-900">
                <tr>
                  <th className="p-2">When</th>
                  <th className="p-2">Contact</th>
                  <th className="p-2">Status</th>
                  <th className="p-2">Secs</th>
                  <th className="p-2">Reached</th>
                  <th className="p-2">Usage</th>
                  <th className="p-2">Issue</th>
                  <th className="p-2">Reorder</th>
                  <th className="p-2">Red flag</th>
                  <th className="p-2"></th>
                </tr>
              </thead>
              <tbody>
                {callRows.map(({ call, contact }) => {
                  const f = flattenExtracted(call.extracted);
                  const v = (name: string) => f[`${CATEGORY.name}/${name}`]?.objective ?? "";
                  return (
                    <tr key={call.id} className="border-t border-gray-100 dark:border-neutral-800">
                      <td className="p-2 text-xs text-gray-500">{new Date(call.createdAt).toLocaleString("en-IN")}</td>
                      <td className="p-2">
                        <Link href={`/calls/${call.id}`} className="underline">
                          {contact?.name ?? "unknown"}
                        </Link>
                      </td>
                      <td className="p-2">{call.status}</td>
                      <td className="p-2">{call.conversationDuration}</td>
                      <td className="p-2">{v(D.reached)}</td>
                      <td className="p-2">{v(D.usage)}</td>
                      <td className="p-2">{v(D.issue)}</td>
                      <td className="p-2">{v(D.reorderIntent)}</td>
                      <td className="p-2">{v(D.redFlag)}</td>
                      <td className="p-2">
                        <RefreshButton callId={call.id} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <div className="rounded-lg border border-gray-200 p-3 dark:border-neutral-800">
      <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
      {hint && <div className="text-xs text-gray-500">{hint}</div>}
    </div>
  );
}
