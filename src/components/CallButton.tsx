"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PhoneOutgoing } from "lucide-react";
import { buttonClass } from "@/components/ui";

export function CallButton({
  contactId,
  disabled,
  reason,
  size = "sm",
}: {
  contactId: string;
  disabled?: boolean;
  reason?: string;
  size?: "sm" | "md";
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; error?: boolean } | null>(null);

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
      setMsg({ text: "Dialling" });
      router.refresh();
    } catch (e) {
      setMsg({ text: e instanceof Error ? e.message : String(e), error: true });
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button onClick={call} disabled={busy || disabled} title={reason} className={buttonClass("primary", size)}>
        <PhoneOutgoing className="size-3.5" aria-hidden />
        {busy ? "Calling…" : "Call now"}
      </button>
      {msg && <span className={msg.error ? "text-xs text-danger-fg" : "text-xs text-muted"}>{msg.text}</span>}
    </span>
  );
}
