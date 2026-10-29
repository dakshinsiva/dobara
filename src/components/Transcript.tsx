import { Bot, UserRound } from "lucide-react";

/** Bolna transcripts are "assistant: …" / "user: …" lines. Render them as a conversation. */
export function Transcript({ text, limit }: { text: string | null | undefined; limit?: number }) {
  const all = (text ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const m = l.match(/^(assistant|user)\s*:\s*(.*)$/i);
      return m
        ? { role: m[1].toLowerCase() as "assistant" | "user", text: m[2] }
        : { role: "assistant" as const, text: l };
    });
  const lines = limit ? all.slice(0, limit) : all;

  if (lines.length === 0) return <p className="text-sm text-muted">No transcript yet.</p>;

  return (
    <ol className="space-y-2.5">
      {lines.map((l, i) => {
        const user = l.role === "user";
        return (
          <li key={i} className={["flex items-end gap-2", user && "flex-row-reverse"].filter(Boolean).join(" ")}>
            <span
              className={[
                "grid size-6 shrink-0 place-items-center rounded-full",
                user ? "bg-surface-2 text-muted" : "bg-accent-soft text-accent",
              ].join(" ")}
              aria-hidden
            >
              {user ? <UserRound className="size-3.5" /> : <Bot className="size-3.5" />}
            </span>
            <p
              className={[
                "max-w-[80%] rounded-2xl px-3.5 py-2 text-sm leading-6",
                user ? "rounded-br-md bg-accent text-accent-fg" : "rounded-bl-md bg-surface-2 text-fg",
              ].join(" ")}
            >
              <span className="sr-only">{user ? "Customer: " : "Dobara: "}</span>
              {l.text}
            </p>
          </li>
        );
      })}
      {limit && all.length > limit && (
        <li className="pl-8 text-xs text-faint">{all.length - limit} more lines in the full transcript</li>
      )}
    </ol>
  );
}
