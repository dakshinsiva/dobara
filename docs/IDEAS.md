# Ideas for Dakshin × Chiranjeevi, and what can ship by Oct 31

Clean slate, Oct 25, 2026. Six days to the deadline. Judged mainly on market potential (per Tanisha, Bolna). Every idea below assumes one engineer building on Bolna and one operator with access to Cosmix's customers and ops.

---

## The five ideas

| # | Idea | One line | Market potential | Ship by Oct 31 | Why this team |
| --- | --- | --- | --- | --- | --- |
| 1 | **Reorder calls** (recommended) | Call customers when their tub runs low, handle why they'd lapse, send a reorder link; measure lift against an uncalled control group | Every D2C brand with repeat purchases; retention is the unsolved half of D2C | Yes | Chiranjeevi owns the customer list and the retention problem; a revenue number is the only result a six-day build can produce |
| 2 | **Voice of customer** | Call 100 customers with open-ended questions on flavour, usage and what they'd change; synthesise themes for product and ops decisions | Consumer research is a large, slow, expensive industry; AI interviews in Indian languages at about ₹30 each replace ₹1,500 agency interviews | Yes | He launched 25+ products at Yogabar; he knows what a product team pays for this |
| 3 | **RTO shield** (do not submit) | Cash-on-delivery confirmation, address check and failed-delivery rescue calls | Large and real, but COD confirmation is a Bolna template and SquadStack sells it at scale; judges see it weekly | Yes, fastest | He cut RTO for a ₹300 crore brand at xto10x, but it reads as a template, so it is off the table |
| 4 | **Talk to a nutritionist now** | A web-call button on the product quiz and product pages that recommends the right protein and answers "will it bloat me" in the customer's language | Conversion on every D2C site; a voice layer on an existing app, which Bolna's own examples name | Partly; needs Web Call SDK access from Bolna | Cosmix already has a quiz and no human support channel visible |
| 5 | **Ops chaser** | An agent that phones courier hubs and 3PLs about stuck shipments and suppliers about late POs, and logs the answers | Novel and genuinely useful to ops heads | Risky; needs 3PL contacts and hard to demo | He ran last mile at Rivigo and knows who picks up at a hub |

**Recommendation:** build 1 and fold in 2. The same call asks the reorder questions and two open-ended ones; the same extraction produces reorder intent and churn reasons. One build, two stories: revenue lift for the brand, and product insight for the ops head. Positioning, name and the market story are in POSITIONING.md. The fallback is the same engine on Diet Mojo's clients, never a COD or cart agent, which are Bolna templates.

---

## What Dakshin can deliver by Oct 31

**In scope, in this order**

1. **Bolna agent** (Oct 26 to 27): one multilingual agent (English, Hindi, Kannada, Tamil via Sarvam), dynamic variables per customer (name, product, flavour, days since order), a knowledge base of approved usage tips and FAQs, disclosure that it is an AI, "don't call me" honoured on the spot, calling hours enforced.
2. **Cohort pipeline** (Oct 26): a script that takes Cosmix's export, splits called and control groups, and feeds Bolna batches with retries.
3. **Extractions and storage** (Oct 27): structured fields per call: reached, usage, satisfaction, issue, flavour feedback, churn reason, reorder intent, open quotes.
4. **WhatsApp follow-up** (Oct 27 to 28): reorder link with a cohort code sent after the call. Through Bolna's AiSensy workflow node if Cosmix has an AiSensy account; otherwise a manual send from Cosmix's WhatsApp Business number using a CSV I generate.
5. **Results page** (Oct 28 to 30): answer rate, satisfaction, reorders against control, top churn reasons, call recordings for review. Next.js on Vercel.
6. **Submission assets** (Oct 30 to 31): public GitHub repo with README, a 2 to 3 minute video with one consented real call, the description.

**Out of scope, and why**

- Inbound calls on an Indian number: needs CIN and GST compliance approval, which takes longer than six days.
- Calling on WhatsApp instead of the phone: Meta's calling API exists for India, but Bolna doesn't document a bridge; not in six days.
- Navigating IVRs or pressing keys on outbound calls: Bolna has no documented outbound DTMF, so idea 5 cannot reach hub IVRs.
- Any custom speech or language model: Bolna plus Sarvam is the stack; the edge is the customer list and the metric.
- A polished mobile app or multi-brand dashboard: one results page is enough for the submission.

**Numbers to expect**

- 150 to 300 calls over Oct 28 to 29, two minutes each.
- Budget about ₹30 per customer reached including retries; about ₹10,000 for the pilot, covered by buildathon credits or a $100 top-up.
- A readout by Oct 30 with a one-week reorder window. Early signal, not proof; present it that way.

---

## What Chiranjeevi needs to deliver

| By | Item |
| --- | --- |
| Oct 25 | Go or no-go, and who signs off: founders or Marico |
| Oct 26 | Export of about 300 customers across the three cohorts (new, running low, lapsed): name, phone, language, product, flavour, order date |
| Oct 26 | Approved usage tips, FAQs and claims the agent may make; the reorder discount and code |
| Oct 27 to 29 | Listen to 20 calls a day and correct product facts; log churn reasons |
| Oct 29 to 30 | Reorder data from the store for called and control groups |
| Oct 30 | The market slide: Cosmix's numbers, D2C repeat-rate benchmarks, who pays and how much, the next two brands |

---

## More ideas in Chiranjeevi's field: operations

Added Oct 25. His profile covers procurement (RM and PM sourcing), 3PL and last mile, S&OP and inventory, warehousing productivity, returns and RTO, new product launches, exports, and shop-floor tools. Each idea below is a voice agent that does the chasing an ops team does by phone and WhatsApp today. None is a Bolna template.

| # | Idea | One line | Buyer and market | Template overlap | Ship by Oct 31 | Verdict |
| --- | --- | --- | --- | --- | --- | --- |
| A | **Supplier chaser** | Calls raw-material, packaging and co-packer suppliers about open POs: confirmed, dispatched, delayed, new date, reason; logs it and escalates | Ops and procurement heads at ₹50 to ₹500 crore brands; procurement suites (Microsoft Dynamics, Spendflo) do this by email, and no voice agent was found; Indian suppliers answer phones, not email | None | Yes, if Cosmix shares an open-PO list; Cosmix manufactures in-house so it has suppliers | Best ops idea. Start with the long tail of suppliers, not the top ten relationships |
| B | **Exception control tower** | Any breach (shipment stuck at a hub, late PO, SLA miss) triggers a call to the responsible person, who gives a reason and an ETA that lands on one board | Every ops team; the generalisation of A | None | Partly; works for named contacts (3PL account managers, supervisors), not hub IVRs, since Bolna has no outbound keypad | Frame A as the first module of this |
| C | **Shift report by voice** | A scheduled call to each warehouse or packing supervisor at shift end, in Kannada or Hindi: orders packed, pending, stockouts, damages, manpower; straight to a dashboard | Lakhs of MSME warehouses and factories where nobody fills forms; the AB InBev digital operator workstation reborn as a phone call | None | Yes, with three to five supervisors at Cosmix's facility or its 3PL | Strong second choice; the value shows over weeks, so a one-week pilot proves the mechanism, not the saving |
| D | **Demand sensing for S&OP** | Weekly calls to distributors and retailers: sell-out, stock on hand, next week's need; feeds the forecast | FMCG general trade at Marico scale; he set up S&OP for a ₹400 crore brand (+15% fill rate) | None | No; Cosmix has no general trade. Needs Marico or an xto10x client | Later, through the Marico relationship |
| E | **Voice ordering for general trade** | Retailers restock by voice in their language; the order lands in the distributor's system | 12 million kirana stores; Flipkart and Sarvam launched voice wholesale ordering on WhatsApp in 2026, which validates the channel; Kavana (YC S25) sells an AI sales rep for distributors (unverified here) | None, but crowded | No; needs an inbound number and a distributor | Later |
| F | **Returns and delivery intelligence** | Calls customers after a return, RTO or damaged delivery, captures the reason, starts the replacement or refund on the call, and scores the courier | Feeds his returns-reduction and 3PL rate-card work; every D2C brand | Borderline: looks like the Surveys template unless the call closes the loop | Yes, with Cosmix's returns list | Only as a cohort inside Dobara, never standalone |
| G | **Field staff daily check-in** | Riders and field technicians confirm shift, vehicle and incidents by a call | Logistics fleets; SquadStack already runs rider hiring, and Bolna has recruitment and onboarding templates nearby | Adjacent | Yes | Skip; too close to templates and to SquadStack |

**How this fits with Dobara.** Dobara talks to the brand's customers; A and C talk to the brand's suppliers and staff. Same engine (outbound, multilingual, structured extraction, one dashboard), different phone lists. Do not build both before Oct 31. If Chiranjeevi would rather pitch an ops product than retention, A is the pick: it needs only an open-PO list, no customer data, and no Marico approval on consumer privacy. The market story is then "the ops team's chasing, done by an agent", and the judges have not seen it.

**What A needs from Cosmix:** a list of 30 to 50 open or recently late POs with supplier name, phone, item and due date; permission to call the long-tail suppliers; one ops person to review the first ten calls.

### Ops chaser: market size and YC fit (Oct 25)

**Market, bottom-up for India.** The buyer is any enterprise with a procurement or ops function that chases suppliers and transporters by phone. Udyam counts [5.4 lakh small and 41,722 medium enterprises](https://morungexpress.com/46248-registered-msme-units-in-nagaland) (Rajya Sabha answer, July 2026); about one in five registered MSMEs is a manufacturer, so roughly 1.2 lakh small and medium manufacturers have a purchasing desk, plus a few thousand consumer brands and large enterprises with hundreds of suppliers each. The spend being replaced is labour, not software: a purchase executive or ops coordinator costs ₹3 to ₹5 lakh a year and spends a large part of the day chasing. If an agent takes over half of one such role per site, at ₹1.5 to ₹2.5 lakh a year per site, the India serviceable market is about ₹2,000 to ₹3,000 crore ($220M to $330M) a year, before large enterprises. Price it at ₹15,000 to ₹30,000 a month per site, or per delay caught early, never per minute.

**Market, global comps.** Procurement software is [$8 to $10 billion in 2025](https://www.gminsights.com/industry-analysis/procurement-software-market), heading to $17 to $21 billion by 2034, but the services budget behind it is far larger, which is why the strongest comps sell a "digital workforce", not a suite. [HappyRobot](https://www.staffingindustry.com/news/global-daily-news/happyrobot-lands-44m-funding-round-for-digital-workforce) makes the phone calls freight operators make, raised a $44M Series B in September 2025 at a reported $500M valuation, and has 70+ enterprise customers including DHL, Ryder and Flexport. Three YC companies do the same job for US freight brokers: [FleetWorks](https://ycombinator.com/companies/fleetworks) ($17M Series A, October 2025, 40+ brokerages), [Vooma](https://ycombinator.com/companies/vooma) ($16.6M seed and Series A) and Lanesurf (tens of thousands of carrier calls a month). On the procurement side, Microsoft's Dynamics supplier-communications agent and Spendflo's expediting agent work by email; [Comena](https://www.ycombinator.com/companies/industry/procurement) (YC S25) and Corvera (YC W26) read purchase orders from email into ERPs. Nobody found makes the supplier call by voice, and in India the supplier answers the phone, not the email.

**YC fit.** This idea hits more current requests than Dobara does.

| Request | Batch | Fit | Why |
| --- | --- | --- | --- |
| New Operating Systems for the Physical World (Charlie Warren) | Fall 2026 | Strong partial | "Route and track work across agents, robots and humans" in maintenance and fleet operations; the exception control tower is that for a brand's supply chain |
| Multiplayer AI (Aaron Epstein) | Fall 2026 | Partial | The ops team watches the chasing, redirects and hands off |
| Modernizing American Manufacturing | Spring 2026 | Direct in kind, wrong geography | Agents for real-time supply chain management; the same ask for Indian manufacturing, where the phone is the system of record |
| AI-Native Service Companies | Spring and Summer 2026 | Direct | Sell the chasing done, priced per site or per delay caught, against the coordinator's salary |
| Supply Chain 2.0 and Hardware Supply Chain | Summer 2026 | Partial | Multi-tier supplier visibility; the agent is how visibility gets collected from suppliers who have no portal |
| Company Brain | Summer 2026 | Partial | Supplier reliability history becomes the brand's context layer |
| Voice AI and Full-stack AI Companies | Summer 2025 | Direct | The phone-call thesis and the AI-staffed operations team |
| Aging population, Proving You're Human, the rest | Fall 2026 | None | Do not stretch |

The YC portfolio pattern matters as much as the RFS text: partners have backed "agents that make the calls ops people make" three times in logistics. An Indian supply-chain version with a Marico-backed brand as the first customer is a story they already understand.

**What the six-day pilot can prove.** Not on-time delivery, which moves over months. It can prove: share of open POs with a confirmed date within 24 hours of the call, delays discovered and how many days early, hours of coordinator time saved (from the ops team's own log), supplier reaction, and cost per PO chased against the coordinator's hourly cost. State these as the metrics up front so nobody expects a revenue number.

**Dobara against the ops chaser**

| | Dobara (retention calls) | Ops chaser (supplier and 3PL calls) |
| --- | --- | --- |
| India serviceable market | ₹4,200 to ₹8,400 crore consumer, plus B2B channels | ₹2,000 to ₹3,000 crore, plus large enterprises |
| Global comp | Klaviyo ($1.23B revenue) as the retention layer; voice is India's version | HappyRobot ($500M), FleetWorks, Vooma, Lanesurf: the calling pattern, funded repeatedly |
| Current YC RFS hits | Three direct (older lists), five partial, none in Fall 2026 | Two Fall 2026 partials, one Spring 2026 direct in kind, four more partials |
| Proof in six days | Reorder lift against control, a revenue number | Hours saved and delays caught early, a time number |
| Approvals needed | Customer phone numbers; Marico privacy sign-off | An open-PO list; far easier |
| Template risk | Low | None |
| Stage demo | A customer call the room can feel | A supplier call the ops judges will respect |
| Chiranjeevi's ownership | Retention economics, churn loop | His whole career |

**Decision.** Let Cosmix's data access decide by Oct 26. If customer numbers are approved, build Dobara and name the supplier chaser as the second module. If only the PO list is approved, build the chaser and name retention as the second module. Either way the pitch is one engine on both sides of the brand: customers and suppliers.

**Description for the form if the chaser is chosen (under 200 characters):**

> An agent that phones a brand's suppliers and 3PLs about every open PO and stuck shipment, logs the ETA and reason, and escalates. Live with Cosmix (₹100 Cr ARR) this week.

## Decision rules

- If Cosmix cannot export data by Oct 26 or approve anything by Oct 27, run idea 1 on Diet Mojo's clients instead; Chiranjeevi still owns the market slide.
- Never fall back to COD confirmation, cart recovery or a support bot: those are Bolna templates and the judges see them weekly.
- Do not add a fourth cohort, a second language model, or a second brand before the readout exists.
