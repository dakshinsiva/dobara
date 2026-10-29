/**
 * Thin typed client for the Bolna hosted API.
 * Docs: https://www.bolna.ai/docs/AGENTS.md and https://www.bolna.ai/docs/llms.txt
 */
import { requireEnv } from "./env";
import type { ExtractedData } from "@/db/schema";

const BASE_URL = "https://api.bolna.ai";

export class BolnaError extends Error {
  constructor(
    public status: number,
    public body: unknown,
    message?: string
  ) {
    super(message ?? `Bolna API error ${status}`);
  }
}

async function request<T>(
  path: string,
  init: { method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"; body?: unknown } = {}
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: init.method ?? "GET",
    headers: {
      Authorization: `Bearer ${requireEnv("BOLNA_API_KEY")}`,
      "Content-Type": "application/json",
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    cache: "no-store",
  });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  if (!res.ok) {
    const msg =
      typeof json === "object" && json && "message" in json
        ? String((json as { message: unknown }).message)
        : `Bolna API ${res.status} on ${path}`;
    throw new BolnaError(res.status, json, msg);
  }
  return json as T;
}

// ---- Types (subset of the execution payload we store) ----

export type ExecutionStatus =
  | "scheduled"
  | "rescheduled"
  | "queued"
  | "initiated"
  | "ringing"
  | "in-progress"
  | "call-disconnected"
  | "completed"
  | "no-answer"
  | "busy"
  | "failed"
  | "canceled"
  | "stopped"
  | "error"
  | "balance-low";

export const TERMINAL_STATUSES: ExecutionStatus[] = [
  "completed",
  "no-answer",
  "busy",
  "failed",
  "canceled",
  "stopped",
  "error",
  "balance-low",
];

export interface ExecutionPayload {
  id: string;
  agent_id: string;
  status: ExecutionStatus | string;
  conversation_duration?: number | null;
  transcript?: string | null;
  summary?: string | null;
  extracted_data?: ExtractedData | Record<string, never> | null;
  total_cost?: number | null; // cents
  user_number?: string | null;
  agent_number?: string | null;
  telephony_data?: {
    duration?: number;
    recording_url?: string | null;
    hangup_by?: string;
    hangup_reason?: string;
    call_type?: string;
    provider?: string;
  } | null;
  context_details?: {
    recipient_phone_number?: string;
    recipient_data?: Record<string, unknown>;
  } | null;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export interface StartCallBody {
  agent_id: string;
  recipient_phone_number: string;
  from_phone_number?: string;
  user_data?: Record<string, unknown>;
  agent_data?: { language?: string; voice_id?: string };
  scheduled_at?: string;
  retry_config?: {
    enabled: boolean;
    max_retries?: number;
    retry_on_statuses?: Array<"no-answer" | "busy" | "failed" | "error">;
    retry_on_voicemail?: boolean;
    retry_intervals_minutes?: number[];
  };
  bypass_call_guardrails?: boolean;
}

export interface StartCallResponse {
  message: string;
  status: string;
  execution_id: string;
}

/** Ephemeral browser-call session minted by POST /web-call/session (about 120 s, single use). */
export interface WebCallSession {
  run_id: string;
  agent_id: string;
  sip_username: string;
  sip_password: string;
  sip_domain: string;
  wss_url: string;
  sip_register: boolean;
  expires_in: number;
  ice_servers: unknown[];
}

export interface WebCallSessionBody {
  agent_id: string;
  user_data?: Record<string, unknown>;
  agent_data?: { language?: string };
}

export interface ObjectiveOption {
  value: string;
  condition: string;
  sub_options?: ObjectiveOption[];
}

export interface DispositionItem {
  name: string;
  question: string;
  category_id?: string;
  category?: string;
  model?: string;
  is_subjective?: boolean;
  subjective_type?: "text" | "timestamp" | "numeric" | "boolean" | "email" | "regex";
  subjective_type_config?: { pattern: string; description?: string } | null;
  is_objective?: boolean;
  objective_options?: ObjectiveOption[];
}

export const bolna = {
  me: () => request<Record<string, unknown>>("/user/me"),

  createAgent: (body: Record<string, unknown>) =>
    request<{ agent_id: string; state: string; version_id?: string }>("/v2/agent", {
      method: "POST",
      body,
    }),

  updateAgent: (agentId: string, body: Record<string, unknown>) =>
    request<Record<string, unknown>>(`/v2/agent/${agentId}`, { method: "PUT", body }),

  getAgent: (agentId: string) => request<Record<string, unknown>>(`/v2/agent/${agentId}`),

  startCall: (body: StartCallBody) =>
    request<StartCallResponse>("/call", { method: "POST", body }),

  getExecution: (executionId: string) =>
    request<ExecutionPayload>(`/executions/${executionId}`),

  /** Mint a browser (WebRTC) call session. The API key stays on the server; the browser gets SIP creds. */
  createWebCallSession: async (body: WebCallSessionBody) => {
    try {
      return await request<WebCallSession>("/web-call/session", { method: "POST", body });
    } catch (err) {
      // Older docs name the endpoint differently; fall back once on 404.
      if (err instanceof BolnaError && err.status === 404) {
        return request<WebCallSession>("/web-call/freeswitch-session", { method: "POST", body });
      }
      throw err;
    }
  },

  listExtractionCategories: (agentId: string) =>
    request<Array<{ id: string; name: string; model: string }>>(
      `/agent/${agentId}/extraction-categories`
    ),

  createExtractionCategory: (agentId: string, body: { name: string; model: string }) =>
    request<{ id: string; name: string; model: string }>(
      `/agent/${agentId}/extraction-categories`,
      { method: "POST", body }
    ),

  bulkCreateDispositions: (body: { agent_id: string; dispositions: DispositionItem[] }) =>
    request<{ message: string; ids: string[] }>("/dispositions/bulk", {
      method: "POST",
      body,
    }),

  /** Streams a call recording through our server (the URL needs the API key). */
  recordingResponse: async (executionId: string) => {
    return fetch(`${BASE_URL}/recordings/call/${executionId}`, {
      headers: { Authorization: `Bearer ${requireEnv("BOLNA_API_KEY")}` },
      cache: "no-store",
    });
  },
};

/** Pull a flat view of extracted_data: { "Category/Name": { objective, subjective, confidence } } */
export function flattenExtracted(extracted: ExtractedData | null | undefined) {
  const out: Record<string, { objective: string | null; subjective: string | null; confidence: number | null }> =
    {};
  if (!extracted) return out;
  for (const [category, items] of Object.entries(extracted)) {
    for (const [name, r] of Object.entries(items ?? {})) {
      out[`${category}/${name}`] = {
        objective: r?.objective ?? null,
        subjective: r?.subjective ?? null,
        confidence: r?.confidence ?? null,
      };
    }
  }
  return out;
}
