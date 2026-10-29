# Dobara

Retention calls for consumer brands. A voice agent calls a brand's customers after delivery, in their language, remembers every past call, handles why they'd lapse, and reports reorder intent against an uncalled control group.

Built for the Bolna Buildathon at Symphony 2026.

## Stack

| Layer | Choice | Why |
| --- | --- | --- |
| Telephony | **Plivo**, through Bolna | Buildathon partner. Bolna's shared +91 numbers are Plivo-hosted; a number you buy or link in Bolna is Plivo too. |
| Voice agent | **Bolna** hosted API (`/v2/agent`, `/call`, extractions, webhooks) | Orchestration, turn-taking, interruptions, multilingual switching, post-call extraction. |
| Speech | **Sarvam** `saaras:v4` (STT) and `bulbul` (TTS) | Best Indic accuracy; on Bolna's flat-rate list. English, Hindi, Kannada, Tamil with auto switching. |
| LLM | OpenAI `gpt-4.1-mini` via Bolna | Flat-rate, low latency; GPT-5 variants are a one-line change. |
| App | **Next.js 16** (App Router, TypeScript, Tailwind 4) on **Vercel** | Dashboard, import, webhook receiver. |
| Database | **Postgres**: Neon via Vercel Marketplace in production, embedded PGlite locally | Drizzle ORM; hand-written SQL migration; same schema everywhere. |

Everything brand-specific (prompt, extractions, keywords) lives in `bolna/`.

## Setup

```bash
pnpm install
cp .env.example .env.local      # fill BOLNA_API_KEY and DATABASE_URL
pnpm db:migrate                 # creates contacts and calls tables
pnpm bolna:me                   # checks the API key, prints wallet balance
pnpm agent:sync                 # creates the agent + extractions on Bolna; paste BOLNA_AGENT_ID into .env.local
pnpm dev                        # http://localhost:3000
```

Then open **Import contacts**, paste a CSV starting with your own number, go back to the dashboard and press **Call now**.

### Database options

- **Local, zero setup (default):** `DATABASE_URL=pglite://.data/dobara` runs an embedded Postgres (PGlite) on disk. Nothing to install. Only one process can open it at a time, so stop `pnpm dev` before running `pnpm db:migrate`.
- **Local Postgres or Docker:** `DATABASE_URL=postgres://postgres:dobara@localhost:5432/dobara` (for example `docker run -d --name dobara-pg -e POSTGRES_PASSWORD=dobara -e POSTGRES_DB=dobara -p 5432:5432 postgres:16-alpine`).
- **Neon (production):** `vercel link`, then `vercel integration add neon`, then `vercel env pull .env.local --yes`. The app uses Neon's HTTP driver automatically when the URL contains `neon.tech`.

### Webhooks

Bolna posts the full execution payload to `PUBLIC_BASE_URL/api/webhooks/bolna?token=WEBHOOK_SECRET` on every status change. Locally, expose the dev server with `ngrok http 3000`, put the ngrok URL in `PUBLIC_BASE_URL`, and run `pnpm agent:sync` again so the agent's webhook URL updates. Without a webhook, the **Refresh** button on each call pulls the execution from Bolna.

Bolna's webhook source IPs are 13.203.39.153, 13.126.9.249 and 13.202.133.53 if you ever need to allowlist.

### Plivo: shared number vs your own

- Default: leave `BOLNA_FROM_NUMBER` blank. Calls go out from Bolna's shared Plivo +91 number. No KYC, works immediately.
- Own number: buy a Plivo number inside Bolna (needs the Indian compliance application: CIN + GST), or link your own Plivo account under Settings → Integrations in the Bolna dashboard. Then set `BOLNA_FROM_NUMBER`. Truecaller business verification is $20/month per number.

## How a call works

1. `POST /api/calls` with a `contactId` builds `user_data` (name, product, flavour, days since order, cohort, last call summary, offer) and calls Bolna `/call` with `agent_data.language` set to the contact's language.
2. Bolna dials over Plivo, runs the multilingual agent (`bolna/agent.config.mjs`, prompt in `bolna/prompts.mjs`), and after hangup runs one extraction pass with the dispositions in `bolna/dispositions.mjs`.
3. The webhook (or Refresh) stores status, transcript, summary, extractions, recording URL and cost in `calls`.
4. On `completed`, the contact's `last_summary` is updated from the "Next call summary" extraction so the next call opens with memory. "Do not call" flags and callback requests land in `notes`.

## Experiment design

Imports split phones into `called` and `control` groups by a stable hash (default 70/30). Control contacts can never be dialled from the app. Compare reorders between the groups over the same window to measure lift.

## Scripts

| Script | What it does |
| --- | --- |
| `pnpm db:migrate` | Applies `drizzle/*.sql` (idempotent) |
| `pnpm agent:sync` | Creates or updates the Bolna agent and its extraction category + dispositions |
| `pnpm bolna:me` | Verifies the API key |
| `pnpm typecheck` / `pnpm lint` | TypeScript and ESLint |

## Layout

```
bolna/            agent config, prompt, dispositions (brand-specific, no secrets)
drizzle/          SQL migrations
scripts/          node scripts (no build step; Node 22 --env-file)
src/db/           Drizzle schema and lazy client (Neon HTTP or pg)
src/lib/          Bolna client, call orchestration, env helpers
src/app/          dashboard, import page, call detail, API routes
docs/             research, positioning, team notes
```
