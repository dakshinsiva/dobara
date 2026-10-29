# Dobara: demo, submission and interview playbook

Deadline: Friday 31 October 2026. Shortlist 3 November. Interviews 5 to 7 November. Finale 20 November, Bengaluru.

---

## 1. Before you demo: a five-minute checklist

| Check                                             | How                                                                                                           |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Bolna wallet topped up                            | platform.bolna.ai → Billing. Any top-up moves the account off trial, so real customer numbers can be dialled. |
| Agent synced to the current webhook               | `pnpm agent:sync` after any ngrok restart, or after deploying to Vercel with `PUBLIC_BASE_URL` set            |
| Sample store connected and synced                 | /connect → Try the sample store → Connect → Sync now                                                          |
| Your own number in the workspace with a past call | Customers → Dakshin shows a memory summary                                                                    |
| Phone on the table, ringer on                     | The agent calls from a +91 80357 number                                                                       |
| Browser microphone allowed on the site            | Needed for Talk to Dobara                                                                                     |
| Backup recording ready                            | /calls → the 27 Oct call → play                                                                               |

If anything fails on the phone path, switch to **Talk to Dobara** in the browser. It is the same agent.

---

## 2. Live demo script (six minutes)

**0:00 Overview.** "This is Cosmix's retention workspace. Twenty-five customers, nineteen in the called group, six held out as control. One open action, one conversation so far." Point at the cohort cards: new, running low, lapsed.

**0:30 Connect store.** Open /connect. "Onboarding is one token. The brand creates a read-only app in Shopify admin and pastes the key here." Press **Sync now**. Read the result aloud: "Thirty-nine orders, twenty-four customers: four new, eight running low, six lapsed, six active and not due. Language guessed from the shipping state. Called and control assigned by a stable hash." For Cosmix this is the same screen with their token.

**1:15 Customers.** Filter **Running low**. "These are the people about to run out. Dobara calls them at 80% of the days a tub lasts. The control group never gets called, so we can measure lift honestly." Show the memory column on your own row: "Dobara remembers the last call."

**1:45 The call.** Press **Call now** on your own number. Let the room hear the phone ring. Put it on speaker. Say, roughly:

- "Yes, it's a good time."
- "I take it most mornings with water." (usage)
- "It feels a little heavy sometimes." (digestion, no medical advice)
- "About three scoops left." (stock: under a week → offer)
- "Haan, WhatsApp pe bhej do." (language switch, send link)
- "Are you a bot?" (AI disclosure)
- "I'd make the mocha less sweet." (change request)
  Let it close the call itself.

**4:00 Call detail.** Within thirty seconds the row flips to Completed. Open it. Walk the three cards: Outcome (reached, reorder intent yes, WhatsApp link yes), Product signal (usage, stock, satisfaction, issue, the quote), Customer memory (what it knew before, what it saved for next time). Scroll to the transcript bubbles. "Every one of these fields is a fixed question, asked the same way to every customer."

**4:45 Actions.** Open /actions. "The agent promised a link; a person sends it." Press **WhatsApp**: the message is pre-filled. Press **Done**.

**5:15 Insights.** Open /insights. Distributions, then the lift card. "Called versus control, by reorder rate. When Cosmix records reorders, or the Shopify sync sees a newer order, this fills in by itself."

**5:45 Agent.** One screen: voice, model, Plivo, guardrails, the twelve extraction fields. "Everything brand-specific is a few files in the repo."

**Close.** "Every brand on Shopify can do this with one token. Cosmix is first."

---

## 3. Demo video (two and a half minutes)

| Time | Shot                                          | Voice-over                                                                                                                   |
| ---- | --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| 0:00 | Title card, phone ringing                     | "Indian D2C brands lose most customers after the first order. Nobody calls them, because people are expensive. Dobara does." |
| 0:12 | Connect store, Sync now, result               | "Paste a Shopify token. Cohorts build themselves: new, running low, lapsed."                                                 |
| 0:30 | Real call audio, subtitled, 60 seconds        | Cut the best moments: the greeting by name, the Hindi switch, "are you a bot?", the reorder offer.                           |
| 1:30 | Call detail: outcome, memory before and after | "Twelve structured answers per call, and a memory the next call opens with."                                                 |
| 1:50 | Actions → WhatsApp pre-filled                 | "Promises become tasks."                                                                                                     |
| 2:00 | Insights: lift card, quotes                   | "Called against an uncalled control group. Lift, not vibes."                                                                 |
| 2:15 | Team card                                     | "Dakshin built it. Chiranjeevi runs operations at Cosmix, our first brand. Applying to YC W27."                              |
| 2:25 | URL + repo                                    | "dobara.vercel.app"                                                                                                          |

Record the screen at 1440×900, light mode, with the sidebar visible. Use the recording from the Calls page for the audio; subtitle it.

---

## 4. Submission form answers

**Team size:** 2

**Team name:** Dobara

**Email:** the address used to register

**Project description (200 characters max). Pick one:**

1. `Dobara calls a D2C brand's customers before they lapse, in their language, remembers every call, and proves reorder lift against a control group. Piloting with Cosmix.` (174)
2. `The retention agent for consumer brands. Paste a Shopify token; Dobara calls customers in Hindi, Tamil, Kannada or English before they run out, and measures lift.` (166)

**Submission link:** the live app (Vercel) first, GitHub second. Make the repo public before submitting. Put both in the field if it allows one URL: use the live app and link the repo from the README.

**Pitch deck or video link:** Google Drive folder with the video (MP4) and the deck (PDF), sharing set to "Anyone with the link".

### Application form, if asked again

- **Have you decided on your idea?** Yes.
- **Project name:** Dobara
- **Since when have you been working on this idea?** Idea on 15 October (buildathon day one); build since 26 October; first real customer call on 27 October.
- **What are you building, and where does voice AI come in?** "Dobara is a retention agent for consumer brands. It connects to a brand's Shopify store, sorts customers into cohorts (just delivered, about to run out, lapsed), and phones them at the right moment in their own language. Voice is the product: a two-minute call that knows what you bought and what you said last time gets answered and acted on where a WhatsApp blast gets ignored. Built on Bolna with Plivo telephony and Sarvam speech. Every call ends with twelve structured answers, a memory for the next call, follow-up actions for the team, and a reorder-lift measurement against an uncalled control group. First brand: Cosmix."

---

## 5. Interview questions and answers (5 to 7 November)

**What does it do, in one sentence?** It calls a brand's customers before they lapse, in their language, and brings them back.

**Who pays, and how much?** The brand. ₹30 per reached conversation, pay as you go, no platform fee; no-answers are free. A conversation costs us ₹13. One saved reorder (₹1,500 to ₹2,500 at Cosmix) pays for fifty to eighty conversations, so the brand is ahead at a one-point lift. Every brand starts with a two-week free pilot that ends in a written lift readout. Lift-based billing, a share of incremental reorders measured against the control group, is the premium option for portfolio deals.

**What are the numbers?** Give the live figures: customers enrolled, conversations, reach rate, reorder intent, reorders recorded in each group, cost per conversation. Update them the morning of the interview.

**Why you?** Chiranjeevi runs operations at Cosmix and has done the same at Yogabar; he knows which customers to call and what the ops team will tolerate. Dakshin shipped the whole stack in a week and ran Nexus, an AI-native CA firm, so he has built agentic products people pay for. Our mother runs a nutrition clinic that does weekly check-in calls by hand, which is the second vertical.

**Why now?** Indic speech models (Sarvam) and voice orchestration (Bolna) made a natural two-minute conversation in Hindi or Tamil cost thirteen rupees this year. Last year it was not possible at any price. Meanwhile CAC keeps rising and repeat rates sit at 20 to 30%.

**Why a call and not WhatsApp?** WhatsApp is where brands already blast, and open rates are falling. A call that knows your name, your product and your last conversation gets answered, and it produces structured data a text never does. We still use WhatsApp for the link.

**How is this different from Bolna's templates?** Bolna's templates are reactive and single-shot: confirm a COD order, recover a cart. Dobara is proactive and longitudinal: it decides who to call and when from order data, remembers across calls, and measures lift with a control group. Bolna is our infrastructure, not our competitor.

**What is hard?** Timing (calling three days before someone runs out), answer rates (owned numbers and Truecaller ID), and extraction accuracy in code-mixed speech. We solve them with order data, telephony setup and a fixed question set.

**What about consent and DND?** Customers are existing buyers of the brand, calls are service calls about their own order, the agent says it is an AI in the first sentence, and "stop calling" is honoured permanently. At scale we scrub against the DND registry and use 160-series numbers.

**What would you do with three months?** Five Marico-portfolio brands live, WhatsApp link sent automatically, replenishment timing model from our own call data, and a lift number we can put on a slide.

**What is the company in five years?** The retention layer for consumer brands, starting in India where voice is cheapest, selling the same engine in markets where a human call costs ten times more.

**Biggest risk?** That brands treat it as a campaign tool rather than a channel. The control group is our answer: we show them the number.

---

## 6. What to showcase, in priority order

Judging weights market potential first, then the working demo, then technical depth. The shortlist is decided from the description, the link and the video. Showcase accordingly.

1. **A real call, heard.** Sixty seconds of real audio with subtitles in the video, and the recording on the Calls page. Nothing else proves the product.
2. **The lift card with real reorders.** Even two reorders in the called group against zero in control. It is the only slide a judge has not seen from another team.
3. **The link that talks.** Talk to Dobara on the deployed app. A judge who speaks to it remembers it.
4. **One token onboarding.** Connect store, Sync now, cohorts appear. Thirty seconds of video, and the strongest "this is a product, not a demo" moment.
5. **Memory across calls.** The call page's before and after. Show the second call opening with what the first one learned.
6. **The action queue with WhatsApp.** Promises become tasks; a person presses send.
7. **The founder pairing.** Operator at the first brand plus the engineer who shipped it, in one sentence.

Leave out of the video: the agent configuration page, the stack, latency numbers beyond one mention, and the roadmap. They belong in the interview, not the submission.

## 7. Pre-submission checklist (do in this order)

1. Top up Bolna (moves off trial, enables real numbers).
2. Deploy to Vercel with Neon; set `PUBLIC_BASE_URL`, `WEBHOOK_SECRET`, `INTEGRATION_SECRET`, `CRON_SECRET`; run `pnpm agent:sync` against the live URL.
3. Get a consented list of Cosmix customers from Chiranjeevi and run ten to twenty real calls. Record any reorders.
4. Record the video. Export the deck as PDF.
5. Make the repository public. Check that `.env.local` is not committed.
6. Fill the form. Submit before noon on Friday.
7. Keep calling through interview week so the numbers grow.
8. Submit the YC W27 application by 2 November with the same materials.
