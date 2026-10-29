"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function CallButton({ contactId, disabled, reason }: { contactId: string; disabled?: boolean; reason?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function call() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? res.statusText);
      setMsg("Dialling…");
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
        onClick={call}
        disabled={busy || disabled}
        title={reason}
        className="rounded bg-black px-3 py-1 text-sm text-white disabled:cursor-not-allowed disabled:bg-gray-300 dark:bg-white dark:text-black"
      >
        {busy ? "Calling…" : "Call now"}
      </button>
      {msg && <span className="text-xs text-gray-500">{msg}</span>}
    </span>
  );
}
