import { and, eq } from "drizzle-orm";
import { SetupNotice } from "@/components/SetupNotice";
import { PageHeader } from "@/components/ui";
import { WebCall, type Persona } from "@/components/WebCall";
import { getDb, schema } from "@/db";

export const dynamic = "force-dynamic";
export const metadata = { title: "Talk to Dobara" };

export default async function TalkPage() {
  const agentReady = Boolean(process.env.BOLNA_AGENT_ID && process.env.BOLNA_API_KEY);
  let personas: Persona[] = [];
  try {
    const db = getDb();
    const rows = await db
      .select()
      .from(schema.contacts)
      .where(and(eq(schema.contacts.group, "called"), eq(schema.contacts.doNotCall, 0)))
      .orderBy(schema.contacts.createdAt)
      .limit(6);
    personas = rows.map((c) => ({
      id: c.id,
      name: c.name,
      product: c.product,
      flavour: c.flavour,
      cohort: c.cohort,
      language: c.language,
      hasMemory: Boolean(c.lastSummary),
    }));
  } catch {
    personas = [];
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Live demo"
        title="Talk to Dobara"
        description="The exact agent that phones customers, over your microphone instead of Plivo. Same prompt, same memory, same extractions; the conversation lands in Calls like any other."
      />
      {!agentReady && (
        <SetupNotice error="BOLNA_API_KEY or BOLNA_AGENT_ID is missing, so the agent cannot answer yet." />
      )}
      <WebCall personas={personas} />
    </div>
  );
}
