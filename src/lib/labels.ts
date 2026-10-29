/**
 * Human-readable labels and tones for everything the UI renders.
 * Keep raw values (cohorts, extraction options, Bolna statuses) out of JSX.
 */
import type { ActionType, Cohort, Group, Language } from "@/db/schema";
import { D } from "../../bolna/dispositions.mjs";

export type Tone = "neutral" | "good" | "warning" | "danger" | "info" | "muted";

export const COHORT_LABEL: Record<Cohort, string> = {
  new: "New customer",
  running_low: "Running low",
  lapsed: "Lapsed",
};

export const COHORT_HINT: Record<Cohort, string> = {
  new: "First order delivered 4 to 7 days ago",
  running_low: "Likely to run out this week",
  lapsed: "No order for 60 days or more",
};

export const GROUP_LABEL: Record<Group, string> = { called: "Called", control: "Control" };

export const LANGUAGE_LABEL: Record<Language, string> = {
  en: "English",
  hi: "Hindi",
  kn: "Kannada",
  ta: "Tamil",
};

export const ACTION_LABEL: Record<ActionType, string> = {
  send_link: "Send WhatsApp reorder link",
  callback_human: "Customer wants a human callback",
  callback_later: "Call back at another time",
  cx_followup: "Customer-experience follow-up",
  red_flag: "Red flag",
};

export const ACTION_TONE: Record<ActionType, Tone> = {
  send_link: "good",
  callback_human: "info",
  callback_later: "warning",
  cx_followup: "warning",
  red_flag: "danger",
};

/** Extraction option values → labels. Anything missing falls back to humanize(). */
const VALUE_LABEL: Record<string, string> = {
  yes: "Yes",
  no: "No",
  maybe: "Maybe",
  unknown: "Not discussed",
  none: "None",
  wrong_person: "Wrong person",
  daily: "Daily",
  sometimes: "Sometimes",
  stopped: "Stopped",
  not_started: "Not started",
  finished: "Finished",
  under_a_week: "Under a week",
  more_than_a_week: "More than a week",
  happy: "Happy",
  neutral: "Neutral",
  unhappy: "Unhappy",
  taste: "Taste",
  digestion: "Digestion",
  price: "Price",
  delivery: "Delivery",
  results: "Results",
  other: "Other",
  already_reordered: "Already reordered",
  human: "Human callback",
  later: "Call back later",
  do_not_call: "Do not call",
  health_complaint: "Health complaint",
  angry: "Angry customer",
  wrong_number: "Wrong number",
};

export function humanize(value: string | null | undefined): string {
  if (!value) return "—";
  if (VALUE_LABEL[value]) return VALUE_LABEL[value];
  return value.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

/** Tone of an extraction value, by field. Positive outcomes are green, risks red. */
export function extractionTone(field: string, value: string | null | undefined): Tone {
  if (!value || value === "unknown") return "muted";
  switch (field) {
    case D.reached:
      return value === "yes" ? "good" : value === "wrong_person" ? "danger" : "warning";
    case D.usage:
      return value === "daily" ? "good" : value === "sometimes" ? "warning" : "danger";
    case D.stock:
      return value === "more_than_a_week" ? "good" : value === "under_a_week" ? "warning" : "danger";
    case D.satisfaction:
      return value === "happy" ? "good" : value === "neutral" ? "warning" : "danger";
    case D.issue:
      return value === "none" ? "good" : "warning";
    case D.reorderIntent:
      return value === "yes" || value === "already_reordered" ? "good" : value === "maybe" ? "warning" : "danger";
    case D.sendLink:
      return value === "yes" ? "good" : "muted";
    case D.callback:
      return value === "no" ? "muted" : "info";
    case D.redFlag:
      return value === "none" ? "good" : "danger";
    default:
      return "neutral";
  }
}

export const EXTRACTION_LABEL: Record<string, string> = {
  [D.reached]: "Reached",
  [D.usage]: "Usage",
  [D.stock]: "Stock left",
  [D.satisfaction]: "Satisfaction",
  [D.issue]: "Issue",
  [D.issueDetail]: "Issue detail",
  [D.reorderIntent]: "Reorder intent",
  [D.sendLink]: "WhatsApp link",
  [D.callback]: "Callback",
  [D.changeRequest]: "Would change",
  [D.nextCallSummary]: "Memory for next call",
  [D.redFlag]: "Red flag",
};

export interface StatusInfo {
  label: string;
  tone: Tone;
  /** True while Bolna is still dialling or the conversation is happening. */
  live: boolean;
}

const STATUS: Record<string, StatusInfo> = {
  scheduled: { label: "Scheduled", tone: "info", live: false },
  rescheduled: { label: "Rescheduled", tone: "info", live: false },
  queued: { label: "Queued", tone: "warning", live: true },
  initiated: { label: "Dialling", tone: "warning", live: true },
  ringing: { label: "Ringing", tone: "warning", live: true },
  "in-progress": { label: "Live", tone: "good", live: true },
  "call-disconnected": { label: "Wrapping up", tone: "warning", live: true },
  completed: { label: "Completed", tone: "neutral", live: false },
  "no-answer": { label: "No answer", tone: "warning", live: false },
  busy: { label: "Busy", tone: "warning", live: false },
  failed: { label: "Failed", tone: "danger", live: false },
  canceled: { label: "Cancelled", tone: "muted", live: false },
  stopped: { label: "Stopped", tone: "muted", live: false },
  error: { label: "Error", tone: "danger", live: false },
  "balance-low": { label: "Balance low", tone: "danger", live: false },
};

export function statusInfo(status: string): StatusInfo {
  return STATUS[status] ?? { label: humanize(status), tone: "neutral", live: false };
}

/** Still worth polling: a live status that Bolna touched in the last 20 minutes. */
export function isLive(call: { status: string; updatedAt: Date | string }): boolean {
  return statusInfo(call.status).live && Date.now() - new Date(call.updatedAt).getTime() < 20 * 60_000;
}
