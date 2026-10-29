"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { Upload, Users } from "lucide-react";
import { buttonClass } from "@/components/ui";

const SAMPLE = `name,phone,language,cohort,product,flavour,last_order_at
Dakshin,9108706622,en,running_low,No-Nonsense Plant Protein,Indonesian Cacao,2026-09-28
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

export function ImportForm() {
  const router = useRouter();
  const [csv, setCsv] = useState(SAMPLE);
  const [share, setShare] = useState(70);
  const [result, setResult] = useState<{ text: string; error?: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const rows = parseCsv(csv);

  async function submit() {
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows, calledShare: share / 100 }),
      });
      const json = await res.json();
      if (!res.ok)
        throw new Error(
          typeof json.error === "string" ? json.error : "The CSV could not be read. Check the header row and try again."
        );
      setResult({
        text: `Imported ${json.imported} customers: ${json.called} will be called, ${json.control} held out as control${
          json.skipped?.length ? `. Skipped ${json.skipped.length} invalid number(s).` : "."
        }`,
      });
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
        value={csv}
        onChange={(e) => setCsv(e.target.value)}
        rows={10}
        spellCheck={false}
        aria-label="Customer CSV"
        className="w-full rounded-lg border border-line bg-canvas p-3 font-mono text-xs leading-5 focus:outline-2 focus:outline-offset-1 focus:outline-accent"
      />
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-3 text-sm">
          <span className="text-muted">Called share</span>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={share}
            onChange={(e) => setShare(Number(e.target.value))}
            className="accent-accent"
          />
          <span className="w-24 tnum">
            {share}% / {100 - share}%
          </span>
        </label>
        <span className="text-xs text-faint">
          {rows.length} row{rows.length === 1 ? "" : "s"} parsed
        </span>
        <button
          onClick={submit}
          disabled={busy || rows.length === 0}
          className={buttonClass("primary", "md", "ml-auto")}
        >
          <Upload className="size-4" aria-hidden />
          {busy ? "Importing…" : "Import customers"}
        </button>
      </div>
      {result && (
        <p className={result.error ? "text-sm text-danger-fg" : "text-sm text-good-fg"}>
          {result.text}
          {!result.error && (
            <Link href="/contacts" className={buttonClass("secondary", "sm", "ml-3 align-middle")}>
              <Users className="size-3.5" aria-hidden />
              View customers
            </Link>
          )}
        </p>
      )}
    </div>
  );
}
