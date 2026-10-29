/**
 * "Ask Dobara": a read-only analyst over the workspace. Tools wrap the same
 * read models the console pages use, so the answers match the screens.
 * Model routes through Vercel AI Gateway (OIDC on Vercel, AI_GATEWAY_API_KEY elsewhere).
 */
import { InferAgentUIMessage, ToolLoopAgent, stepCountIs, tool } from "ai";
import { and, desc, eq, ilike, or } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { COHORTS, GROUPS, LANGUAGES } from "@/db/schema";
import { optionalEnv } from "./env";
import { fmtDate } from "./format";
import { describeSignificance, getInsights, getRetentionHealth, listActions } from "./insights";
import { ACTION_LABEL, COHORT_LABEL, humanize } from "./labels";
import { CATEGORY, D } from "../../bolna/dispositions.mjs";

const { contacts, calls } = schema;

export const ASK_MODEL = process.env.AI_GATEWAY_MODEL || "openai/gpt-5-mini";

function ex(call: typeof calls.$inferSelect, name: string) {
  return call.extracted?.[CATEGORY.name]?.[name]?.objective ?? null;
}
function exText(call: typeof calls.$inferSelect, name: string) {
  const v = call.extracted?.[CATEGORY.name]?.[name]?.subjective;
  return v && v.trim() ? v.trim() : null;
}

function callSummary(call: typeof calls.$inferSelect, name?: string | null) {
  return {
    callId: call.id,
    customer: name ?? null,
    when: call.createdAt.toISOString(),
    channel: call.channel,
    status: call.status,
    seconds: call.conversationDuration,
    costUsd: call.totalCostCents != null ? Number((call.totalCostCents / 100).toFixed(2)) : null,
    reached: ex(call, D.reached),
    usage: ex(call, D.usage),
    stockLeft: ex(call, D.stock),
    satisfaction: ex(call, D.satisfaction),
    issue: ex(call, D.issue),
    issueDetail: exText(call, D.issueDetail),
    reorderIntent: ex(call, D.reorderIntent),
    sendWhatsAppLink: ex(call, D.sendLink),
    callback: ex(call, D.callback),
    redFlag: ex(call, D.redFlag),
    wouldChange: exText(call, D.changeRequest),
    memorySaved: exText(call, D.nextCallSummary),
  };
}

const tools = {
  retention_health: tool({
    description:
      "Retention health of the whole customer base: repeat rate, days between orders, lifecycle counts, at-risk customers and rupees, why customers leave, per-product health, reorder lift vs control, reach rate, open follow-ups. Use first for any 'how are we doing' question.",
    inputSchema: z.object({}),
    execute: async () => {
      const h = await getRetentionHealth();
      return {
        customers: h.base,
        repeatRate: h.repeatRate,
        repeaters: h.repeaters,
        medianDaysBetweenOrders: h.medianDaysBetweenOrders,
        lifecycle: h.lifecycle,
        atRiskThisWeek: h.atRiskThisWeek,
        revenueAtRiskInr: h.revenueAtRisk,
        whyCustomersLeave: h.issues.map((b) => ({ issue: b.label, count: b.count, share: b.share })),
        byProduct: h.byProduct,
        lift: {
          called: h.lift.called,
          control: h.lift.control,
          points: h.lift.points,
          significant: h.lift.significant,
          pValue: h.lift.pValue,
          incrementalReorders: h.lift.incrementalReorders,
          verdict: describeSignificance(h.lift),
        },
        conversations: h.conversations,
        reachRate: h.reachRate,
        openFollowUps: h.openActions,
        openRedFlags: h.redFlags,
        funnel: h.funnel.map((s) => ({ stage: s.label, value: s.value, hint: s.hint })),
      };
    },
  }),

  list_customers: tool({
    description:
      "Customers in the workspace, filtered. Use for 'who is running low', 'which Tamil speakers lapsed', 'customers on Marine Collagen'. Returns up to `limit` rows.",
    inputSchema: z.object({
      cohort: z.enum(COHORTS).optional().describe("new | running_low | lapsed | active"),
      group: z.enum(GROUPS).optional().describe("called | control"),
      language: z.enum(LANGUAGES).optional(),
      product: z.string().optional().describe("Substring match on product name"),
      query: z.string().optional().describe("Substring match on name or phone"),
      limit: z.number().int().min(1).max(100).default(20),
    }),
    execute: async ({ cohort, group, language, product, query, limit }) => {
      const db = getDb();
      const rows = await db
        .select()
        .from(contacts)
        .where(
          and(
            cohort ? eq(contacts.cohort, cohort) : undefined,
            group ? eq(contacts.group, group) : undefined,
            language ? eq(contacts.language, language) : undefined,
            product ? ilike(contacts.product, `%${product}%`) : undefined,
            query ? or(ilike(contacts.name, `%${query}%`), ilike(contacts.phone, `%${query}%`)) : undefined
          )
        )
        .orderBy(desc(contacts.updatedAt))
        .limit(limit);
      return rows.map((c) => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        cohort: c.cohort,
        cohortLabel: COHORT_LABEL[c.cohort],
        group: c.group,
        language: c.language,
        product: [c.product, c.flavour].filter(Boolean).join(" · ") || null,
        lastOrderAt: c.lastOrderAt,
        orderCount: c.orderCount,
        reorderedAt: c.reorderedAt,
        doNotCall: Boolean(c.doNotCall),
        memory: c.lastSummary,
      }));
    },
  }),

  customer_detail: tool({
    description: "One customer by name or phone, with their memory, their calls and open follow-ups.",
    inputSchema: z.object({ nameOrPhone: z.string().min(2) }),
    execute: async ({ nameOrPhone }) => {
      const db = getDb();
      const [c] = await db
        .select()
        .from(contacts)
        .where(
          or(ilike(contacts.name, `%${nameOrPhone}%`), ilike(contacts.phone, `%${nameOrPhone.replace(/\D/g, "")}%`))
        )
        .limit(1);
      if (!c) return { found: false };
      const rows = await db
        .select()
        .from(calls)
        .where(eq(calls.contactId, c.id))
        .orderBy(desc(calls.createdAt))
        .limit(5);
      const acts = (await listActions("open", 200)).filter((a) => a.action.contactId === c.id);
      return {
        found: true,
        customer: {
          name: c.name,
          phone: c.phone,
          cohort: COHORT_LABEL[c.cohort],
          group: c.group,
          language: c.language,
          product: [c.product, c.flavour].filter(Boolean).join(" · ") || null,
          firstOrderAt: c.firstOrderAt,
          lastOrderAt: c.lastOrderAt,
          orderCount: c.orderCount,
          reorderedAt: c.reorderedAt,
          doNotCall: Boolean(c.doNotCall),
          memory: c.lastSummary,
          notes: c.notes,
        },
        calls: rows.map((r) => callSummary(r, c.name)),
        openFollowUps: acts.map((a) => ({
          type: ACTION_LABEL[a.action.type],
          detail: a.action.detail,
          since: a.action.createdAt,
        })),
      };
    },
  }),

  recent_calls: tool({
    description: "The latest calls with status, length, cost and the key extracted answers.",
    inputSchema: z.object({ limit: z.number().int().min(1).max(50).default(10) }),
    execute: async ({ limit }) => {
      const db = getDb();
      const rows = await db
        .select({ call: calls, contact: contacts })
        .from(calls)
        .leftJoin(contacts, eq(calls.contactId, contacts.id))
        .orderBy(desc(calls.createdAt))
        .limit(limit);
      return rows.map((r) => callSummary(r.call, r.contact?.name ?? null));
    },
  }),

  call_transcript: tool({
    description:
      "The full transcript, summary and extractions of one call, by call id or by the customer's name (latest call).",
    inputSchema: z.object({ callId: z.string().uuid().optional(), customerName: z.string().optional() }),
    execute: async ({ callId, customerName }) => {
      const db = getDb();
      let row: { call: typeof calls.$inferSelect; contact: typeof contacts.$inferSelect | null } | undefined;
      if (callId) {
        [row] = await db
          .select({ call: calls, contact: contacts })
          .from(calls)
          .leftJoin(contacts, eq(calls.contactId, contacts.id))
          .where(eq(calls.id, callId))
          .limit(1);
      } else if (customerName) {
        [row] = await db
          .select({ call: calls, contact: contacts })
          .from(calls)
          .leftJoin(contacts, eq(calls.contactId, contacts.id))
          .where(ilike(contacts.name, `%${customerName}%`))
          .orderBy(desc(calls.createdAt))
          .limit(1);
      }
      if (!row) return { found: false };
      return {
        found: true,
        ...callSummary(row.call, row.contact?.name ?? null),
        summary: row.call.summary,
        transcript: (row.call.transcript ?? "").slice(0, 6000),
      };
    },
  }),

  follow_ups: tool({
    description:
      "Follow-up actions the team must do: WhatsApp links to send, callbacks, complaints, red flags. Open by default.",
    inputSchema: z.object({
      status: z.enum(["open", "done", "all"]).default("open"),
      limit: z.number().int().min(1).max(100).default(30),
    }),
    execute: async ({ status, limit }) => {
      const rows = await listActions(status, limit);
      return rows.map(({ action, contact }) => ({
        type: ACTION_LABEL[action.type],
        detail: action.type === "red_flag" ? humanize(action.detail) : action.detail,
        customer: contact?.name ?? null,
        phone: contact?.phone ?? null,
        status: action.status,
        since: fmtDate(action.createdAt),
        callId: action.callId,
      }));
    },
  }),

  voice_of_customer: tool({
    description:
      "Aggregated answers across all conversations: reorder intent, stock, usage, satisfaction, issues, red flags, plus verbatim quotes and cost per conversation.",
    inputSchema: z.object({}),
    execute: async () => {
      const i = await getInsights();
      return {
        conversations: i.conversations,
        distributions: i.distributions,
        quotes: i.quotes.slice(0, 15),
        costPerConversationUsd:
          i.cost.perConversationCents != null ? Number((i.cost.perConversationCents / 100).toFixed(2)) : null,
        avgSeconds: i.cost.avgSeconds,
        lift: { ...i.lift, verdict: describeSignificance(i.lift) },
      };
    },
  }),
};

export const askAgent = new ToolLoopAgent({
  model: ASK_MODEL,
  instructions: `You are Dobara's analyst for ${optionalEnv("BRAND_NAME", "Cosmix")}, a consumer brand that runs retention calls with Dobara.
Answer questions about the brand's customers, calls, follow-ups, retention health and whether calling is working.

Rules:
- Always read the data with a tool before stating a number. Never invent customers, numbers or quotes.
- Be brief: lead with the answer, then at most five short lines. Plain text, no markdown headings, no bold, no tables; use "-" bullets when listing.
- Use the customer's own words when a tool returns them. Name the customer and the product.
- Money is in rupees unless the tool says USD. Counts are customers unless stated.
- If the data cannot answer, say what is missing in one line.
- You cannot place calls, send messages or change data. If asked to, say where in the console it is done: Customers for calls, Actions for follow-ups, Connect store for syncs.
- Answer in the language of the question (English, Hindi, Tamil or Kannada).`,
  tools,
  stopWhen: stepCountIs(6),
});

export type AskUIMessage = InferAgentUIMessage<typeof askAgent>;
