"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, Plug, RefreshCw, Store, Unplug } from "lucide-react";
import type { IntegrationSettings, SyncSummary } from "@/db/schema";
import { Badge, buttonClass } from "@/components/ui";
import { fmtDateTime } from "@/lib/format";
import { COHORT_LABEL } from "@/lib/labels";

export type Connection = {
  shop: string;
  shopName: string | null;
  settings: IntegrationSettings;
  lastSyncAt: Date | null;
  lastSyncSummary: SyncSummary | null;
} | null;

const inputClass =
  "h-9 w-full rounded-lg border border-line bg-surface px-3 text-sm focus:outline-2 focus:outline-offset-1 focus:outline-accent";

export function ConnectStore({ connection, defaults }: { connection: Connection; defaults: IntegrationSettings }) {
  const router = useRouter();
  const [shop, setShop] = useState(connection?.shop ?? "");
  const [token, setToken] = useState("");
  const [daysPerOrder, setDaysPerOrder] = useState(connection?.settings.daysPerOrder ?? defaults.daysPerOrder);
  const [calledShare, setCalledShare] = useState(
    Math.round((connection?.settings.calledShare ?? defaults.calledShare) * 100)
  );
  const [busy, setBusy] = useState<"connect" | "sync" | "disconnect" | null>(null);
  const [msg, setMsg] = useState<{ text: string; error?: boolean } | null>(null);

  async function loadSample() {
    const sampleShop = `${window.location.origin}/api/sample-store`;
    setShop(sampleShop);
    setToken("sample");
    setBusy("connect");
    setMsg(null);
    try {
      const res = await fetch("/api/integrations/shopify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shop: sampleShop,
          token: "sample",
          settings: { daysPerOrder, calledShare: calledShare / 100 },
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? res.statusText);
      setBusy("sync");
      const r2 = await fetch("/api/integrations/shopify/sync", { method: "POST" });
      const j2 = await r2.json();
      if (!r2.ok) throw new Error(j2.error ?? r2.statusText);
      const s = j2.summary as SyncSummary;
      setToken("");
      setMsg({
        text: `Sample store loaded: ${s.customers} customers across every cohort. Open Customers to see them, or Talk to Dobara to hear a call.`,
      });
      router.refresh();
    } catch (e) {
      setMsg({ text: e instanceof Error ? e.message : String(e), error: true });
    } finally {
      setBusy(null);
    }
  }

  async function connect() {
    setBusy("connect");
    setMsg(null);
    try {
      const res = await fetch("/api/integrations/shopify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shop, token, settings: { daysPerOrder, calledShare: calledShare / 100 } }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? res.statusText);
      setToken("");
      setMsg({ text: `Connected to ${json.shopName}. Run the first sync to build cohorts.` });
      router.refresh();
    } catch (e) {
      setMsg({ text: e instanceof Error ? e.message : String(e), error: true });
    } finally {
      setBusy(null);
    }
  }

  async function sync() {
    setBusy("sync");
    setMsg(null);
    try {
      const res = await fetch("/api/integrations/shopify/sync", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? res.statusText);
      const s = json.summary as SyncSummary;
      const cohorts = Object.entries(s.byCohort)
        .map(([k, v]) => `${v} ${COHORT_LABEL[k as keyof typeof COHORT_LABEL]?.toLowerCase() ?? k}`)
        .join(", ");
      setMsg({
        text: `Read ${s.orders} orders from ${s.customers} customers: ${s.inserted} new, ${s.updated} updated, ${s.reorders} reorders detected. Cohorts: ${cohorts || "none"}.`,
      });
      router.refresh();
    } catch (e) {
      setMsg({ text: e instanceof Error ? e.message : String(e), error: true });
    } finally {
      setBusy(null);
    }
  }

  async function disconnect() {
    if (!confirm("Disconnect the store? Customers already imported stay in the workspace.")) return;
    setBusy("disconnect");
    try {
      await fetch("/api/integrations/shopify", { method: "DELETE" });
      setShop("");
      setToken("");
      setMsg({ text: "Store disconnected." });
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-5">
      {connection && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-surface-2 px-4 py-3 text-sm">
          <Store className="size-4 text-accent" aria-hidden />
          <span className="font-medium">{connection.shopName ?? connection.shop}</span>
          <span className="font-mono text-xs text-faint">{connection.shop.replace(/^https?:\/\//, "")}</span>
          <Badge tone="good" dot>
            Connected
          </Badge>
          <span className="ml-auto text-xs text-muted">
            {connection.lastSyncAt ? `Last sync ${fmtDateTime(connection.lastSyncAt)}` : "Not synced yet"}
          </span>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block text-sm">
          <span className="text-muted">Store address</span>
          <input
            value={shop}
            onChange={(e) => setShop(e.target.value)}
            placeholder="cosmix.myshopify.com"
            spellCheck={false}
            className={`${inputClass} mt-1 font-mono text-xs`}
          />
        </label>
        <label className="block text-sm">
          <span className="text-muted">Admin API access token</span>
          <input
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder={connection ? "Saved. Paste again to replace." : "shpat_…"}
            type="password"
            autoComplete="off"
            spellCheck={false}
            className={`${inputClass} mt-1 font-mono text-xs`}
          />
        </label>
        <label className="block text-sm">
          <span className="text-muted">Days one order lasts</span>
          <input
            type="number"
            min={7}
            max={365}
            value={daysPerOrder}
            onChange={(e) => setDaysPerOrder(Number(e.target.value))}
            className={`${inputClass} mt-1`}
          />
          <span className="mt-1 block text-xs text-faint">Customers are called at 80% of this, e.g. day 24 of 30.</span>
        </label>
        <label className="block text-sm">
          <span className="text-muted">Share of customers to call</span>
          <div className="mt-2 flex items-center gap-3">
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={calledShare}
              onChange={(e) => setCalledShare(Number(e.target.value))}
              className="flex-1 accent-accent"
            />
            <span className="w-24 text-sm tnum">
              {calledShare}% / {100 - calledShare}%
            </span>
          </div>
          <span className="mt-1 block text-xs text-faint">The rest form the control group for measuring lift.</span>
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button onClick={connect} disabled={busy != null || !shop || !token} className={buttonClass("primary", "md")}>
          <Plug className="size-4" aria-hidden />
          {busy === "connect" ? "Checking…" : connection ? "Update connection" : "Connect store"}
        </button>
        {connection && (
          <button onClick={sync} disabled={busy != null} className={buttonClass("secondary", "md")}>
            <RefreshCw className={busy === "sync" ? "size-4 animate-spin" : "size-4"} aria-hidden />
            {busy === "sync" ? "Syncing…" : "Sync now"}
          </button>
        )}
        {!connection && (
          <button onClick={loadSample} disabled={busy != null} className={buttonClass("secondary", "md")}>
            {busy === "sync" ? "Syncing sample store…" : "Load the sample store instead"}
          </button>
        )}
        {connection && (
          <button
            onClick={disconnect}
            disabled={busy != null}
            className={buttonClass("ghost", "md", "ml-auto text-danger-fg")}
          >
            <Unplug className="size-4" aria-hidden />
            Disconnect
          </button>
        )}
      </div>

      {!connection && (
        <p className="text-xs text-muted">
          No store yet? The sample store is built in: 36 customers of an Indian plant-protein brand across every cohort,
          with up to seven orders each, loaded with one click.
        </p>
      )}

      {msg && (
        <p className={`flex items-start gap-2 text-sm ${msg.error ? "text-danger-fg" : "text-good-fg"}`}>
          {!msg.error && <Check className="mt-0.5 size-4 shrink-0" aria-hidden />}
          {msg.text}
        </p>
      )}
    </div>
  );
}
