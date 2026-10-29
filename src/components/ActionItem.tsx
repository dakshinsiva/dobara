"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, MessageCircle, PhoneCall, RotateCcw } from "lucide-react";
import type { Action, Contact } from "@/db/schema";
import { Badge, buttonClass } from "@/components/ui";
import { fmtPhone, timeAgo } from "@/lib/format";
import { ACTION_LABEL, ACTION_TONE, humanize } from "@/lib/labels";

export type ActionItemProps = {
  action: Action;
  contact: Contact | null;
  /** Pre-built WhatsApp deep link with the message filled in (send_link actions only). */
  whatsappHref?: string;
  compact?: boolean;
};

export function ActionItem({ action, contact, whatsappHref, compact }: ActionItemProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const done = action.status === "done";

  async function setStatus(status: "open" | "done") {
    setBusy(true);
    try {
      await fetch(`/api/actions/${action.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const detail =
    action.type === "red_flag" ? humanize(action.detail) : action.detail && action.detail.length > 2 ? action.detail : null;

  return (
    <li className={["flex flex-wrap items-center gap-x-4 gap-y-2 py-3", done && "opacity-60"].filter(Boolean).join(" ")}>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={ACTION_TONE[action.type]} dot>
            {ACTION_LABEL[action.type]}
          </Badge>
          <span className="text-sm font-medium">{contact?.name ?? "Unknown customer"}</span>
          {contact && !compact && <span className="font-mono text-xs text-faint">{fmtPhone(contact.phone)}</span>}
          <span className="text-xs text-faint">{timeAgo(action.createdAt)}</span>
        </div>
        {detail && <p className="mt-1 text-sm text-muted">{detail}</p>}
      </div>
      <div className="flex items-center gap-1.5">
        {action.callId && (
          <Link href={`/calls/${action.callId}`} className={buttonClass("ghost", "sm")} title="Open the call">
            <PhoneCall className="size-3.5" aria-hidden />
            {!compact && "Call"}
          </Link>
        )}
        {whatsappHref && !done && (
          <a href={whatsappHref} target="_blank" rel="noreferrer" className={buttonClass("secondary", "sm")} title="Open WhatsApp with the message ready">
            <MessageCircle className="size-3.5" aria-hidden />
            WhatsApp
          </a>
        )}
        {done ? (
          <button onClick={() => setStatus("open")} disabled={busy} className={buttonClass("ghost", "sm")}>
            <RotateCcw className="size-3.5" aria-hidden />
            Reopen
          </button>
        ) : (
          <button onClick={() => setStatus("done")} disabled={busy} className={buttonClass("primary", "sm")}>
            <Check className="size-3.5" aria-hidden />
            Done
          </button>
        )}
      </div>
    </li>
  );
}
