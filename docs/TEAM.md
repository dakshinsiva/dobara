# Team: Dakshin × Chiranjeevi

Why this team can reach the interview stage of the Bolna Buildathon, and how we use the six days left.

Written Oct 25, 2026. Submission closes Oct 31. Shortlist Nov 3. Interviews Nov 5 to 7. Finale Nov 20.

---

## 1. What the organiser told us (Tanisha, Bolna, Oct 25)

| Question | Answer |
| --- | --- |
| What to submit | A demo or GitHub link, plus a demo video |
| Where | The Submissions section in the buildathon page navbar |
| Description length | No limit, but keep it short |
| What is judged most | **Market potential**, above working demo and technical depth |
| Edits after Oct 31 | No |

**What this means for us.** The shortlist is decided from a short description, one link and one video, judged mainly on market potential. So the video must sell a market and a wedge, the demo must prove we can reach that market, and the team must look like the people who would win it. Technical depth is table stakes, not the prize.

---

## 2. The team story in one paragraph

Chiranjeevi has spent six years inside Indian consumer supply chains cutting cost and churn: last mile at Rivigo, new products and inventory at Yogabar, margin and RTO programs for ₹200 to ₹400 crore brands at xto10x, and now operations at Cosmix, a profitable ₹51 crore nutrition brand that Marico bought into this year. Dakshin builds software and data systems, most recently at two YC companies, Coinbase and Cypher, and is now building Nexus, an AI-native CA firm. Together we are putting a voice agent on the part of D2C that nobody has automated: keeping the customer after the first order, starting with Cosmix's own buyers this week.

---

## 3. Chiranjeevi: what he brings

Source: his LinkedIn profile, read Oct 25.

| Role | What he did | Why it matters for this buildathon |
| --- | --- | --- |
| **Head of Operations, Cosmix** (Apr 2026 to now) | Runs operations at a ₹50.9 crore (FY25) bootstrapped, profitable plant-protein brand, 60% owned by Marico since 2026, claiming ₹100 crore ARR | Design partner with real customers and real order data. Knows who signs off on a pilot. The brand's name on the video is itself a market signal. |
| **Management Consultant, xto10x** (Jan 2025 to Apr 2026) | 5% CM1 improvement for a ₹300 crore fashion brand through RTO reduction, returns reduction, 3PL rate cards, packaging and warehouse productivity. Set up S&OP for a ₹400 crore sports brand (+15% fill rate). Built a 12% gross-margin playbook for a ₹200 crore skincare brand. Cost roadmaps for three UAE startups. | He has personally quantified the numbers judges will ask about: RTO, returns, contribution margin, cost per order. xto10x's client list is customers two through ten. |
| **Program Manager, COO's office, Yogabar** (Jun 2023 to Jan 2025) | Launched 25+ products in 14 months (35% revenue uplift). Built a gifting vertical from zero to ₹2.5 crore in six months. Managed 100+ SKUs across 20 warehouses during 20% monthly growth. Ran exports worth ₹2.4 crore a year. | Zero-to-one inside a consumer nutrition company. Knows the repeat-purchase problem from the inside. |
| **Lead, Last Mile and Ops Excellence, Rivigo** (Dec 2021 to Jun 2023) | Led a ₹72 crore last-mile function, cut cost per kg 5%, shipped five-plus tech features with the product team, ran national programs across 17 states and 1,500 people, piloted EV delivery. | Has been the operator voice inside a product team before. Comfortable turning field problems into software requirements. |
| **Process Engineer and Supply trainee, AB InBev** (Oct 2020 to Dec 2021) | Built a digital operator workstation that cut frontline non-value-adding work 30%; led an RFID warehouse system; acted as internal product manager for shop-floor mobile tools. | Builds tools for frontline people, which is what a calling agent is. |
| Background | BITS Pilani B.E. (2019). NTSE scholar. School topper. English, Hindi and two more languages. | Credibility with the judges, who sell to exactly his profile: General Catalyst, Upekkha, Plivo and Exotel founders. |

**What he covers on the rubric.** Market potential (he can size and defend the market from inside a brand), buyer credibility (he is the buyer persona), distribution (xto10x and Marico networks), and design-partner access (Cosmix).

---

## 4. Dakshin: what I bring

**Confirmed from this project so far:** based in Chennai; building Nexus, an AI-native chartered accountancy firm; previously Data and SWE roles at Coinbase and Cypher (both YC) in the Bay Area.

**How that maps to the build**

| Build component | What it needs | Fit |
| --- | --- | --- |
| Bolna voice agent | Prompt design, multilingual config (Sarvam STT and TTS), dynamic variables per customer, post-call extractions, webhooks. No custom ML. | Configuration and prompt engineering on a documented platform; a strong engineer learns it in a day. |
| Customer data and experiment | Export and clean the customer list, split called and control cohorts, define the readout (answer rate, reorder rate, churn reasons), compute lift. | Data engineering and analysis is the core of the past roles. This is the part most hackathon teams skip and the part the judges will respect. |
| Backend and dashboard | Webhook receiver, storage, a results page, WhatsApp reorder links with cohort codes. Next.js on Vercel. | Standard SWE work. |
| Shipping under a deadline | Six days from zero to live calls. | Two YC companies is the right reference: speed over polish, real users over demos. |

**To fill in before the submission** (do not leave these generic, and do not claim what is not true):

- [ ] Production stack and languages you have shipped in (for example: Python, TypeScript, SQL, data pipelines at what scale).
- [ ] One concrete thing you built at Coinbase and one at Cypher, each with a number (users, data volume, latency, money moved).
- [ ] Anything you have built with LLM or speech APIs before this.
- [ ] Nexus: what it does, whether it has users or revenue.

**Honesty note.** If this is your first voice agent, say so. "First voice agent, live with a ₹100 crore brand's customers six days after starting, built on Bolna" is a better story than vague voice-AI experience, and it is exactly the kind of speed YC partners like Grey Baker respond to.

---

## 5. Why this pairing is the pitch

- **Founder-market fit the judges can verify.** One of us has run the P&L levers of Indian D2C; the other has shipped at YC companies. Neither needs the other to explain the problem or the code.
- **Real users on day one.** Cosmix's customers, with Chiranjeevi's sign-off path. Most teams will submit a demo with no users.
- **A number, not a demo.** A called cohort against an uncalled control group gives a reorder-rate lift by Oct 30. Market potential plus proof is the combination Tanisha's answer points at.
- **Distribution after the buildathon.** xto10x clients, Marico's portfolio, and the nutrition practices (Diet Mojo) already lined up for the same engine.

---

## 6. Division of work, Oct 25 to 31

| Day | Dakshin | Chiranjeevi |
| --- | --- | --- |
| Oct 25 | Agree scope; set up Bolna, Sarvam, Vercel; request buildathon credits | Get go or no-go and the sign-off path at Cosmix (founders or Marico); pick the three cohorts |
| Oct 26 | Write the agent prompt, extraction schema, and reorder-link flow | Export 300 customers (name, phone, language, product, flavour, order date); write the usage FAQ and approved claims; split called and control groups |
| Oct 27 | Agent v0 live; test on both of us and family; fix turn-taking and language | Review transcripts; correct product facts; set calling hours and the "do not call" rule |
| Oct 28 to 29 | Run 150 calls; fix the prompt every evening; build the results page | Listen to 20 calls a day; log churn reasons; chase reorder data from the store |
| Oct 30 | Compute readout: answer rate, satisfaction, reorders against control, top issues; record the video with one consented real call | Write the market slide: Cosmix numbers, D2C repeat-rate benchmarks, who pays and how much |
| Oct 31 | Submit before noon | Final check of claims and numbers |

---

## 7. Gaps and how we cover them

| Gap | Cover |
| --- | --- |
| Neither of us has shipped a voice product | Bolna handles telephony, speech and turn-taking. Our edge is the customer list and the metric, not the audio stack. Say this plainly. |
| Marico compliance on customer data | Run the agent on Cosmix's own Bolna account so data never leaves Cosmix, or sign a one-page NDA. Ask on Oct 25, not Oct 28. |
| Small sample and short reorder window | Present it as a first readout plus ranked churn reasons, and show the pipeline is ready to scale. Do not overclaim. |
| No designer | A phone-shot video with real call audio and a clean results page beats polish. |
| Only one brand | Name the next two: a nutrition practice already agreed (Diet Mojo) and an xto10x client Chiranjeevi can introduce. |
| Fallback if Cosmix cannot move by Oct 27 | Same engine on Diet Mojo's clients; Chiranjeevi still owns the market slide. |

---

## 8. Submission copy

**Description (under 200 characters):**

> A voice agent that calls a D2C brand's customers when their protein runs low, handles why they'd lapse, and sends a reorder link. Live with Cosmix, a ₹100 Cr nutrition brand, this week.

**Team line for the video and deck:**

> Chiranjeevi Vijayaraghavan, Head of Operations at Cosmix; earlier xto10x, Yogabar, Rivigo, AB InBev; BITS Pilani. Dakshin, Data and SWE at Coinbase and Cypher (YC), building Nexus.

**Video, 2 to 3 minutes:**

1. 20s. The problem from inside a brand: Indian D2C supplement brands see 10% to 30% repeat rates and spend a quarter of revenue on ads to replace the customers they lose. Chiranjeevi says this on camera.
2. 60s. One real, consented call, subtitled: the agent asks how the customer is using the product, handles an objection, sends the reorder link.
3. 40s. Results page: calls made, answer rate, reorders against control, top three churn reasons.
4. 30s. Market: every D2C brand with repeat purchases, then coaching and nutrition practices on the same engine; who pays and how much.
5. 20s. Team and what we do next.

---

## 9. Interview prep (Nov 5 to 7): who answers what

| Likely question | Owner | One-line answer to prepare |
| --- | --- | --- |
| Who pays, and how much | Chiranjeevi | The brand, per reorder or per month; anchor on what Cosmix spends on ads per customer |
| What happened on the calls | Dakshin | Answer rate, what customers said, what we changed in the prompt |
| Why not SquadStack or a Bolna template | Both | They sell outbound minutes; we sell a measured retention lift with churn reasons that feed product and ops |
| How big is the market | Chiranjeevi | Bottom-up from Indian D2C order volumes and repeat rates, then coaching and nutrition practices |
| What breaks at scale | Dakshin | Consent and calling rules, number reputation, data residency inside the brand's account |
| Why you two | Both | Operator who has run these P&Ls plus an engineer who shipped at YC companies; real users in week one |
| What's next | Both | Three brands by December; a self-serve version for solo nutritionists |

---

## 10. Checklist before Oct 31

- [ ] Chiranjeevi's go or no-go, and who signs off, by Oct 26
- [ ] Customer export with a control group by Oct 26
- [ ] Agent live and tested on ourselves by Oct 27
- [ ] 150 calls made by Oct 29
- [ ] Readout computed by Oct 30
- [ ] Video recorded with a consented real call by Oct 30
- [ ] GitHub repo public with README (architecture, how to run, Bolna features used)
- [ ] Dakshin's section 4 filled in with real specifics
- [ ] Description, link and video submitted before noon on Oct 31
