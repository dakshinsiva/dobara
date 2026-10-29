import Link from "next/link";
import { Inbox } from "lucide-react";
import { ActionItem } from "@/components/ActionItem";
import { SetupNotice } from "@/components/SetupNotice";
import { Card, EmptyState, PageHeader, cx } from "@/components/ui";
import { listActions } from "@/lib/insights";
import { reorderMessage, whatsappLink } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";
export const metadata = { title: "Actions" };

export default async function ActionsPage(props: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await props.searchParams;
  const view = status === "done" ? "done" : "open";
  let rows;
  try {
    rows = await listActions(view);
  } catch (e) {
    return <SetupNotice error={e instanceof Error ? e.message : String(e)} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Actions"
        title={view === "open" ? `${rows.length} open` : `${rows.length} done`}
        description="Every call ends with a short list of things only a person can do: send the WhatsApp link, call back, or step in on a red flag. Clear them here."
        actions={
          <nav className="flex rounded-lg border border-line bg-surface p-0.5 text-sm" aria-label="Status">
            {(["open", "done"] as const).map((s) => (
              <Link
                key={s}
                href={s === "open" ? "/actions" : "/actions?status=done"}
                className={cx("rounded-md px-3 py-1.5 capitalize", view === s ? "bg-accent-soft font-medium text-accent" : "text-muted hover:text-fg")}
              >
                {s}
              </Link>
            ))}
          </nav>
        }
      />
      <Card padded={false}>
        {rows.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title={view === "open" ? "All clear" : "Nothing resolved yet"}
            description={view === "open" ? "New follow-ups appear within a minute of a call ending." : undefined}
          />
        ) : (
          <ul className="divide-y divide-line px-5">
            {rows.map(({ action, contact }) => (
              <ActionItem
                key={action.id}
                action={action}
                contact={contact}
                whatsappHref={action.type === "send_link" && contact ? whatsappLink(contact.phone, reorderMessage(contact)) : undefined}
              />
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
