"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function RefreshButton({ callId }: { callId: string }) {
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
      <button
        onClick={refresh}
        disabled={busy}
        className="rounded border border-gray-300 px-2 py-1 text-xs hover:bg-gray-100 disabled:opacity-50 dark:border-gray-700 dark:hover:bg-gray-800"
      >
        {busy ? "…" : "Refresh"}
      </button>
      {err && <span className="text-xs text-red-600">{err}</span>}
    </span>
  );
}
