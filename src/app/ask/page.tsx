import { AskChat } from "@/components/AskChat";
import { PageHeader } from "@/components/ui";
import { ASK_MODEL } from "@/lib/ask-agent";
import { optionalEnv } from "@/lib/env";

export const metadata = { title: "Ask Dobara" };

export default function AskPage() {
  const brand = optionalEnv("BRAND_NAME", "Cosmix");
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Ask Dobara"
        title="Ask the workspace a question"
        description={`Type or speak. The analyst reads ${brand}'s customers, calls, follow-ups and lift before it answers, and can read the answer back to you.`}
      />
      <AskChat model={ASK_MODEL} />
    </div>
  );
}
