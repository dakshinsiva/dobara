# Dobara

**The retention agent for consumer brands.** Dobara phones a brand's customers at the moment they would otherwise lapse, in their own language, remembers every past conversation, and turns what it hears into follow-ups, product insight and measured reorder lift.

Built for the Bolna Buildathon at Symphony 2026, with Cosmix as the first design partner.

> _Dobara_ (दोबारा) means "again" in Hindi.

## What it does

| For the customer                                                                                          | For the brand                                                                                          |
| --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| A two-minute call from a named assistant that already knows what they bought and what they said last time | **Action queue**: WhatsApp reorder links, callbacks and red flags, ready to clear                      |
| English, Hindi, Kannada or Tamil, switching mid-sentence                                                  | **Customer memory**: every call opens with the summary of the last one                                 |
| Never sold to, never given medical advice, always told it is an AI                                        | **Voice of the customer**: usage, stock, satisfaction, issues and verbatim change requests, aggregated |
| One tap to opt out, honoured forever                                                                      | **Reorder lift**: the called group measured against an uncalled control group from the same import     |

Three cohorts drive the calls: **new** (delivered 4 to 7 days ago), **running low** (about to run out) and **lapsed** (no order in 60 days). Each has its own conversation flow in a single prompt. Customers who bought recently sit in **active** and are never called.

**Connect a Shopify store in two minutes.** Paste a read-only Admin API token on the Connect store page and Dobara reads orders and deliveries, assigns every customer to a cohort, guesses their language from the shipping state, splits them into called and control groups, and detects reorders for the lift metric. A sync runs on demand and every morning at 09:00 IST on Vercel Cron. A built-in sample store (24 customers of a plant-protein brand) lets anyone try the flow without credentials.

There is also a **Talk to Dobara** page: the same agent over the browser microphone (WebRTC), so a judge or a brand lead can hear it without a phone.

## Stack

| Layer         | Choice                                                                                  | Why                                                                                                              |
| ------------- | --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Telephony     | **Plivo**, through Bolna                                                                | Buildathon partner. Bolna's shared +91 numbers are Plivo-hosted; a number you buy or link in Bolna is Plivo too. |
| Voice agent   | **Bolna** hosted API (`/v2/agent`, `/call`, `/web-call/session`, extractions, webhooks) | Orchestration, turn-taking, interruptions, multilingual switching, post-call extraction.                         |
| Speech        | **Sarvam** `saaras:v4` (STT) and `bulbul:v3` (TTS, voice Suhani)                        | Best Indic accuracy; on Bolna's flat-rate list.                                                                  |
| LLM           | OpenAI `gpt-4.1-mini` via Bolna                                                         | Flat-rate, low latency; a one-line change to swap.                                                               |
| Browser calls | `@bolna/web-call`                                                                       | WebRTC to the same agent; sessions minted server-side so the API key never reaches the browser.                  |
| App           | **Next.js 16** (App Router, TypeScript, Tailwind 4) on **Vercel**                       | Console, import, webhook receiver.                                                                               |
| Database      | **Postgres**: Neon via Vercel Marketplace in production, embedded PGlite locally        | Drizzle ORM; hand-written SQL migrations; same schema everywhere.                                                |

Everything brand-specific (prompt, extraction fields, transcription keywords) lives in [`bolna/`](bolna/).

## Quick start

```bash
pnpm install
cp .env.example .env.local        # fill BOLNA_API_KEY
pnpm db:migrate                   # creates the tables in the embedded database
pnpm bolna:me                     # checks the key, prints wallet balance
pnpm agent:sync                   # creates the agent + extraction fields on Bolna; paste BOLNA_AGENT_ID into .env.local
pnpm dev                          # http://localhost:3000
```

Then follow the **Getting started** checklist on the Overview: load the sample store with one click on **Connect store** (or paste a real Shopify token), add a number you can answer under **Import data → Add a test customer**, press **Call now** on **Customers** or open **Talk to Dobara** and speak to it in the browser, clear the follow-up it creates, and record a reorder to see the lift.

### Shopify

In the Shopify admin: Settings → Apps and sales channels → Develop apps → Create an app → Admin API scopes `read_orders` and `read_customers` → Install → copy the Admin API access token. Paste it on `/connect`. The token is encrypted at rest with `INTEGRATION_SECRET` (falls back to `WEBHOOK_SECRET`). Cohort rules live in [`src/lib/shopify/cohorts.ts`](src/lib/shopify/cohorts.ts); the sync in [`src/lib/shopify/sync.ts`](src/lib/shopify/sync.ts). Set `CRON_SECRET` on Vercel to enable the daily sync in [`vercel.json`](vercel.json).

### Webhooks

Bolna posts the full execution payload to `PUBLIC_BASE_URL/api/webhooks/bolna?token=WEBHOOK_SECRET` on every status change. Locally, expose the dev server with `ngrok http 3000`, put the ngrok URL in `PUBLIC_BASE_URL`, and run `pnpm agent:sync` again so the agent's webhook URL updates. Without a webhook the console polls Bolna for calls in flight, and every call has a **Refresh** button.

Bolna's webhook source IPs are 13.203.39.153, 13.126.9.249 and 13.202.133.53 if you need to allowlist.

### Database options

- **Local, zero setup (default):** `DATABASE_URL=pglite://.data/dobara` runs an embedded Postgres on disk. Only one process can open it at a time, so stop `pnpm dev` before `pnpm db:migrate` or `pnpm db:reset`. Stop it with Ctrl-C (the app checkpoints on SIGINT/SIGTERM); a hard kill can leave the directory unopenable, in which case delete `.data/dobara` and migrate again.
- **Any Postgres:** `DATABASE_URL=postgres://user:pass@host:5432/dobara`.
- **Neon (production):** `vercel link`, then `vercel integration add neon`, then `vercel env pull .env.local --yes`. The Neon HTTP driver is picked automatically when the URL contains `neon.tech`.

### Plivo: shared number or your own

- Default: leave `BOLNA_FROM_NUMBER` blank. Calls go out from Bolna's shared Plivo +91 number. No KYC, works immediately.
- Own number: buy a Plivo number inside Bolna (Indian compliance: CIN + GST), or link your Plivo account under Settings → Integrations in Bolna, then set `BOLNA_FROM_NUMBER`. Truecaller business verification is $20/month per number and lifts answer rates.

## How a call works

1. `POST /api/calls` with a `contactId` builds `user_data` (name, product, flavour, days since order, cohort, last call summary, offer) and calls Bolna `/call` with `agent_data.language` set to the customer's language.
2. Bolna dials over Plivo, runs the multilingual agent ([`bolna/agent.config.mjs`](bolna/agent.config.mjs), prompt in [`bolna/prompts.mjs`](bolna/prompts.mjs)), and after hangup runs one extraction pass with the twelve fields in [`bolna/dispositions.mjs`](bolna/dispositions.mjs).
3. The webhook (or a refresh) stores status, transcript, summary, extractions, recording URL and cost in `calls`.
4. On completion, [`applyExecution`](src/lib/calls.ts) writes the customer's memory (`contacts.last_summary`), sets `do_not_call` if asked, and creates **actions**: send the WhatsApp link, call back, CX follow-up, red flag.
5. Browser calls follow the same path: `POST /api/web-call/session` mints a two-minute, single-use session and registers the run id, so the webhook enriches it like any phone call.

## Experiment design

Imports and store syncs split phone numbers into **called** and **control** by a stable hash (default 70/30). Control customers can never be dialled from the app. Reorders are detected automatically on each store sync (a newer order than the one on file) or recorded by hand (Import data → Record reorders); both groups are matched the same way and the Insights page reports the difference in reorder rate as lift. Re-imports never move a customer between groups.

## Deploying

The production instance runs on Vercel with Neon Postgres from the Vercel Marketplace.

```bash
vercel link --project dobara
vercel integration add neon --name dobara-db --meta region=sin1 --meta auth=false --no-claim   # provisions Neon, sets DATABASE_URL
vercel env pull .env.vercel --environment=production --yes
node --env-file=.env.vercel scripts/migrate.mjs                                               # creates the tables on Neon
vercel env add BOLNA_API_KEY production   # and BOLNA_AGENT_ID, WEBHOOK_SECRET, INTEGRATION_SECRET, CRON_SECRET, DEMO_PASSWORD,
                                          # PUBLIC_BASE_URL, BRAND_NAME, OFFER_TEXT, REORDER_URL, DEFAULT_COUNTRY_CODE, INR_PER_USD
vercel deploy --prod
PUBLIC_BASE_URL=https://<your-domain> pnpm agent:sync                                           # points the Bolna webhook at production
DEMO_PASSWORD=... pnpm demo:seed -- --url https://<your-domain> --contacts "Name,phone,en;Name,phone,ta"
```

Notes:

- `DEMO_PASSWORD` turns on the password gate (`src/proxy.ts`). Every page and API asks for it once per browser; webhooks, cron and the sample store stay open because they carry their own secrets.
- Vercel's own Deployment Protection stays on for preview URLs. Attach a production domain (any `*.vercel.app` name you own works) so brands and Bolna's webhook reach the app without a Vercel account.
- `vercel.json` pins functions to `sin1`, next to the database, and schedules the daily store sync.
- The webhook URL lives on the Bolna agent, so one environment receives webhooks at a time. Local development falls back to polling and the Refresh button.

## Scripts

| Script                                         | What it does                                                                     |
| ---------------------------------------------- | -------------------------------------------------------------------------------- |
| `pnpm dev` / `pnpm build` / `pnpm start`       | Next.js                                                                          |
| `pnpm lint` / `pnpm typecheck` / `pnpm format` | ESLint, `tsc --noEmit`, Prettier                                                 |
| `pnpm db:migrate`                              | Applies `drizzle/*.sql` in order (idempotent)                                    |
| `pnpm db:reset`                                | Truncates all tables for a clean demo                                            |
| `pnpm agent:sync`                              | Creates or updates the Bolna agent, extraction category and fields from `bolna/` |
| `pnpm bolna:me`                                | Prints the Bolna account and wallet                                              |

CI (GitHub Actions) runs format check, lint, typecheck and build on every push and pull request.

## Repository layout

```
bolna/            agent config, prompt, extraction fields (brand-specific, synced to Bolna)
drizzle/          SQL migrations
scripts/          migrate, reset, agent sync, whoami (plain Node, no build step)
src/app/          console pages and API routes (App Router)
src/components/   UI primitives (components/ui) and feature components
src/db/           Drizzle schema and driver selection (PGlite, Neon, pg)
src/lib/          Bolna client, call lifecycle, insights, labels, formatting
src/lib/shopify/  Admin GraphQL client, cohort rules, sync, sample store
docs/             buildathon research, positioning, team, roadmap
```

## Security notes

- The Bolna API key lives only in `.env.local` (git-ignored) and on the server. Browser calls use short-lived sessions minted by `/api/web-call/session`; recordings are proxied through `/api/recordings/[id]`.
- The webhook rejects requests without the shared `token`.
- Customer data stays in your Postgres. Nothing is sent anywhere except Bolna (to place the call) and WhatsApp (by a team member, from the Actions page).

## Roadmap

See [docs/ROADMAP.md](docs/ROADMAP.md) for what we would build next and why.
