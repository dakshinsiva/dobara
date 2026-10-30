import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { and, eq } from "drizzle-orm";
import { ArrowRight, CodeXml, LayoutDashboard, Mic, Moon, PhoneCall, Sun } from "lucide-react";
import { WebCall, type Persona } from "@/components/WebCall";
import { buttonClass, cx } from "@/components/ui";
import { getDb, schema } from "@/db";

export const dynamic = "force-dynamic";

const REPO = "https://github.com/dakshinsiva/dobara";

const VALUE_ADDS = [
  {
    title: "Calls at the moment that matters",
    body: "Cohorts build themselves from the store's orders: just delivered, running low, lapsed. The reorder cycle is learned from real gaps, per product, so the call lands days before the tub is empty.",
    proof: "One read-only Shopify token. A 32-day protein cycle and a 44-day collagen cycle learned from the orders.",
  },
  {
    title: "A conversation that gets answered",
    body: "Two minutes in Hindi, Tamil, Kannada or English, switching when the customer does, from an assistant that says it is an AI and knows what they bought.",
    proof:
      "One real call moved through English, Hindi and Kannada in 2m 24s. ₹13 per conversation, telephony included.",
  },
  {
    title: "Memory across calls",
    body: "The next call opens with what the customer said last time: how they take it, what they disliked, what was promised.",
    proof: "Written back after every completed call; shown on the customer record and the call page.",
  },
  {
    title: "Answers that become actions and insight",
    body: "Twelve structured fields per call. Promises become a queue a person clears; problems aggregate into why customers leave, by product.",
    proof: "Action queue with WhatsApp deep links. Issue and satisfaction distributions. Per-product health.",
  },
  {
    title: "Lift the CFO can approve",
    body: "A share of customers is never called. Reorders in both groups are read from the store. The gap is reported with a significance test and the number of customers needed to confirm it.",
    proof: "Called-versus-control split by a stable hash. Two-proportion test, incremental reorders, rupees.",
  },
];

const STEPS = [
  [
    "Connect the store",
    "Paste a read-only Shopify token. Every customer lands in a lifecycle stage with a language and a control share held out.",
  ],
  [
    "Dobara calls",
    "Each morning, inside the 10:00 to 19:00 window: running low, just delivered, lapsed. Every call ends with twelve answers and a memory.",
  ],
  [
    "Measure the lift",
    "Reorders flow back from the store. Called versus control, with the confidence level and the rupee figure. Two weeks from token to readout.",
  ],
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

function Wrap({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cx("mx-auto w-full max-w-5xl px-4 md:px-8", className)}>{children}</div>;
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
        <Wrap className="flex h-14 items-center gap-4">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-lg bg-accent text-accent-fg">
              <PhoneCall className="size-4" aria-hidden />
            </span>
            <span className="text-base font-semibold tracking-tight">Dobara</span>
          </Link>
          <nav className="ml-6 hidden items-center gap-5 text-sm text-muted md:flex" aria-label="Sections">
            <a href="#product" className="hover:text-fg">
              Product
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
            <Link href="/overview" className={buttonClass("ghost", "sm", "hidden whitespace-nowrap sm:inline-flex")}>
              Open the console
            </Link>
            <a href="#hear" className={buttonClass("primary", "sm", "whitespace-nowrap")}>
              <Mic className="size-3.5" aria-hidden />
              Talk to Dobara
            </a>
          </div>
        </Wrap>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[640px]"
          style={{
            background:
              "radial-gradient(45% 55% at 20% 0%, color-mix(in oklab, var(--accent) 18%, transparent), transparent 70%), radial-gradient(40% 50% at 85% 10%, color-mix(in oklab, var(--accent-2) 22%, transparent), transparent 70%)",
          }}
          aria-hidden
        />
        <Wrap className="pb-12 pt-20 md:pt-28">
          <div className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-muted shadow-card">
            <span className="size-1.5 rounded-full bg-accent-2" aria-hidden />
            Live with Cosmix, a Marico-backed brand
          </div>
          <h1 className="mt-6 max-w-4xl text-5xl font-semibold leading-[1.04] tracking-tight md:text-7xl">
            The proactive retention agent for consumer brands.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-muted md:text-xl">
            Dobara calls your customers{" "}
            <span className="font-medium text-fg underline decoration-accent-2 decoration-[3px] underline-offset-4">
              before they lapse
            </span>
            , in their language, remembers every conversation, and proves the reorder lift against customers it never
            called.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a href="#hear" className={buttonClass("primary", "md", "h-12 px-6 text-base")}>
              <Mic className="size-4" aria-hidden />
              Talk to Dobara
            </a>
            <Link href="/overview" className={buttonClass("secondary", "md", "h-12 px-6 text-base")}>
              Open the live console
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
          <p className="mt-4 text-sm text-faint">
            No sign-up. Built on Bolna, Plivo and Sarvam for the Bolna Buildathon at Symphony 2026.
          </p>

          <div className="mt-14 overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_24px_80px_-32px_rgb(217_98_26/0.35)]">
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
              sizes="(min-width: 1024px) 960px, 100vw"
              className="h-auto w-full"
            />
          </div>
        </Wrap>
      </section>

      {/* Why */}
      <section className="py-20 md:py-28">
        <Wrap>
          <p className="max-w-3xl text-2xl font-medium leading-snug tracking-tight md:text-4xl">
            Indian D2C brands keep <span className="text-accent-2">20 to 30%</span> of first-time buyers. Text gets
            ignored. A human call costs more than the margin on a tub. So nobody calls, and the brand finds out from a
            dashboard three months after the customer has gone.
          </p>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-muted">
            Dobara makes the call, at the moment it matters, and shows the brand what it got for it.
          </p>
        </Wrap>
      </section>

      {/* Product */}
      <section id="product" className="scroll-mt-20 border-t border-line bg-surface/60 py-20 md:py-28">
        <Wrap>
          <div className="text-xs font-medium uppercase tracking-wider text-accent-2">What it does</div>
          <h2 className="mt-2 max-w-2xl text-3xl font-semibold tracking-tight md:text-4xl">
            Five things a brand cannot do today. One number it can take to the CFO.
          </h2>
          <ol className="mt-10 grid gap-x-10 gap-y-9 md:grid-cols-2">
            {VALUE_ADDS.map((v, i) => (
              <li key={v.title} className={cx(i === VALUE_ADDS.length - 1 && "md:col-span-2 md:max-w-2xl")}>
                <div className="flex items-baseline gap-3">
                  <span className="text-sm font-semibold text-accent-2 tnum">0{i + 1}</span>
                  <h3 className="text-lg font-semibold">{v.title}</h3>
                </div>
                <p className="mt-2 text-base leading-7 text-muted">{v.body}</p>
                <p className="mt-2 text-sm leading-6 text-faint">
                  <span className="font-medium text-muted">In the product today:</span> {v.proof}
                </p>
              </li>
            ))}
          </ol>
        </Wrap>
      </section>

      {/* How it works */}
      <section className="py-20 md:py-28">
        <Wrap>
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <div className="text-xs font-medium uppercase tracking-wider text-accent-2">How it works</div>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
                Token to lift readout in two weeks.
              </h2>
              <ol className="mt-8 space-y-6">
                {STEPS.map(([t, b], i) => (
                  <li key={t} className="flex gap-4">
                    <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-accent-2 text-xs font-semibold text-accent-2-fg tnum">
                      {i + 1}
                    </span>
                    <div>
                      <h3 className="font-semibold">{t}</h3>
                      <p className="mt-1 text-base leading-7 text-muted">{b}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <p className="mt-8 text-sm leading-6 text-faint">
                Underneath: cohort curves, a learned reorder cycle per product, segments that each map to a call, and an
                analyst you can ask by voice or from Claude over MCP.
              </p>
            </div>
            <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
              <Image
                src="/landing/retention.png"
                alt="The Retention page: second-order rate against the D2C benchmark, the 32-day reorder cycle, a weak August cohort flagged in the heatmap, and the insights read for you."
                width={1440}
                height={900}
                sizes="(min-width: 1024px) 480px, 100vw"
                className="h-auto w-full"
              />
            </div>
          </div>
        </Wrap>
      </section>

      {/* Hear it */}
      <section id="hear" className="scroll-mt-20 border-t border-line bg-surface/60 py-20 md:py-28">
        <Wrap>
          <div className="grid gap-10 lg:grid-cols-2">
            <div>
              <div className="text-xs font-medium uppercase tracking-wider text-accent-2">Hear it</div>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
                Talk to the agent that phones customers.
              </h2>
              <p className="mt-4 text-base leading-7 text-muted">
                Same prompt, memory and extractions, over your microphone instead of Plivo. Answer in Hindi halfway
                through; say you have three scoops left; say the mocha is too sweet; ask if it is a bot; tell it to stop
                calling. The conversation lands in{" "}
                <Link href="/calls" className="text-accent hover:underline">
                  Calls
                </Link>{" "}
                like any other.
              </p>
            </div>
            <div className="rounded-2xl border border-line bg-surface p-5 shadow-card">
              {agentReady ? (
                <WebCall personas={personas} compact />
              ) : (
                <p className="text-sm text-muted">The voice agent is not configured on this deployment yet.</p>
              )}
            </div>
          </div>
        </Wrap>
      </section>

      {/* Pricing */}
      <section id="pricing" className="scroll-mt-20 py-20 md:py-28">
        <Wrap>
          <div className="text-xs font-medium uppercase tracking-wider text-accent-2">Pricing</div>
          <h2 className="mt-2 max-w-3xl text-3xl font-semibold tracking-tight md:text-4xl">
            ₹30 per conversation that reaches a customer. Nothing else.
          </h2>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-muted">
            No-answers are free. No platform fee. Every brand starts with a two-week free pilot that ends in a written
            lift readout. One saved reorder pays for fifty to eighty conversations, so the brand is ahead at a one-point
            lift.
          </p>
          <p className="mt-3 text-sm text-faint">
            Lift-based billing, a share of incremental reorders measured against the control group, for portfolio deals.
          </p>
        </Wrap>
      </section>

      {/* Founders */}
      <section className="border-t border-line bg-surface/60 py-20 md:py-28">
        <Wrap>
          <div className="text-xs font-medium uppercase tracking-wider text-accent-2">Founders</div>
          <div className="mt-6 grid gap-8 md:grid-cols-2">
            {[
              [
                "Chiranjeevi Vijayaraghavan",
                "Head of Operations at Cosmix, a Marico-backed plant-protein brand. Before that xto10x, Yogabar, Rivigo and AB InBev. He knows which customers to call and what the ops team will tolerate.",
              ],
              [
                "Dakshin Siva",
                "Built Dobara end to end. Founder of Nexus, an AI-native chartered-accountancy firm; earlier data and software engineering at Coinbase and Cypher.",
              ],
            ].map(([name, bio]) => (
              <div key={name}>
                <h3 className="text-lg font-semibold">{name}</h3>
                <p className="mt-2 text-base leading-7 text-muted">{bio}</p>
              </div>
            ))}
          </div>
          <p className="mt-10 max-w-2xl text-base leading-7 text-muted">
            A two-minute conversation in an Indian language costs ₹13 this year. Last year it was not possible at any
            price. The economics of calling every customer every cycle only started to work in 2026, and we are building
            the retention layer on top of it.
          </p>
        </Wrap>
      </section>

      {/* CTA + footer */}
      <section className="py-20">
        <Wrap className="text-center">
          <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
            Every brand on Shopify can do this with one token.
          </h2>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link href="/overview" className={buttonClass("primary", "md", "h-12 px-6 text-base")}>
              <LayoutDashboard className="size-4" aria-hidden />
              Open the console
            </Link>
            <a
              href={REPO}
              target="_blank"
              rel="noreferrer"
              className={buttonClass("secondary", "md", "h-12 px-6 text-base")}
            >
              <CodeXml className="size-4" aria-hidden />
              Read the code
            </a>
          </div>
        </Wrap>
      </section>
      <footer className="border-t border-line py-8 text-xs text-faint">
        <Wrap className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            Dobara (दोबारा) means &ldquo;again&rdquo;. Says it is an AI, never gives medical advice, honours &ldquo;stop
            calling&rdquo; forever.
          </div>
          <div className="flex flex-wrap gap-4">
            <a href={REPO} target="_blank" rel="noreferrer" className="hover:text-fg">
              github.com/dakshinsiva/dobara
            </a>
            <Link href="/overview" className="hover:text-fg">
              Console
            </Link>
            <span>Voice by Bolna · Calls on Plivo · Speech by Sarvam</span>
          </div>
        </Wrap>
      </footer>
    </div>
  );
}
