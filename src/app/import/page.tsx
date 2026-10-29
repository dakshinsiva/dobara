"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const SAMPLE = `name,phone,language,cohort,product,flavour,last_order_at
Dakshin,9876543210,en,running_low,No-Nonsense Plant Protein,Indonesian Cacao,2026-09-28
Amma,9876543211,ta,new,Fermented Yeast Protein,Indonesian Cacao,2026-10-20
Chiranjeevi,9876543212,hi,lapsed,No-Nonsense Plant Protein Pro,Chikmagalur Mocha,2026-07-15`;

type Row = Record<string, string>;

function parseCsv(text: string): Row[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const cells = line.split(",").map((c) => c.trim());
    const row: Row = {};
    headers.forEach((h, i) => {
      if (cells[i]) row[h] = cells[i];
    });
    return row;
  });
}

export default function ImportPage() {
  const router = useRouter();
  const [csv, setCsv] = useState(SAMPLE);
  const [share, setShare] = useState(0.7);
  const [result, setResult] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setResult(null);
    try {
      const rows = parseCsv(csv);
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows, calledShare: share }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(JSON.stringify(json.error ?? json));
      setResult(`Imported ${json.imported} (called ${json.called}, control ${json.control})${json.skipped?.length ? `; skipped ${json.skipped.join(", ")}` : ""}`);
      router.refresh();
    } catch (e) {
      setResult(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-3xl space-y-4">
      <h1 className="text-xl font-semibold">Import contacts</h1>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Paste CSV with columns <code>name, phone, language (en|hi|kn|ta), cohort (new|running_low|lapsed), product, flavour, last_order_at (YYYY-MM-DD)</code>.
        Add a <code>group</code> column (called|control) to force assignment; otherwise phones are split by a stable hash.
        Start with your own number.
      </p>
      <textarea
        value={csv}
        onChange={(e) => setCsv(e.target.value)}
        rows={12}
        className="w-full rounded border border-gray-300 p-2 font-mono text-xs dark:border-neutral-700 dark:bg-neutral-900"
      />
      <label className="flex items-center gap-2 text-sm">
        Called share
        <input
          type="number"
          min={0}
          max={1}
          step={0.1}
          value={share}
          onChange={(e) => setShare(Number(e.target.value))}
          className="w-20 rounded border border-gray-300 p-1 dark:border-neutral-700 dark:bg-neutral-900"
        />
        <span className="text-gray-500">(rest become the control group)</span>
      </label>
      <button
        onClick={submit}
        disabled={busy}
        className="rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-black"
      >
        {busy ? "Importing…" : "Import"}
      </button>
      {result && <p className="text-sm">{result}</p>}
    </div>
  );
}
