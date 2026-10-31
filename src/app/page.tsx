import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { ArrowRight, ChevronDown, CodeXml, LayoutDashboard, Mic, Moon, PhoneCall, Sun } from "lucide-react";
import { WebCall } from "@/components/WebCall";
import { buttonClass, cx } from "@/components/ui";

export const dynamic = "force-dynamic";

const REPO = "https://github.com/dakshinsiva/dobara";

const VALUE_ADDS: Array<[string, string]> = [
  ["Calls at the right moment", "Cohorts build themselves from orders. The call lands days before the tub runs out."],
  ["In the customer's language", "Hindi, Tamil, Kannada or English, switching mid-sentence. It says it is an AI."],
  ["Remembers every call", "The next call opens with what the customer said last time."],
  ["Turns answers into action", "Twelve structured fields per call. Promises become a queue a person clears."],
  ["Proves the lift", "A share of customers is never called. The reorder gap is reported with a significance test."],
];

const STEPS: Array<[string, string]> = [
  ["Connect the store", "Paste a read-only Shopify token."],
  ["Dobara calls", "Running low, just delivered, lapsed. Every morning, 10:00 to 19:00."],
  ["Measure the lift", "Called versus control, from the store's own reorders. Two weeks to a readout."],
];

const FAQ: Array<[string, string]> = [
  [
    "Who is it for?",
    "Consumer brands whose product runs out: protein, supplements, skincare, coffee. Shopify today; a CSV works too.",
  ],
  [
    "How long does onboarding take?",
    "Minutes. Paste a read-only Shopify token. Cohorts, languages and the control group build themselves, and the first calls can go out the same day.",
  ],
  [
    "How do you know it works?",
    "A share of customers is never called. Reorders in both groups are read from the store, and the difference is reported with a significance test and the sample needed to confirm it.",
  ],
  [
    "What happens after a call?",
    "Twelve structured answers, a memory the next call opens with, and follow-ups for a person: a WhatsApp link to send, a callback, a complaint to route.",
  ],
  [
    "What will it never do?",
    "Pretend to be human, give medical advice, invent a price or delivery date, call outside 10:00 to 19:00, or call again after someone says stop.",
  ],
  [
    "Is customer data safe?",
    "The store token is read-only and encrypted at rest. The agent sees a name, a product and the last summary. Nothing is sent to a customer without a person pressing send.",
  ],
  [
    "Can I ask it questions?",
    "Yes. Ask Dobara answers by text or voice in the console, and the same analyst is an MCP server for Claude, ChatGPT and Cursor.",
  ],
];

function Wrap({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cx("mx-auto w-full max-w-5xl px-4 md:px-8", className)}>{children}</div>;
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <div className="text-xs font-medium uppercase tracking-wider text-accent-2">{children}</div>;
}

export default async function LandingPage() {
  const cookieStore = await cookies();
  const theme = cookieStore.get("theme")?.value;
  const nextTheme = theme === "dark" ? "light" : "dark";
  const agentReady = Boolean(process.env.BOLNA_AGENT_ID && process.env.BOLNA_API_KEY);

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
            <a href="#faq" className="hover:text-fg">
              FAQ
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
            <Link href="/overview" className={buttonClass("ghost", "sm", "max-sm:hidden whitespace-nowrap")}>
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
            , in their language, remembers every conversation, and proves the lift.
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
          <p className="mt-4 text-sm text-faint">No sign-up. Built on Bolna, Plivo and Sarvam.</p>

          <div className="mt-14 overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_24px_80px_-32px_rgb(217_98_26/0.35)]">
            <div className="flex items-center gap-1.5 border-b border-line px-4 py-2.5">
              <span className="size-2.5 rounded-full bg-line-strong" />
              <span className="size-2.5 rounded-full bg-line-strong" />
              <span className="size-2.5 rounded-full bg-line-strong" />
              <span className="ml-3 text-xs text-faint">dobara-app.vercel.app/overview</span>
            </div>
            <Image
              src="/landing/overview.png"
              alt="The Dobara Overview: repeat rate against the D2C benchmark, customers at risk this week, lapsed customers, reorder lift, and open follow-ups."
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
            Brands keep <span className="text-accent-2">20 to 30%</span> of first-time buyers. Text gets ignored. No
            team can call thousands of customers a month. So nobody calls.
          </p>
          <p className="mt-6 text-lg leading-8 text-muted">Dobara makes the call.</p>
        </Wrap>
      </section>

      {/* Product */}
      <section id="product" className="scroll-mt-20 border-t border-line bg-surface/60 py-20 md:py-28">
        <Wrap>
          <Eyebrow>What it does</Eyebrow>
          <ol className="mt-6 grid gap-x-10 gap-y-8 md:grid-cols-2">
            {VALUE_ADDS.map(([t, b], i) => (
              <li key={t} className={cx(i === VALUE_ADDS.length - 1 && "md:col-span-2 md:max-w-xl")}>
                <div className="flex items-baseline gap-3">
                  <span className="text-sm font-semibold text-accent-2 tnum">0{i + 1}</span>
                  <h3 className="text-lg font-semibold">{t}</h3>
                </div>
                <p className="mt-1.5 text-base leading-7 text-muted">{b}</p>
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
              <Eyebrow>How it works</Eyebrow>
              <ol className="mt-6 space-y-6">
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
            </div>
            <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
              <Image
                src="/landing/retention.png"
                alt="The Retention page: cohort curves, the learned reorder cycle, and the insights read for you."
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
              <Eyebrow>Hear it</Eyebrow>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
                Talk to the agent that phones customers.
              </h2>
              <p className="mt-4 text-base leading-7 text-muted">
                Type your name and press the microphone. Dobara greets you by name and runs the two-minute check-in it
                runs on the phone. Switch to Hindi halfway through. Say you have three scoops left. Ask if it is a bot.
                When you hang up, one click opens the call in the console: the answers, the memory and the transcript.
              </p>
            </div>
            <div>
              {agentReady ? (
                <WebCall personas={[]} variant="judge" />
              ) : (
                <p className="text-sm text-muted">The voice agent is not configured on this deployment yet.</p>
              )}
            </div>
          </div>
        </Wrap>
      </section>

      {/* FAQ */}
      <section id="faq" className="scroll-mt-20 py-20 md:py-28">
        <Wrap>
          <Eyebrow>FAQ</Eyebrow>
          <div className="mt-6 max-w-3xl divide-y divide-line border-y border-line">
            {FAQ.map(([q, a]) => (
              <details key={q} className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-base font-medium marker:hidden [&::-webkit-details-marker]:hidden">
                  {q}
                  <ChevronDown
                    className="size-4 shrink-0 text-faint transition-transform group-open:rotate-180"
                    aria-hidden
                  />
                </summary>
                <p className="pb-5 pr-8 text-base leading-7 text-muted">{a}</p>
              </details>
            ))}
          </div>
        </Wrap>
      </section>

      {/* CTA + footer */}
      <section className="border-t border-line bg-surface/60 py-20">
        <Wrap className="text-center">
          <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
            One token. Every customer, called on time.
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
          <p className="mt-8 text-sm text-muted">
            Built by Chiranjeevi Vijayaraghavan, Head of Operations at Cosmix, and Dakshin Siva, ex Coinbase and Cypher.
          </p>
        </Wrap>
      </section>
      <footer className="border-t border-line py-8 text-xs text-faint">
        <Wrap className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>Dobara (दोबारा) means &ldquo;again&rdquo;.</div>
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
