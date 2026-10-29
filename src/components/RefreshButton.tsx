"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { buttonClass } from "@/components/ui";

/** Pull the latest execution state from Bolna for one call. */
export function RefreshButton({ callId, label = "Refresh" }: { callId: string; label?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function refresh() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/calls/${callId}/refresh`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? res.statusText);
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button onClick={refresh} disabled={busy} className={buttonClass("ghost", "sm")} title="Fetch the latest state from Bolna">
        <RefreshCw className={busy ? "size-3.5 animate-spin" : "size-3.5"} aria-hidden />
        {label}
      </button>
      {err && <span className="text-xs text-danger-fg">{err}</span>}
    </span>
  );
}
