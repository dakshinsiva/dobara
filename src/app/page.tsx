import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { and, eq } from "drizzle-orm";
import {
  ArrowRight,
  Brain,
  Clock,
  FlaskConical,
  Grid3x3,
  Languages,
  LayoutDashboard,
  ListChecks,
  MessageSquareText,
  Mic,
  Moon,
  PhoneCall,
  ShieldCheck,
  Store,
  Sun,
} from "lucide-react";
import { WebCall, type Persona } from "@/components/WebCall";
import { buttonClass, cx } from "@/components/ui";
import { getDb, schema } from "@/db";

export const dynamic = "force-dynamic";

const REPO = "https://github.com/dakshinsiva/dobara";

const VALUE_ADDS = [
  {
    icon: Clock,
    title: "Calls at the moment that matters",
    body: "Cohorts build themselves from the store's orders and deliveries: just delivered, running low, lapsed. The reorder cycle is learned from real gaps, per product, so the call lands days before the tub is empty.",
    replaces: "Campaign calendars, CSV exports, a person picking who to call",
    proof:
      "One read-only Shopify token. 36 sample customers sorted into four cohorts in one sync. A 32-day protein cycle and a 44-day collagen cycle learned from the orders. Daily sync.",
  },
  {
    icon: Languages,
    title: "A conversation that gets answered",
    body: "Two minutes in Hindi, Tamil, Kannada or English, switching when the customer does, from an assistant that says it is an AI and knows what they bought.",
    replaces: "WhatsApp blasts nobody reads; call centres that cost more than the margin",
    proof:
      "Real calls to three customers. One call moved through English, Hindi and Kannada in 2m 24s. ₹13 per conversation on Bolna's billing.",
  },
  {
    icon: Brain,
    title: "Memory across calls",
    body: "The next call opens with what the customer said last time: how they take it, what they disliked, what was promised.",
    replaces: "Every touch starting from zero",
    proof: "Memory written back after every completed call, shown on the customer record and on the call page.",
  },
  {
    icon: ListChecks,
    title: "Answers that become actions and insight",
    body: "Twelve structured fields per call: usage, stock, satisfaction, issue, intent, callback, red flag and more. Promises become a queue a person clears; problems aggregate into why customers leave, by product.",
    replaces: "Reading transcripts; surveys with a 3% response; guessing at churn reasons",
    proof:
      "An action queue with WhatsApp deep links. Issue and satisfaction distributions. Per-product health on the Overview.",
  },
  {
    icon: FlaskConical,
    title: "Lift the CFO can approve",
    body: "A share of customers is never called. Reorders in both groups are read from the store. The gap is reported with a significance test and the number of customers needed to confirm it.",
    replaces: "Open rates, click rates, and faith",
    proof:
      "Called-versus-control split by a stable hash. Two-proportion test, incremental reorders, and the rupee figure at the brand's own reorder value.",
  },
];

const WEEK = [
  {
    when: "Day 1",
    title: "Connect",
    body: "Paste a read-only Shopify token. Dobara reads orders and deliveries, sorts every customer into a lifecycle stage, guesses their language from the shipping state, and holds out a control share.",
  },
  {
    when: "Day 2 onward",
    title: "Calls",
    body: "Each morning the running-low, just-delivered and lapsed cohorts are dialled inside the 10:00 to 19:00 window. One attempt and one retry, never twice in a fortnight, never after a stop. Every call ends with twelve answers and a memory.",
  },
  {
    when: "Every day",
    title: "The queue",
    body: "Reorder links to send on WhatsApp, callbacks to make, complaints and health flags to route. A person clears it; nothing reaches a customer without a person pressing send.",
  },
  {
    when: "Week 2",
    title: "The readout",
    body: "Reorders flow back from the store. The lift card shows called versus control with the confidence level, incremental reorders, and the rupee figure. The product table shows where retention is weakest and what customers said.",
  },
  {
    when: "Ongoing",
    title: "It compounds",
    body: "Cohorts refresh daily, memory accumulates, the churn-reason picture sharpens, and the brand pays only for conversations that reached a customer.",
  },
];

const MOAT = [
  [
    "The timing model",
    "Every call records usage and stock left. Across thousands of calls that becomes a per-product run-out predictor nobody else has, because nobody else asks.",
  ],
  [
    "The churn benchmark",
    "Why customers leave, by category and flavour, across brands. The second brand on the platform already benefits from the first.",
  ],
  [
    "The control group",
    "Measured incrementality is a habit brands do not have and a number competitors cannot quote. Once a CFO has seen it, a tool without it looks like a campaign.",
  ],
  [
    "The compliance stack",
    "Owned numbers, verified caller ID, DND scrubbing and a shared opt-out registry take months of paperwork and are invisible until they are missing.",
  ],
  [
    "Workflow lock-in",
    "The action queue is where the ops team works every morning; the memory is the brand's own customer knowledge, in one place.",
  ],
];

const GUARDRAILS = [
  "Says it is an AI in the first sentence",
  "Never gives medical, diet or health advice",
  "Never invents a price, discount or delivery date",
  "Honours “stop calling” forever",
  "Calls only between 10:00 and 19:00",
  "Hands over to a person on request",
];

/** Sample-store customers first, so a stranger talks to "Meera Iyer" rather than a real person's row. */
async function loadPersonas(): Promise<Persona[]> {
  try {
    const db = getDb();
    const base = and(eq(schema.contacts.group, "called"), eq(schema.contacts.doNotCall, 0));
    let rows = await db
      .select()
      .from(schema.contacts)
      .where(and(base, eq(schema.contacts.source, "shopify")))
      .orderBy(schema.contacts.createdAt)
      .limit(4);
    if (rows.length === 0) {
      rows = await db.select().from(schema.contacts).where(base).orderBy(schema.contacts.createdAt).limit(4);
    }
    return rows.map((c) => ({
      id: c.id,
      name: c.name,
      product: c.product,
      flavour: c.flavour,
      cohort: c.cohort,
      language: c.language,
      hasMemory: Boolean(c.lastSummary),
    }));
  } catch {
    return [];
  }
}

function Section({
  id,
  eyebrow,
  title,
  lead,
  children,
  className,
}: {
  id?: string;
  eyebrow: string;
  title: string;
  lead?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={cx("scroll-mt-20 py-14 md:py-20", className)}>
      <div className="mx-auto w-full max-w-6xl px-4 md:px-8">
        <div className="max-w-3xl">
          <div className="text-xs font-medium uppercase tracking-wider text-accent">{eyebrow}</div>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">{title}</h2>
          {lead && <p className="mt-3 text-base leading-7 text-muted">{lead}</p>}
        </div>
        <div className="mt-8">{children}</div>
      </div>
    </section>
  );
}

export default async function LandingPage() {
  const cookieStore = await cookies();
  const theme = cookieStore.get("theme")?.value;
  const nextTheme = theme === "dark" ? "light" : "dark";
  const agentReady = Boolean(process.env.BOLNA_AGENT_ID && process.env.BOLNA_API_KEY);
  const personas = await loadPersonas();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-line bg-canvas/85 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-4 px-4 md:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-lg bg-accent text-accent-fg">
              <PhoneCall className="size-4" aria-hidden />
            </span>
            <span className="text-base font-semibold tracking-tight">Dobara</span>
          </Link>
          <nav className="ml-6 hidden items-center gap-5 text-sm text-muted md:flex" aria-label="Sections">
            <a href="#value" className="hover:text-fg">
              What it adds
            </a>
            <a href="#how" className="hover:text-fg">
              How it works
            </a>
            <a href="#hear" className="hover:text-fg">
              Hear it
            </a>
            <a href="#pricing" className="hover:text-fg">
              Pricing
            </a>
            <a href={REPO} target="_blank" rel="noreferrer" className="hover:text-fg">
              GitHub
            </a>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <a
              href={`/api/theme?set=${nextTheme}&back=/`}
              className="grid size-8 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-fg"
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? <Sun className="size-4" aria-hidden /> : <Moon className="size-4" aria-hidden />}
            </a>
            <Link
              href="/overview"
              className={buttonClass("secondary", "sm", "hidden whitespace-nowrap sm:inline-flex")}
            >
              <LayoutDashboard className="size-3.5" aria-hidden />
              Open the console
            </Link>
            <a href="#hear" className={buttonClass("primary", "sm", "whitespace-nowrap")}>
              <Mic className="size-3.5" aria-hidden />
              Talk to Dobara
            </a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[520px]"
          style={{
            background:
              "radial-gradient(60% 60% at 50% 0%, color-mix(in oklab, var(--accent) 16%, transparent), transparent 70%)",
          }}
          aria-hidden
        />
        <div className="mx-auto w-full max-w-6xl px-4 pb-10 pt-16 md:px-8 md:pt-24">
          <div className="max-w-3xl">
            <div className="text-xs font-medium uppercase tracking-wider text-accent">
              The retention agent for consumer brands
            </div>
            <h1 className="mt-3 text-4xl font-semibold leading-[1.08] tracking-tight md:text-6xl">
              Calls your customers before they lapse. Proves it worked.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-muted">
              Dobara phones a brand&apos;s customers in the week they would otherwise leave, in Hindi, Tamil, Kannada or
              English, remembers every past conversation, and reports the reorder lift against customers it never
              called.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <a href="#hear" className={buttonClass("primary", "md", "h-11 px-5 text-base")}>
                <Mic className="size-4" aria-hidden />
                Talk to Dobara
              </a>
              <Link href="/overview" className={buttonClass("secondary", "md", "h-11 px-5 text-base")}>
                Open the live console
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
            <p className="mt-3 text-sm text-faint">
              No sign-up. The console runs on a sample store you can replace with your own Shopify token.
            </p>
          </div>

          <dl className="mt-12 grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              ["₹13", "cost of a two-minute conversation, telephony included"],
              ["₹30", "price per reached conversation; no-answers are free"],
              ["4 languages", "Hindi, Tamil, Kannada, English, switching mid-sentence"],
              ["1 token", "a read-only Shopify key is the whole onboarding"],
            ].map(([n, label]) => (
              <div key={n} className="flex flex-col rounded-xl border border-line bg-surface px-4 py-3.5 shadow-card">
                <dt className="order-2 mt-0.5 text-xs leading-5 text-muted">{label}</dt>
                <dd className="order-1 text-2xl font-semibold tracking-tight tnum">{n}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-12 overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
            <div className="flex items-center gap-1.5 border-b border-line px-4 py-2.5">
              <span className="size-2.5 rounded-full bg-line-strong" />
              <span className="size-2.5 rounded-full bg-line-strong" />
              <span className="size-2.5 rounded-full bg-line-strong" />
              <span className="ml-3 text-xs text-faint">dobara-app.vercel.app/overview</span>
            </div>
            <Image
              src="/landing/overview.png"
              alt="The Dobara Overview: repeat rate against the D2C benchmark, days between orders, customers at risk this week and what that is worth, lapsed customers, reorder lift, and open follow-ups."
              width={1440}
              height={900}
              priority
              sizes="(min-width: 1152px) 1088px, 100vw"
              className="h-auto w-full"
            />
          </div>

          <p className="mt-6 text-center text-xs text-faint">
            Voice by Bolna · Calls on Plivo · Speech by Sarvam · First brand: Cosmix, a Marico-backed plant-protein
            brand
          </p>
        </div>
      </section>

      {/* Problem */}
      <Section
        eyebrow="The problem"
        title="Retention is a calling problem, not a marketing one"
        lead="Indian D2C brands keep only 20 to 30% of first-time buyers, even for products that run out every month, and buy the lost ones back on Meta and Google at a rising price. The tools they have are text: WhatsApp blasts, SMS, email. Cheap, and ignored. The one channel that gets answered, a call from someone who knows what you bought, costs more than the margin on a tub when a person makes it. So nobody calls."
        className="border-t border-line bg-surface/60"
      >
        <div className="grid gap-4 md:grid-cols-3">
          {[
            [
              "The moment matters",
              "A protein customer decides whether to buy again in the week the tub runs out, not when a campaign goes out.",
            ],
            [
              "The reason matters",
              "Taste fatigue, bloating, price and delivery are different problems with different fixes, and a brand only learns which one it has by asking.",
            ],
            [
              "The proof matters",
              "Retention spend competes with acquisition spend, and acquisition has a ROAS number. Retention usually does not.",
            ],
          ].map(([t, b]) => (
            <div key={t} className="rounded-xl border border-line bg-surface p-5 shadow-card">
              <h3 className="font-semibold">{t}</h3>
              <p className="mt-2 text-sm leading-6 text-muted">{b}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Value adds */}
      <Section
        id="value"
        eyebrow="What Dobara adds"
        title="Five things a brand cannot do today, and one number it can take to the CFO"
        lead="Each one replaces something the brand does by hand, or cannot do at all. The proof is what exists in the product now, not a promise."
      >
        <ol className="grid gap-4 lg:grid-cols-2">
          {VALUE_ADDS.map((v, i) => {
            const Icon = v.icon;
            const last = i === VALUE_ADDS.length - 1;
            return (
              <li
                key={v.title}
                className={cx(
                  "rounded-xl border bg-surface p-5 shadow-card",
                  last ? "border-accent/60 lg:col-span-2" : "border-line"
                )}
              >
                <div className="flex items-start gap-4">
                  <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-faint tnum">0{i + 1}</div>
                    <h3 className="mt-0.5 text-lg font-semibold">{v.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted">{v.body}</p>
                    <dl className="mt-4 grid gap-3 text-sm md:grid-cols-2">
                      <div className="rounded-lg bg-surface-2 p-3">
                        <dt className="text-xs font-medium uppercase tracking-wider text-faint">Replaces</dt>
                        <dd className="mt-1 leading-6">{v.replaces}</dd>
                      </div>
                      <div className="rounded-lg bg-surface-2 p-3">
                        <dt className="text-xs font-medium uppercase tracking-wider text-faint">Proof today</dt>
                        <dd className="mt-1 leading-6">{v.proof}</dd>
                      </div>
                    </dl>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
        <p className="mt-5 max-w-3xl text-sm leading-6 text-muted">
          The fifth is the one no other retention tool offers by default, and it turns the first four from features into
          a business case.
        </p>
      </Section>

      {/* Retention analytics */}
      <Section
        eyebrow="Retention analytics"
        title="The analysis a retention lead builds in a spreadsheet, with the call attached"
        lead="Cohort curves, a learned reorder cycle, segments and benchmarks, the way an analytics app shows them. The difference is the button at the end of each row."
        className="border-y border-line bg-surface/60"
      >
        <div className="grid items-start gap-8 lg:grid-cols-5">
          <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card lg:col-span-3">
            <Image
              src="/landing/retention.png"
              alt="The Retention page: second-order rate against the D2C benchmark, the 32-day reorder cycle, a weak August cohort flagged in the heatmap, and the insights read for you."
              width={1440}
              height={900}
              sizes="(min-width: 1024px) 640px, 100vw"
              className="h-auto w-full"
            />
          </div>
          <ul className="space-y-4 text-sm leading-6 lg:col-span-2">
            {[
              [
                Grid3x3,
                "Cohort curves by month of first order, with weak months flagged and read for you in plain sentences.",
              ],
              [
                Clock,
                "The reorder cycle learned from real gaps, per product. It sets the day Dobara calls once a product has enough data.",
              ],
              [
                FlaskConical,
                "The purchase ladder (first to second to third order) against published D2C ranges, and the discount effect on repeat.",
              ],
              [
                PhoneCall,
                "Segments that each map to a call: at risk, promising, hibernating, loyal, champions, lost. Where other tools sync a segment to an email flow, Dobara dials it.",
              ],
              [
                MessageSquareText,
                "Ask Dobara by voice, in four languages. The same analyst is an MCP server for Claude, ChatGPT and Cursor.",
              ],
            ].map(([Icon, text]) => {
              const I = Icon as typeof Grid3x3;
              return (
                <li key={text as string} className="flex gap-3">
                  <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-md bg-accent-soft text-accent">
                    <I className="size-4" aria-hidden />
                  </span>
                  <span>{text as string}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </Section>

      {/* How it works */}
      <Section
        id="how"
        eyebrow="How it works"
        title="From a token to a lift readout in two weeks"
        lead="The team's only recurring job is clearing the follow-up queue."
      >
        <ol className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {WEEK.map((s, i) => (
            <li key={s.title} className="relative rounded-xl border border-line bg-surface p-5 shadow-card">
              <div className="flex items-center gap-2 text-xs font-medium text-accent">
                <span className="grid size-5 place-items-center rounded-full bg-accent text-[11px] text-accent-fg tnum">
                  {i + 1}
                </span>
                {s.when}
              </div>
              <h3 className="mt-2 font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted">{s.body}</p>
            </li>
          ))}
        </ol>
      </Section>

      {/* Hear it */}
      <Section
        id="hear"
        eyebrow="Hear it"
        title="Talk to the agent that phones customers"
        lead="The same prompt, memory and extractions, over your microphone instead of Plivo. Pick a sample customer and it loads their product and what it remembers; or talk as a guest."
        className="border-y border-line bg-surface/60"
      >
        <div className="grid gap-6 lg:grid-cols-5">
          <div className="rounded-2xl border border-line bg-surface p-5 shadow-card lg:col-span-3">
            {agentReady ? (
              <WebCall personas={personas} compact />
            ) : (
              <p className="text-sm text-muted">The voice agent is not configured on this deployment yet.</p>
            )}
          </div>
          <div className="space-y-4 text-sm leading-6 text-muted lg:col-span-2">
            <p className="font-medium text-fg">Things to try</p>
            <ul className="space-y-2">
              <li>Answer in Hindi halfway through. It follows.</li>
              <li>Say you have three scoops left. It offers the reorder link.</li>
              <li>Say the mocha is too sweet. That lands in &ldquo;why customers leave&rdquo;.</li>
              <li>Ask whether it is a bot. It tells you.</li>
              <li>Ask it to stop calling. It stops, forever.</li>
            </ul>
            <p>
              The conversation lands in{" "}
              <Link href="/calls" className="text-accent hover:underline">
                Calls
              </Link>{" "}
              like any other, with the twelve extracted answers and the memory it saved.
            </p>
          </div>
        </div>
      </Section>

      {/* Pricing */}
      <Section
        id="pricing"
        eyebrow="Economics"
        title="One saved reorder pays for fifty to eighty conversations"
        lead="So a brand is ahead at a one-point lift in reorder rate. Pay as you go, no platform fee, and a two-week free pilot that ends in a written lift readout."
      >
        <div className="grid gap-6 lg:grid-cols-5">
          <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-card lg:col-span-3">
            <table className="w-full text-sm">
              <tbody>
                {[
                  ["Cost of a conversation on Bolna, telephony included", "₹13"],
                  ["Price to the brand, per reached conversation", "₹30"],
                  ["No answer, busy, voicemail", "free"],
                  ["Value of one saved reorder (a Cosmix tub)", "₹1,500 to 2,500"],
                  ["Conversations one reorder pays for", "50 to 80"],
                ].map(([k, v]) => (
                  <tr key={k} className="border-b border-line last:border-b-0">
                    <td className="px-5 py-3 text-muted">{k}</td>
                    <td className="px-5 py-3 text-right font-medium tnum">{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="space-y-3 text-sm leading-6 text-muted lg:col-span-2">
            <p>
              <span className="font-medium text-fg">Lift-based billing</span>, a share of incremental reorders measured
              against the control group, is the option for portfolio deals.
            </p>
            <p>
              The price is a launch assumption. The cost and the reorder value are measured from our own calls and the
              first brand&apos;s orders.
            </p>
          </div>
        </div>
      </Section>

      {/* Moat */}
      <Section
        eyebrow="Why it is hard to copy"
        title="The call is a commodity. What sits above it compounds."
        className="border-y border-line bg-surface/60"
      >
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {MOAT.map(([t, b]) => (
            <div key={t} className="rounded-xl border border-line bg-surface p-5 shadow-card">
              <h3 className="font-semibold">{t}</h3>
              <p className="mt-2 text-sm leading-6 text-muted">{b}</p>
            </div>
          ))}
          <div className="flex items-center rounded-xl border border-dashed border-line-strong p-5 text-sm leading-6 text-muted">
            In year one the moat is thin. By the third brand it is the data.
          </div>
        </div>
      </Section>

      {/* Why now, why us */}
      <Section
        eyebrow="Why now, and why us"
        title="A two-minute conversation in an Indian language costs ₹13 this year. Last year it was not possible at any price."
        lead="Sarvam's speech models, Bolna's orchestration and Plivo's telephony made the call cheaper than the SMS campaign it replaces, with 186 milliseconds to first word and language switching mid-sentence. The economics of calling every customer every cycle only started to work in 2026."
      >
        <div className="grid gap-4 md:grid-cols-2">
          {[
            [
              "Chiranjeevi Vijayaraghavan",
              "Operations",
              "Head of Operations at Cosmix, a Marico-backed plant-protein brand, after xto10x, Yogabar, Rivigo and AB InBev. Knows which customers to call and what the ops team will tolerate.",
            ],
            [
              "Dakshin Siva",
              "Product and engineering",
              "Built Dobara end to end. Founder of Nexus, an AI-native chartered-accountancy firm; earlier data and software engineering at Coinbase and Cypher.",
            ],
          ].map(([name, role, bio]) => (
            <div key={name} className="rounded-xl border border-line bg-surface p-5 shadow-card">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-full bg-fg text-sm font-semibold text-surface">
                  {name
                    .split(" ")
                    .map((w) => w[0])
                    .join("")}
                </span>
                <div>
                  <div className="font-semibold">{name}</div>
                  <div className="text-xs text-muted">{role}</div>
                </div>
              </div>
              <p className="mt-3 text-sm leading-6 text-muted">{bio}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Guardrails */}
      <section className="border-t border-line bg-surface/60 py-10">
        <div className="mx-auto w-full max-w-6xl px-4 md:px-8">
          <div className="flex items-center gap-2 text-sm font-medium">
            <ShieldCheck className="size-4 text-accent" aria-hidden />
            Built to be trusted on a customer&apos;s phone
          </div>
          <ul className="mt-3 grid gap-x-6 gap-y-2 text-sm text-muted sm:grid-cols-2 lg:grid-cols-3">
            {GUARDRAILS.map((g) => (
              <li key={g} className="flex gap-2">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
                {g}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* CTA + footer */}
      <section className="py-16">
        <div className="mx-auto w-full max-w-6xl px-4 text-center md:px-8">
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Every brand on Shopify can do this with one token.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-muted">
            Cosmix is first. Open the console on the sample store, or connect yours.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/overview" className={buttonClass("primary", "md", "h-11 px-5 text-base")}>
              <LayoutDashboard className="size-4" aria-hidden />
              Open the console
            </Link>
            <Link href="/connect" className={buttonClass("secondary", "md", "h-11 px-5 text-base")}>
              <Store className="size-4" aria-hidden />
              Connect a store
            </Link>
          </div>
        </div>
      </section>
      <footer className="border-t border-line py-8 text-xs text-faint">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 md:flex-row md:items-center md:justify-between md:px-8">
          <div>Dobara (दोबारा) means &ldquo;again&rdquo;. Built for the Bolna Buildathon at Symphony 2026.</div>
          <div className="flex flex-wrap gap-4">
            <a href={REPO} target="_blank" rel="noreferrer" className="hover:text-fg">
              GitHub
            </a>
            <Link href="/overview" className="hover:text-fg">
              Console
            </Link>
            <Link href="/talk" className="hover:text-fg">
              Talk to Dobara
            </Link>
            <span>Voice by Bolna · Calls on Plivo · Speech by Sarvam</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
