"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Badge } from "@/components/ui";

/**
 * While calls are in flight, pull their state from Bolna and re-render the page.
 * The webhook normally arrives first; this covers tunnels that are down.
 */
export function AutoRefresh({ callIds, intervalMs = 6000 }: { callIds: string[]; intervalMs?: number }) {
  const router = useRouter();
  const key = callIds.join(",");

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    const tick = async () => {
      for (const id of key.split(",")) {
        await fetch(`/api/calls/${id}/refresh`, { method: "POST" }).catch(() => null);
        if (cancelled) return;
      }
      if (!cancelled) router.refresh();
    };
    const t = setInterval(tick, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [key, intervalMs, router]);

  if (!key) return null;
  return (
    <Badge tone="good" dot pulse>
      Live · {callIds.length} call{callIds.length === 1 ? "" : "s"} in progress
    </Badge>
  );
}
