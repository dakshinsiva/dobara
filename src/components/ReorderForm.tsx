"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { TrendingUp } from "lucide-react";
import { buttonClass } from "@/components/ui";

/** Paste phone numbers from the order export; matched customers get reordered_at set. */
export function ReorderForm() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ text: string; error?: boolean } | null>(null);

  const phones = text
    .split(/[\s,;]+/)
    .map((p) => p.trim())
    .filter(Boolean);

  async function submit() {
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/reorders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phones, date }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(typeof json.error === "string" ? json.error : "Paste one phone number per line.");
      setResult({
        text: `${json.matched} customer${json.matched === 1 ? "" : "s"} marked as reordered on ${json.date}${
          json.unmatched?.length ? `. ${json.unmatched.length} number(s) not in the workspace.` : "."
        }`,
      });
      setText("");
      router.refresh();
    } catch (e) {
      setResult({ text: e instanceof Error ? e.message : String(e), error: true });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={6}
        placeholder={"9108706622\n+91 98765 43211"}
        aria-label="Phone numbers of customers who reordered"
        className="w-full rounded-lg border border-line bg-canvas p-3 font-mono text-xs leading-5 focus:outline-2 focus:outline-offset-1 focus:outline-accent"
      />
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted">Order date</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-lg border border-line bg-surface px-2 py-1.5 text-sm"
          />
        </label>
        <span className="text-xs text-faint">
          {phones.length} number{phones.length === 1 ? "" : "s"}
        </span>
        <button
          onClick={submit}
          disabled={busy || phones.length === 0}
          className={buttonClass("primary", "md", "ml-auto")}
        >
          <TrendingUp className="size-4" aria-hidden />
          {busy ? "Recording…" : "Record reorders"}
        </button>
      </div>
      {result && <p className={result.error ? "text-sm text-danger-fg" : "text-sm text-good-fg"}>{result.text}</p>}
    </div>
  );
}
