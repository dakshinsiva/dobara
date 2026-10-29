"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, PhoneOff, Sparkles } from "lucide-react";
import type { BolnaWebCall, CallError, CallState } from "@bolna/web-call";
import { Badge, buttonClass } from "@/components/ui";
import { COHORT_LABEL, LANGUAGE_LABEL } from "@/lib/labels";
import type { Cohort, Language } from "@/db/schema";

export type Persona = {
  id: string;
  name: string;
  product: string | null;
  flavour: string | null;
  cohort: Cohort;
  language: Language;
  hasMemory: boolean;
};

type Phase = "idle" | "connecting" | "ringing" | "active" | "ended" | "error";

const ERROR_TEXT: Record<CallError["code"], string> = {
  mint_failed: "Could not start a session. Check BOLNA_API_KEY and BOLNA_AGENT_ID on the server.",
  at_capacity: "All lines are busy on this Bolna account. Try again in a moment.",
  microphone_denied: "Microphone access was blocked. Allow the microphone for this site and try again.",
  connect_failed: "Could not reach the voice server. Check the network and try again.",
  call_rejected: "The voice server declined the call. Check the agent id.",
  autoplay_blocked: "The browser blocked audio. Click the button again to start.",
  already_active: "A call is already running.",
};

/**
 * Browser call to the same agent that phones customers. Audio flows over WebRTC;
 * the server mints a two-minute, single-use session so no API key reaches the browser.
 */
export function WebCall({ personas, compact = false }: { personas: Persona[]; compact?: boolean }) {
  const router = useRouter();
  const [personaId, setPersonaId] = useState<string>(personas[0]?.id ?? "guest");
  const [guestName, setGuestName] = useState("Chiranjeevi");
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [level, setLevel] = useState(0);
  const [muted, setMuted] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [callId, setCallId] = useState<string | null>(null);
  const [runId, setRunId] = useState<string | null>(null);
  const [followUp, setFollowUp] = useState<"idle" | "processing" | "ready" | "pending">("idle");

  const callRef = useRef<BolnaWebCall | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      callRef.current?.stop().catch(() => null);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  function stopTimer() {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  }

  async function waitForResults(id: string) {
    setFollowUp("processing");
    for (let i = 0; i < 18; i++) {
      await new Promise((r) => setTimeout(r, 5000));
      const res = await fetch(`/api/executions/${id}/refresh`, { method: "POST" }).catch(() => null);
      if (!res?.ok) continue;
      const json = (await res.json()) as { callId: string; terminal: boolean; hasExtractions: boolean };
      setCallId(json.callId);
      if (json.terminal && json.hasExtractions) {
        setFollowUp("ready");
        router.refresh();
        return;
      }
    }
    setFollowUp("pending");
  }

  async function start() {
    setError(null);
    setElapsed(0);
    setCallId(null);
    setRunId(null);
    setFollowUp("idle");
    setPhase("connecting");

    const { BolnaWebCall } = await import("@bolna/web-call");
    const call = new BolnaWebCall({
      getSession: async () => {
        const res = await fetch("/api/web-call/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(personaId === "guest" ? { guestName } : { contactId: personaId }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Session request failed");
        setCallId(json.call_id ?? null);
        setRunId(json.run_id ?? null);
        return json;
      },
    });
    callRef.current = call;

    call.on("state-change", (s: CallState) => {
      if (s === "connecting" || s === "ringing" || s === "active") setPhase(s);
    });
    call.on("call-start", () => {
      setPhase("active");
      stopTimer();
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    });
    call.on("volume-level", (v: number) => setLevel(v));
    call.on("call-end", () => {
      stopTimer();
      setLevel(0);
      setMuted(false);
      setPhase("ended");
      const id = call.getRunId();
      if (id) void waitForResults(id);
    });
    call.on("error", (e: CallError) => {
      stopTimer();
      setPhase("error");
      setError(ERROR_TEXT[e.code] ?? e.message);
    });

    try {
      await call.start();
    } catch (e) {
      stopTimer();
      setPhase("error");
      setError((prev) => prev ?? (e instanceof Error ? e.message : String(e)));
    }
  }

  async function hangUp() {
    await callRef.current?.stop();
  }

  function toggleMute() {
    const next = !muted;
    callRef.current?.setMuted(next);
    setMuted(next);
  }

  const inCall = phase === "connecting" || phase === "ringing" || phase === "active";
  const persona = personas.find((p) => p.id === personaId);
  const mm = Math.floor(elapsed / 60);
  const ss = (elapsed % 60).toString().padStart(2, "0");

  const statusLine: Record<Phase, string> = {
    idle: "Ready. Dobara will greet you by name and run the same check-in it runs on the phone.",
    connecting: "Connecting to the voice server…",
    ringing: "Ringing Dobara…",
    active: `In call · ${mm}:${ss}`,
    ended: "Call ended.",
    error: error ?? "Something went wrong.",
  };

  return (
    <div className={compact ? "grid gap-6" : "grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]"}>
      <div className="rounded-xl border border-line bg-surface p-6 shadow-card md:p-8">
        <div className="flex flex-col items-center text-center">
          <div className="relative mb-6 grid size-40 place-items-center">
            {phase === "active" && (
              <>
                <span className="ring-pulse absolute inset-0 rounded-full bg-accent-soft" aria-hidden />
                <span
                  className="absolute inset-0 rounded-full bg-accent-soft transition-transform duration-100"
                  style={{ transform: `scale(${1 + Math.min(level, 1) * 0.6})` }}
                  aria-hidden
                />
              </>
            )}
            <button
              onClick={inCall ? hangUp : start}
              disabled={phase === "connecting" || phase === "ringing"}
              aria-label={inCall ? "End call" : "Start call"}
              className={[
                "relative grid size-28 place-items-center rounded-full text-accent-fg shadow-lg transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent disabled:opacity-70",
                inCall ? "bg-danger text-white hover:opacity-90" : "bg-accent hover:bg-accent-hover",
              ].join(" ")}
            >
              {inCall ? <PhoneOff className="size-10" aria-hidden /> : <Mic className="size-10" aria-hidden />}
            </button>
          </div>

          <div className="text-lg font-semibold tracking-tight">
            {inCall ? (phase === "active" ? "Talking to Dobara" : "Calling Dobara") : "Talk to Dobara"}
          </div>
          <p
            className={["mt-1 max-w-md text-sm", phase === "error" ? "text-danger-fg" : "text-muted"].join(" ")}
            role="status"
          >
            {statusLine[phase]}
          </p>

          {phase === "active" && (
            <div className="mt-5 flex items-center gap-2">
              <button onClick={toggleMute} className={buttonClass("secondary", "md")}>
                {muted ? <MicOff className="size-4" aria-hidden /> : <Mic className="size-4" aria-hidden />}
                {muted ? "Unmute" : "Mute"}
              </button>
              <button onClick={hangUp} className={buttonClass("danger", "md")}>
                <PhoneOff className="size-4" aria-hidden />
                End call
              </button>
            </div>
          )}

          {phase === "ended" && (
            <div className="mt-5 flex flex-col items-center gap-2 text-sm">
              {followUp === "processing" && (
                <Badge tone="warning" dot pulse>
                  Transcribing and extracting… usually 20 to 40 seconds
                </Badge>
              )}
              {followUp === "ready" && callId && (
                <Link href={`/calls/${callId}`} className={buttonClass("primary", "md")}>
                  <Sparkles className="size-4" aria-hidden />
                  See transcript, extractions and memory
                </Link>
              )}
              {followUp === "pending" && callId && (
                <Link href={`/calls/${callId}`} className={buttonClass("secondary", "md")}>
                  Open the call (still processing)
                </Link>
              )}
              <button onClick={start} className={buttonClass("ghost", "sm")}>
                Call again
              </button>
            </div>
          )}
          {phase === "error" && (
            <button onClick={start} className={buttonClass("secondary", "md", "mt-5")}>
              Try again
            </button>
          )}
          {compact && !inCall && (
            <p className="mt-5 text-xs text-faint">
              Calling as <span className="text-muted">{persona?.name ?? guestName}</span>
              {persona?.hasMemory ? ", who it spoke to before" : ""}.{" "}
              <Link href="/talk" className="underline hover:text-fg">
                Choose another customer
              </Link>
            </p>
          )}
        </div>
      </div>

      {!compact && (
        <aside className="space-y-4">
          <div className="rounded-xl border border-line bg-surface p-4 shadow-card">
            <div className="text-xs font-medium uppercase tracking-wider text-faint">Who is Dobara calling?</div>
            <p className="mt-1 text-xs text-muted">
              The agent loads this customer&apos;s product, cohort and memory from the last call.
            </p>
            <div className="mt-3 space-y-1.5">
              {personas.map((p) => (
                <label
                  key={p.id}
                  className={[
                    "flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2 text-sm",
                    personaId === p.id ? "border-accent bg-accent-soft" : "border-line hover:bg-surface-2",
                    inCall && "pointer-events-none opacity-60",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <input
                    type="radio"
                    name="persona"
                    value={p.id}
                    checked={personaId === p.id}
                    onChange={() => setPersonaId(p.id)}
                    className="mt-1 accent-accent"
                  />
                  <span className="min-w-0">
                    <span className="font-medium">{p.name}</span>
                    <span className="block truncate text-xs text-muted">
                      {[p.product, p.flavour].filter(Boolean).join(" · ") || "No product on file"}
                    </span>
                    <span className="mt-1 flex flex-wrap gap-1">
                      <Badge tone="neutral">{COHORT_LABEL[p.cohort]}</Badge>
                      <Badge tone="neutral">{LANGUAGE_LABEL[p.language]}</Badge>
                      {p.hasMemory && (
                        <Badge tone="info" dot>
                          Remembers last call
                        </Badge>
                      )}
                    </span>
                  </span>
                </label>
              ))}
              <label
                className={[
                  "flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2 text-sm",
                  personaId === "guest" ? "border-accent bg-accent-soft" : "border-line hover:bg-surface-2",
                  inCall && "pointer-events-none opacity-60",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <input
                  type="radio"
                  name="persona"
                  value="guest"
                  checked={personaId === "guest"}
                  onChange={() => setPersonaId("guest")}
                  className="mt-1 accent-accent"
                />
                <span className="min-w-0 flex-1">
                  <span className="font-medium">Guest</span>
                  <span className="block text-xs text-muted">
                    A first-time call to someone running low on plant protein.
                  </span>
                  {personaId === "guest" && (
                    <input
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      placeholder="Your name"
                      aria-label="Guest name"
                      className="mt-2 w-full rounded-md border border-line bg-surface px-2 py-1 text-sm"
                    />
                  )}
                </span>
              </label>
            </div>
          </div>

          <div className="rounded-xl border border-line bg-surface p-4 shadow-card">
            <div className="text-xs font-medium uppercase tracking-wider text-faint">Things to try</div>
            <ul className="mt-2 space-y-1.5 text-sm text-muted">
              <li>Say you have &ldquo;about three scoops left&rdquo; and see the reorder offer.</li>
              <li>Switch to Hindi, Kannada or Tamil mid-sentence.</li>
              <li>Ask &ldquo;are you a bot?&rdquo; Dobara always says yes.</li>
              <li>Mention bloating. The agent will not give medical advice.</li>
              <li>Say &ldquo;stop calling me&rdquo; and watch the red flag land in Actions.</li>
            </ul>
            {persona?.hasMemory && (
              <p className="mt-3 text-xs text-faint">
                This customer has a memory from a previous call, so the agent should skip questions already answered.
              </p>
            )}
            {runId && <p className="mt-3 font-mono text-[11px] text-faint">run {runId}</p>}
          </div>
        </aside>
      )}
    </div>
  );
}
