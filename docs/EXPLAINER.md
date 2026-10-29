# What voice AI can do today, explained to an operator

A five-minute version for Chiranjeevi, written Oct 25, 2026. Numbers come from the research doc; where a number is a vendor claim it says so.

---

## 1. The one-line version

It is a telecaller who has read the brief once, speaks ten Indian languages, never gets tired, fills the CRM perfectly after every call, and costs about ₹8 a minute. It cannot press keys on an IVR, it mishears numbers on a bad line, and it only knows what you put in front of it.

---

## 2. How a call works (three parts and a switchboard)

| Part                       | What it does                                                                                                                | Who makes it                          | What to know                                                                                                                                                     |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ears (speech-to-text)      | Turns the caller's speech into text, live                                                                                   | Sarvam, Deepgram, ElevenLabs          | Sarvam's Hindi word error rate is about 5%, Deepgram's about 13%; southern languages run 14% to 19%. Elderly or dialect speech on a bad line can hit 30% to 40%. |
| Brain (the language model) | Reads the transcript plus the brief, decides what to say next, fills in fields                                              | OpenAI, Google, Anthropic             | It follows instructions well and improvises badly. It knows nothing about your products unless you give it the facts.                                            |
| Mouth (text-to-speech)     | Speaks the reply in a chosen voice                                                                                          | Sarvam, Cartesia, ElevenLabs          | Sarvam's newest voices include Hindi-English code-mixed ones. Voices are now good enough that people do not notice for a minute or two.                          |
| Switchboard (Bolna)        | Dials, listens, decides when the caller has finished speaking, handles interruptions, records, and sends the results to you | Bolna, on Plivo or Exotel phone lines | The whole loop runs in about half a second per turn, which is what makes it feel like a conversation.                                                            |

The brain is the only part people talk about. The hard, unglamorous work is in the switchboard: knowing when to speak, stopping when interrupted, hearing names and numbers, and handing the call to a human with context.

---

## 3. What it can do now, and what it cannot

**Can, reliably**

- Hold a natural four-minute conversation in Hindi, Kannada, Tamil or English, and switch language mid-call if the caller does.
- Open every call with context about the person: last order, last conversation, name, what they said last time.
- Follow a brief: ask these eight things, in this order, handle these five objections, never say these things.
- Fill structured fields after every call: reached or not, answers, sentiment, reason given, next action.
- Call a system during the call: check a slot, log a reading, look something up on the web, send a WhatsApp link.
- Transfer to a human, detect voicemail, retry unanswered numbers, respect calling hours.
- Make hundreds of calls in parallel; ten at once on a basic paid account.

**Cannot, or not yet**

- Press keys on someone else's IVR on an outbound call. It can receive key presses, not send them.
- Hear a 12-digit number or an unusual name correctly on a noisy line without reading it back.
- Know anything it was not told. Ask it about a product fact that is not in its brief and it will guess unless the brief forbids guessing.
- Detect anything it cannot hear: a fall, a mood, a lie.
- Call on WhatsApp through Bolna today; it calls the phone number. Meta allows business calls on WhatsApp in India, but the bridge is not documented.
- Be cheaper than a human at scale without effort. A list-price call costs about what a telecaller costs per minute; the savings come from coverage, consistency and the data, and from cheaper setups once volumes are real.

---

## 4. What changed in the last 18 months, and why now

- Indian-language speech models crossed from "demo" to "usable" in 2025 to 2026. Sarvam's models and Bolna's newest voices are the proof.
- Model prices fell 60% to 80% from 2024 to 2026. A four-minute vernacular call now costs under ₹30 end to end.
- The platforms matured: Bolna now has memory per customer, structured extraction, tools, WhatsApp follow-ups, batch scheduling with calling-hour rules, and an experiment-friendly API. Two years ago each of those was a custom build.
- Regulation caught up: TRAI's 2025 and 2026 rules define consent, number series and robocall disclosure, so compliant outbound is a known path rather than a grey area.

---

## 5. The numbers an operator should keep in his head

| Metric                                         | Figure                                                           | Source type                 |
| ---------------------------------------------- | ---------------------------------------------------------------- | --------------------------- |
| Cost per minute, all-in, list price            | about ₹7.8 (6¢ bundled models + 2¢ platform + telephony)         | Bolna pricing               |
| Cost per minute at commitment or with own keys | ₹2.5 to ₹4.5                                                     | Bolna pricing, Sarvam rates |
| Human telecaller, per connected minute         | ₹5 to ₹8; ₹6 to ₹10 fully loaded in tier-2, ₹12 to ₹17 in metros | Vendor analysis             |
| Outbound connect rate in India                 | 46% to 48%                                                       | Investor analysis           |
| Average connected outbound call                | 1.6 minutes                                                      | Investor analysis           |
| Response time per turn                         | under 0.6 seconds                                                | Bolna claim                 |
| Concurrent calls, basic paid account           | 10                                                               | Bolna docs                  |
| Hindi speech-recognition error rate            | 5% (Sarvam) to 13% (Deepgram)                                    | Investor analysis           |

---

## 6. What "building it" actually means in six days

Nobody is training a model. The build is:

1. **A brief** the agent follows: who it is, what to ask, what to say to each objection, what it may never say. Written in plain English, tuned every evening from real transcripts.
2. **A list** of who to call and when, with the facts to open with. This is a spreadsheet export from the brand.
3. **A schema** of what to capture from each call, so the output is rows, not recordings.
4. **A loop** to the brand: a dashboard, a WhatsApp link, an escalation to a human.
5. **A measurement**: a called group and an uncalled control group, and the difference between them.

The brand's data and the measurement are the product. The voice is the delivery mechanism, which is why Bolna, Sarvam and the model providers are suppliers, not competitors.

---

## 7. The two-minute demo that explains everything

1. Open bolna.ai and use "talk to a live agent", which needs no sign-up. Let him interrupt it, switch to Hindi, and ask something off-script. He will see the strengths and the limits in a minute.
2. Then call his phone with a draft of our agent that opens with his name and a fact about Cosmix. The difference between a generic bot and one that knows the customer is the whole pitch.

---

## 8. Honest answers to the questions he will ask

- **Will suppliers or customers hang up on a bot?** Some will. Disclose it is an AI in the first sentence, keep it short, and give it something useful to do. Answer rates on outbound are about half regardless of who is calling.
- **What if it says something wrong?** It says only what the brief and the knowledge base allow, and every call is recorded and extracted. The first fifty calls get listened to by a human; the brief is corrected the same evening.
- **Is it legal?** Service calls to existing customers or suppliers, within calling hours, with AI disclosed and "stop calling" honoured instantly, are within TRAI's rules. Marketing to strangers is a different, harder path.
- **Why not just hire two telecallers?** Per minute it is similar. The difference is that every call is identical, every answer becomes a row, it runs at 7 pm on Sunday, and it scales from 50 to 5,000 calls without hiring.
- **What breaks first?** Numbers and names on bad lines, people who talk over it, and facts missing from the brief. All three show up in the first ten calls and all three are fixable.
