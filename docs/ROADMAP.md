# Dobara roadmap

What is shipped, what would create the most value next, and why. Ordered by (market potential × feasibility), which is how the buildathon is judged and how a brand would buy.

## Shipped (October 2026)

- Retention agent on Bolna + Plivo + Sarvam, four languages, three cohorts, one prompt
- Customer memory across calls; twelve structured extractions per call
- Console for brand teams: overview, customers, calls, call detail, action queue, insights, agent page
- Follow-up actions with WhatsApp deep links (message pre-filled, one tap to send)
- Called vs control split and reorder-lift measurement
- Cohort campaigns with calling-hour guardrails and retries
- Browser calls (WebRTC) to the same agent for demos and QA
- Shopify connection: paste a read-only token, cohorts build themselves from orders and deliveries, reorders detected automatically, daily sync on Vercel Cron, built-in sample store

## Next, in order

### 1. Close the loop on WhatsApp automatically

Send the reorder link and offer code the moment a customer agrees (Bolna Workflows → AiSensy, Interakt or Gupshup), track the click and the order. Today a person presses send. **Why first:** it turns intent into revenue with no human in the loop, which is the number a brand pays for. **Cost:** template approval takes 2 to 3 days; one webhook and one table.

### 2. Plug into the order system

Pull orders and delivery events from Shopify, Shiprocket or Unicommerce so cohorts build themselves: _new_ on delivery + 4 days, _running low_ from product cadence, _lapsed_ at 60 days. Replaces CSV import. **Why:** "install in ten minutes" is the difference between a pilot and a product. **Cost:** one integration per platform; Shopify first (most D2C brands).

### 3. Replenishment timing model

Per product, combine serving size with the usage and stock answers from calls to predict each customer's run-out date, and call 3 to 5 days before. **Why:** timing is the whole game in replenishment; the agent's own answers are the training signal, so accuracy improves with every call. This is the flywheel.

### 4. Revenue attribution, not just intent

Import order values so lift is reported in rupees retained per rupee spent on calls, by cohort, flavour and language. Exportable for finance. **Why:** a Marico-owned brand buys on a CFO number, not a reorder percentage.

### 5. Scheduled daily campaigns

A cron that picks cohorts each morning, respects DND and opt-outs, retries no-answers once, and caps spend. Uses Bolna batches and calling-hour guardrails. **Why:** removes the last manual step.

### 6. Consent and compliance layer

TRAI DND scrubbing, opt-out registry shared across brands, recording consent line, retention policy, Truecaller verified caller ID. **Why:** required for any enterprise procurement and lifts answer rates.

### 7. Multi-brand workspaces, roles and audit log

Brand admin, CX agent, read-only finance; who did what, when. **Why:** second brand onboarding and enterprise security reviews.

### 8. Human handoff

Live transfer to the CX desk on "angry" or "health complaint", or a warm callback booked on the call. **Why:** the red flags that matter most deserve a person within minutes.

### 9. Voice QA harness

Simulated customers (an LLM playing a lapsed Tamil speaker, an interrupting Hindi speaker) run against every prompt change; latency, interruption and extraction accuracy tracked per release. **Why:** brands will ask "how do you know it won't say something wrong", and the honest answer is a test suite.

### 10. Reorder inside the call

Apply the coupon and place a cash-on-delivery reorder during the conversation through the commerce API. **Why:** removes the WhatsApp step entirely for customers who say yes.

### 11. Inbound line with memory

Customers who call back reach Dobara, which already knows them. Needs an owned Indian number (CIN + GST compliance in Bolna).

### 12. Second vertical: nutritionist check-ins

The same engine, prompt swapped, for a clinic's weekly client calls (Diet Mojo as design partner). **Why:** proves the engine generalises beyond D2C without changing the product.

## What we would show a judge or a brand

1. The browser call: the agent greets by name, remembers the last call, switches language, refuses medical advice, lands a WhatsApp link in the action queue thirty seconds after hangup.
2. The lift card: called vs control, with real reorders recorded.
3. The insights page: what customers would change, in their words, by flavour.
