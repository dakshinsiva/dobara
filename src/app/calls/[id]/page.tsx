import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { RefreshButton } from "@/components/RefreshButton";

export const dynamic = "force-dynamic";

export default async function CallPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const db = getDb();
  const [row] = await db
    .select({ call: schema.calls, contact: schema.contacts })
    .from(schema.calls)
    .leftJoin(schema.contacts, eq(schema.calls.contactId, schema.contacts.id))
    .where(eq(schema.calls.id, id))
    .limit(1);
  if (!row) notFound();
  const { call, contact } = row;

  const transcriptLines = (call.transcript ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/" className="text-sm underline">
            ← Dashboard
          </Link>
          <h1 className="mt-1 text-xl font-semibold">
            {contact?.name ?? "Unknown contact"} <span className="font-mono text-sm text-gray-500">{contact?.phone}</span>
          </h1>
          <p className="text-sm text-gray-500">
            {call.status} · {call.conversationDuration}s
            {call.totalCostCents != null ? ` · ${(call.totalCostCents / 100).toFixed(3)} USD` : ""}
            {call.hangupReason ? ` · ${call.hangupReason}` : ""}
          </p>
        </div>
        <RefreshButton callId={call.id} />
      </div>

      {call.executionId && call.recordingUrl && (
        <audio controls preload="none" className="w-full" src={`/api/recordings/${call.executionId}`} />
      )}

      {call.summary && (
        <section>
          <h2 className="mb-1 font-semibold">Summary</h2>
          <p className="text-sm">{call.summary}</p>
        </section>
      )}

      <section>
        <h2 className="mb-1 font-semibold">Extractions</h2>
        {call.extracted ? (
          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-neutral-800">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left dark:bg-neutral-900">
                <tr>
                  <th className="p-2">Field</th>
                  <th className="p-2">Answer</th>
                  <th className="p-2">Detail</th>
                  <th className="p-2">Conf.</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(call.extracted).flatMap(([category, items]) =>
                  Object.entries(items).map(([name, r]) => (
                    <tr key={`${category}/${name}`} className="border-t border-gray-100 align-top dark:border-neutral-800">
                      <td className="p-2 font-medium">{name}</td>
                      <td className="p-2">{r.objective ?? "—"}</td>
                      <td className="p-2 text-gray-700 dark:text-gray-300">{r.subjective || "—"}</td>
                      <td className="p-2 text-xs text-gray-500">{r.confidence != null ? r.confidence.toFixed(2) : ""}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-500">No extractions yet. They arrive a few seconds after the call completes.</p>
        )}
      </section>

      <section>
        <h2 className="mb-1 font-semibold">Transcript</h2>
        {transcriptLines.length === 0 ? (
          <p className="text-sm text-gray-500">No transcript yet.</p>
        ) : (
          <div className="space-y-1 rounded-lg border border-gray-200 p-3 text-sm dark:border-neutral-800">
            {transcriptLines.map((line, i) => {
              const isUser = line.startsWith("user:");
              return (
                <p key={i} className={isUser ? "text-blue-800 dark:text-blue-300" : ""}>
                  {line}
                </p>
              );
            })}
          </div>
        )}
      </section>

      <details className="text-xs">
        <summary className="cursor-pointer text-gray-500">Raw payload</summary>
        <pre className="mt-2 overflow-x-auto rounded bg-gray-50 p-2 dark:bg-neutral-900">{JSON.stringify(call.raw, null, 2)}</pre>
      </details>
    </div>
  );
}
