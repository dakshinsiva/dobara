"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Megaphone } from "lucide-react";
import type { Cohort } from "@/db/schema";
import type { Segment } from "@/lib/segments";
import { buttonClass } from "@/components/ui";

/** Dial every eligible customer in a cohort or a segment. Guardrails (calling hours) stay on. */
export function CampaignButton({
  cohort,
  segment,
  eligible,
  size = "sm",
}: {
  cohort?: Cohort;
  segment?: Segment;
  eligible: number;
  size?: "sm" | "md";
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function run() {
    if (
      !confirm(
        `Start calls to ${eligible} customer${eligible === 1 ? "" : "s"} now? Calls respect the 10:00–19:00 window.`
      )
    )
      return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cohort, segment }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? res.statusText);
      setMsg(`${json.started.length} started${json.failed.length ? `, ${json.failed.length} failed` : ""}`);
      router.refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        onClick={run}
        disabled={busy || eligible === 0}
        className={buttonClass("secondary", size)}
        title={eligible === 0 ? "No eligible customers" : undefined}
      >
        <Megaphone className="size-3.5" aria-hidden />
        {busy ? "Starting…" : `Call ${segment ? "segment" : "cohort"} (${eligible})`}
      </button>
      {msg && <span className="text-xs text-muted">{msg}</span>}
    </span>
  );
}
