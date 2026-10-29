"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Bot, Mic, MicOff, Send, Square, UserRound, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Badge, buttonClass, cx } from "@/components/ui";
import type { AskUIMessage } from "@/lib/ask-agent";

/* Minimal typing for the browser speech API (Chrome and Edge ship it prefixed). */
type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult:
    | ((e: {
        resultIndex: number;
        results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>;
      }) => void)
    | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  start: () => void;
  stop: () => void;
};
type RecognitionCtor = new () => Recognition;

const SUGGESTIONS = [
  "Who is running low this week?",
  "Why do customers leave?",
  "Is calling working?",
  "What did Nikita say on her last call?",
  "Which product has the weakest repeat rate?",
  "What follow-ups are waiting?",
];

const SPEECH_LANGS: Array<{ code: string; label: string }> = [
  { code: "en-IN", label: "English" },
  { code: "hi-IN", label: "हिन्दी" },
  { code: "ta-IN", label: "தமிழ்" },
  { code: "kn-IN", label: "ಕನ್ನಡ" },
];

const TOOL_LABEL: Record<string, string> = {
  retention_health: "Read retention health",
  list_customers: "Looked up customers",
  customer_detail: "Opened a customer record",
  recent_calls: "Read recent calls",
  call_transcript: "Read a transcript",
  follow_ups: "Checked follow-ups",
  voice_of_customer: "Aggregated the conversations",
};

function textOf(m: AskUIMessage): string {
  return m.parts
    .filter((p): p is Extract<typeof p, { type: "text" }> => p.type === "text")
    .map((p) => p.text)
    .join("\n")
    .trim();
}

export function AskChat({ model }: { model: string }) {
  const { messages, sendMessage, status, stop, error } = useChat<AskUIMessage>({
    transport: new DefaultChatTransport({ api: "/api/ask" }),
  });
  const [input, setInput] = useState("");
  const [lang, setLang] = useState("en-IN");
  const [listening, setListening] = useState(false);
  const [speak, setSpeak] = useState(false);
  const speechSupported = useSyncExternalStore(
    () => () => {},
    () => {
      const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
      return Boolean(w.SpeechRecognition || w.webkitSpeechRecognition);
    },
    () => false
  );
  const recRef = useRef<Recognition | null>(null);
  const spokenRef = useRef<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages, status]);

  // Read the latest answer aloud once it is complete.
  useEffect(() => {
    if (!speak || status !== "ready") return;
    const last = [...messages].reverse().find((m) => m.role === "assistant");
    if (!last || spokenRef.current === last.id) return;
    const text = textOf(last);
    if (!text || typeof window === "undefined" || !("speechSynthesis" in window)) return;
    spokenRef.current = last.id;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/^- /gm, ""));
    u.lang = lang;
    window.speechSynthesis.speak(u);
  }, [messages, status, speak, lang]);

  function submit(text: string) {
    const t = text.trim();
    if (!t || busy) return;
    sendMessage({ text: t });
    setInput("");
  }

  function toggleListening() {
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = lang;
    rec.continuous = false;
    rec.interimResults = true;
    let finalText = "";
    rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else interim += r[0].transcript;
      }
      setInput(finalText || interim);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => {
      setListening(false);
      recRef.current = null;
      if (finalText.trim()) submit(finalText);
    };
    recRef.current = rec;
    setListening(true);
    rec.start();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div className="flex min-h-[32rem] flex-col rounded-xl border border-line bg-surface shadow-card">
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {messages.length === 0 && (
            <div className="space-y-3">
              <p className="text-sm text-muted">Try one of these, or press the microphone and ask in your own words.</p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((s) => (
                  <button key={s} onClick={() => submit(s)} className={buttonClass("secondary", "sm")}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m) => {
            const user = m.role === "user";
            const toolParts = m.parts.filter((p) => p.type.startsWith("tool-"));
            const text = textOf(m);
            return (
              <div key={m.id} className={cx("flex items-end gap-2", user && "flex-row-reverse")}>
                <span
                  className={cx(
                    "grid size-7 shrink-0 place-items-center rounded-full",
                    user ? "bg-surface-2 text-muted" : "bg-accent-soft text-accent"
                  )}
                  aria-hidden
                >
                  {user ? <UserRound className="size-4" /> : <Bot className="size-4" />}
                </span>
                <div className={cx("max-w-[85%] space-y-2", user && "text-right")}>
                  {!user && toolParts.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {toolParts.map((p, i) => (
                        <Badge key={i} tone="muted">
                          {TOOL_LABEL[p.type.replace(/^tool-/, "")] ?? p.type.replace(/^tool-/, "")}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {text && (
                    <p
                      className={cx(
                        "whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-6",
                        user ? "rounded-br-md bg-accent text-accent-fg" : "rounded-bl-md bg-surface-2"
                      )}
                    >
                      {text}
                    </p>
                  )}
                  {!user && !text && busy && (
                    <p className="rounded-2xl rounded-bl-md bg-surface-2 px-4 py-2.5 text-sm text-muted">
                      Reading the data…
                    </p>
                  )}
                </div>
              </div>
            );
          })}

          {error && (
            <p className="rounded-lg border border-danger/40 bg-danger-bg px-3 py-2 text-sm text-danger-fg">
              {error.message || "The analyst could not answer. Check the AI Gateway credentials."}
            </p>
          )}
          <div ref={bottomRef} />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit(input);
          }}
          className="flex items-center gap-2 border-t border-line p-3"
        >
          <button
            type="button"
            onClick={toggleListening}
            disabled={!speechSupported || busy}
            title={
              speechSupported ? (listening ? "Stop listening" : "Ask by voice") : "Voice input needs Chrome or Edge"
            }
            aria-pressed={listening}
            className={cx(
              "grid size-10 shrink-0 place-items-center rounded-full transition-colors disabled:opacity-50",
              listening ? "bg-danger text-white" : "bg-accent text-accent-fg hover:bg-accent-hover"
            )}
          >
            {listening ? <MicOff className="size-5" aria-hidden /> : <Mic className="size-5" aria-hidden />}
          </button>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={listening ? "Listening…" : "Ask about customers, calls, follow-ups or lift"}
            aria-label="Your question"
            className="h-10 min-w-0 flex-1 rounded-lg border border-line bg-canvas px-3 text-sm focus:outline-2 focus:outline-offset-1 focus:outline-accent"
          />
          {busy ? (
            <button type="button" onClick={() => stop()} className={buttonClass("secondary", "md")}>
              <Square className="size-4" aria-hidden />
              Stop
            </button>
          ) : (
            <button type="submit" disabled={!input.trim()} className={buttonClass("primary", "md")}>
              <Send className="size-4" aria-hidden />
              Ask
            </button>
          )}
        </form>
      </div>

      <aside className="space-y-4">
        <div className="rounded-xl border border-line bg-surface p-4 shadow-card">
          <div className="text-xs font-medium uppercase tracking-wider text-faint">Voice</div>
          <label className="mt-3 block text-sm">
            <span className="text-muted">Speak in</span>
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value)}
              className="mt-1 h-9 w-full rounded-lg border border-line bg-surface px-2 text-sm"
            >
              {SPEECH_LANGS.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => {
              if (speak) window.speechSynthesis?.cancel();
              setSpeak((v) => !v);
            }}
            aria-pressed={speak}
            className={buttonClass(speak ? "primary" : "secondary", "sm", "mt-3 w-full")}
          >
            {speak ? <Volume2 className="size-4" aria-hidden /> : <VolumeX className="size-4" aria-hidden />}
            {speak ? "Reading answers aloud" : "Read answers aloud"}
          </button>
          {!speechSupported && (
            <p className="mt-3 text-xs text-faint">Voice input works in Chrome and Edge. Typing works everywhere.</p>
          )}
        </div>
        <div className="rounded-xl border border-line bg-surface p-4 shadow-card">
          <div className="text-xs font-medium uppercase tracking-wider text-faint">What it can see</div>
          <ul className="mt-2 space-y-1 text-sm text-muted">
            <li>Customers, cohorts and memory</li>
            <li>Every call, transcript and extraction</li>
            <li>Follow-ups waiting for a person</li>
            <li>Lift against the control group</li>
          </ul>
          <p className="mt-3 text-xs text-faint">Read-only. It cannot place calls or send messages. Model: {model}.</p>
        </div>
      </aside>
    </div>
  );
}
