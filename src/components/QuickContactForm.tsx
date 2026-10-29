"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PhoneOutgoing, UserPlus } from "lucide-react";
import { LANGUAGES, type Language } from "@/db/schema";
import { buttonClass } from "@/components/ui";
import { LANGUAGE_LABEL } from "@/lib/labels";

const inputClass =
  "h-9 w-full rounded-lg border border-line bg-surface px-3 text-sm focus:outline-2 focus:outline-offset-1 focus:outline-accent";

/** The fastest first step: one person who can answer the phone, placed in the running-low cohort. */
export function QuickContactForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [language, setLanguage] = useState<Language>("en");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ text: string; error?: boolean; contactId?: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          calledShare: 1,
          rows: [
            {
              name: name.trim() || "Test customer",
              phone,
              language,
              cohort: "running_low",
              group: "called",
              product: "No-Nonsense Plant Protein",
              flavour: "Indonesian Cacao",
              last_order_at: new Date(Date.now() - 28 * 86_400_000).toISOString().slice(0, 10),
            },
          ],
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(typeof json.error === "string" ? json.error : "Could not add the customer");
      if (json.skipped?.length)
        throw new Error("That does not look like a phone number. Use 10 digits, or +91 and 10 digits.");
      setResult({
        text: `${name.trim() || "Test customer"} added to the running-low cohort. Press Call now on Customers to hear the agent.`,
      });
      setPhone("");
      router.refresh();
    } catch (err) {
      setResult({ text: err instanceof Error ? err.message : String(err), error: true });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
        <label className="block text-sm">
          <span className="text-muted">Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className={`${inputClass} mt-1`}
          />
        </label>
        <label className="block text-sm">
          <span className="text-muted">Mobile number</span>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="98765 43210"
            inputMode="tel"
            required
            className={`${inputClass} mt-1 font-mono`}
          />
        </label>
        <label className="block text-sm">
          <span className="text-muted">Language</span>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as Language)}
            className={`${inputClass} mt-1`}
          >
            {LANGUAGES.map((l) => (
              <option key={l} value={l}>
                {LANGUAGE_LABEL[l]}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={busy || !phone.trim()} className={buttonClass("primary", "md")}>
          <UserPlus className="size-4" aria-hidden />
          {busy ? "Adding…" : "Add test customer"}
        </button>
        {result && !result.error && (
          <Link href="/contacts?cohort=running_low" className={buttonClass("secondary", "md")}>
            <PhoneOutgoing className="size-4" aria-hidden />
            Go to Customers
          </Link>
        )}
      </div>
      {result && <p className={result.error ? "text-sm text-danger-fg" : "text-sm text-good-fg"}>{result.text}</p>}
    </form>
  );
}
