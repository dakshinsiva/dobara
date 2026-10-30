import { Plug } from "lucide-react";
import { AskChat } from "@/components/AskChat";
import { Badge, Card, PageHeader } from "@/components/ui";
import { ASK_MODEL, askTools } from "@/lib/ask-agent";
import { optionalEnv } from "@/lib/env";

export const metadata = { title: "Ask Dobara" };

export default function AskPage() {
  const brand = optionalEnv("BRAND_NAME", "Cosmix");
  const mcpOn = Boolean(process.env.MCP_TOKEN);
  const base = (process.env.PUBLIC_BASE_URL || "https://dobara-app.vercel.app").replace(/\/$/, "");
  const toolNames = Object.keys(askTools);
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Ask Dobara"
        title="Ask the workspace a question"
        description={`Type or speak. The analyst reads ${brand}'s customers, calls, follow-ups, cohorts, segments and lift before it answers, and can read the answer back to you.`}
      />
      <AskChat model={ASK_MODEL} />

      <Card
        title={
          <span className="inline-flex items-center gap-2">
            <Plug className="size-4 text-muted" aria-hidden />
            The same analyst inside Claude, ChatGPT, Cursor and Claude Code
          </span>
        }
        description="Dobara is also an MCP server. Read-only: it answers from the workspace and never places a call."
        action={
          mcpOn ? (
            <Badge tone="good" dot>
              On
            </Badge>
          ) : (
            <Badge tone="muted">Off · set MCP_TOKEN</Badge>
          )
        }
      >
        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-3 text-sm">
            <p className="text-muted">
              Claude Code, one line (replace the token with the workspace&apos;s <code>MCP_TOKEN</code>):
            </p>
            <pre className="overflow-x-auto rounded-lg bg-surface-2 p-3 text-xs leading-5">
              {`claude mcp add --transport http dobara ${base}/api/mcp \\
  --header "Authorization: Bearer <MCP_TOKEN>"`}
            </pre>
            <p className="text-muted">
              Claude.ai and ChatGPT custom connectors, Cursor: use the URL{" "}
              <code className="rounded bg-surface-2 px-1 py-0.5 text-xs">{base}/api/mcp?token=&lt;MCP_TOKEN&gt;</code>.
            </p>
          </div>
          <div>
            <p className="mb-2 text-sm text-muted">Tools exposed</p>
            <ul className="flex flex-wrap gap-1.5">
              {toolNames.map((t) => (
                <li key={t}>
                  <Badge tone="neutral" className="font-mono">
                    {t}
                  </Badge>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs leading-5 text-faint">
              Ask &ldquo;which cohort repeats worst and who should we call first&rdquo; from wherever you already work.
              Answers carry the customer&apos;s own words from the transcripts.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
