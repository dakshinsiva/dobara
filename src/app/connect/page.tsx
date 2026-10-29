import Link from "next/link";
import { Clock, ShieldCheck, Zap } from "lucide-react";
import { ConnectStore, type Connection } from "@/components/ConnectStore";
import { SetupNotice } from "@/components/SetupNotice";
import { Card, PageHeader } from "@/components/ui";
import { COHORT_HINT, COHORT_LABEL } from "@/lib/labels";
import { DEFAULT_SETTINGS, getIntegration } from "@/lib/shopify/sync";
import { CALLABLE_COHORTS } from "@/db/schema";

export const dynamic = "force-dynamic";
export const metadata = { title: "Connect store" };

export default async function ConnectPage() {
  let connection: Connection = null;
  try {
    const row = await getIntegration("shopify");
    connection = row
      ? {
          shop: row.shop,
          shopName: row.shopName,
          settings: { ...DEFAULT_SETTINGS, ...row.settings },
          lastSyncAt: row.lastSyncAt,
          lastSyncSummary: row.lastSyncSummary,
        }
      : null;
  } catch (e) {
    return <SetupNotice error={e instanceof Error ? e.message : String(e)} />;
  }
  const summary = connection?.lastSyncSummary ?? null;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Connect store"
        title="Shopify in two minutes"
        description="Paste a read-only Admin API token. Dobara reads orders and deliveries, builds the cohorts every morning, and detects reorders for the lift metric. No CSVs, no engineering."
      />

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          <Card title="Your store">
            <ConnectStore connection={connection} defaults={DEFAULT_SETTINGS} />
          </Card>

          {summary && (
            <Card
              title="Last sync"
              description={new Date(summary.at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
            >
              {summary.error ? (
                <p className="text-sm text-danger-fg">{summary.error}</p>
              ) : (
                <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-4">
                  <Fact label="Orders read" value={summary.orders} />
                  <Fact label="Customers" value={summary.customers} />
                  <Fact label="New in workspace" value={summary.inserted} />
                  <Fact label="Reorders detected" value={summary.reorders} />
                  {Object.entries(summary.byCohort).map(([k, v]) => (
                    <Fact key={k} label={COHORT_LABEL[k as keyof typeof COHORT_LABEL] ?? k} value={v} />
                  ))}
                  {summary.skipped > 0 && <Fact label="Skipped (no phone)" value={summary.skipped} />}
                </dl>
              )}
              <p className="mt-4 text-xs text-faint">
                See them under{" "}
                <Link href="/contacts" className="underline">
                  Customers
                </Link>
                . Cohorts refresh on every sync and at 09:00 IST daily once deployed.
              </p>
            </Card>
          )}
        </div>

        <aside className="space-y-6 lg:col-span-2">
          <Card title="Get the token" description="One-time, in the Shopify admin. Read-only.">
            <ol className="list-decimal space-y-2 pl-5 text-sm leading-6 text-muted">
              <li>
                Settings → <span className="text-fg">Apps and sales channels</span> → Develop apps → Create an app, name
                it Dobara.
              </li>
              <li>
                Configure Admin API scopes: tick <code className="text-fg">read_orders</code> and{" "}
                <code className="text-fg">read_customers</code>. Save.
              </li>
              <li>
                Install app → reveal the <span className="text-fg">Admin API access token</span> once and paste it here.
              </li>
            </ol>
          </Card>

          <Card title="What happens next">
            <ul className="space-y-3 text-sm text-muted">
              <li className="flex gap-2.5">
                <Zap className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
                <span>
                  Every customer is placed in a cohort from their order history:
                  <span className="mt-1 block">
                    {CALLABLE_COHORTS.map((c) => (
                      <span key={c} className="block">
                        <span className="text-fg">{COHORT_LABEL[c]}</span>: {COHORT_HINT[c].toLowerCase()}
                      </span>
                    ))}
                    <span className="block">
                      <span className="text-fg">{COHORT_LABEL.active}</span>: {COHORT_HINT.active.toLowerCase()}
                    </span>
                  </span>
                </span>
              </li>
              <li className="flex gap-2.5">
                <Clock className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
                <span>
                  Language is guessed from the shipping state (Karnataka → Kannada, Tamil Nadu → Tamil, Hindi belt →
                  Hindi).
                </span>
              </li>
              <li className="flex gap-2.5">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
                <span>The token is encrypted at rest and only ever used to read orders. Disconnect removes it.</span>
              </li>
            </ul>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="text-lg font-semibold tnum">{value}</dd>
    </div>
  );
}
