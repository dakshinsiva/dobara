import { TriangleAlert } from "lucide-react";

/** Shown when the database or Bolna credentials are missing. */
export function SetupNotice({ error }: { error: string }) {
  return (
    <div className="rounded-xl border border-warning/40 bg-warning-bg p-5 text-sm text-warning-fg">
      <div className="flex items-center gap-2 font-medium">
        <TriangleAlert className="size-4" aria-hidden />
        Not configured yet
      </div>
      <p className="mt-1 opacity-90">{error}</p>
      <ol className="mt-3 list-decimal space-y-1 pl-5 opacity-90">
        <li>
          Copy <code>.env.example</code> to <code>.env.local</code> and fill in <code>DATABASE_URL</code> and{" "}
          <code>BOLNA_API_KEY</code>.
        </li>
        <li>
          Run <code>pnpm db:migrate</code>, then <code>pnpm agent:sync</code> and paste the printed <code>BOLNA_AGENT_ID</code>.
        </li>
        <li>
          Restart <code>pnpm dev</code>.
        </li>
      </ol>
    </div>
  );
}
