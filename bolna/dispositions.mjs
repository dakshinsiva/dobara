// Post-call extractions (Bolna "dispositions") grouped in one category = one LLM pass per call.
// Results land in execution.extracted_data[CATEGORY.name][disposition.name].

export const CATEGORY = { name: "Dobara", model: "gpt-4.1-mini" };

/** Disposition names used by the app to read results. Keep in sync with DISPOSITIONS below. */
export const D = {
  reached: "Reached",
  usage: "Usage",
  stock: "Stock left",
  satisfaction: "Satisfaction",
  issue: "Issue",
  issueDetail: "Issue detail",
  reorderIntent: "Reorder intent",
  sendLink: "Send WhatsApp link",
  callback: "Callback requested",
  changeRequest: "Change request",
  nextCallSummary: "Next call summary",
  redFlag: "Red flag",
};

export const DISPOSITIONS = [
  {
    name: D.reached,
    question: "Did the agent reach the intended customer and have a real conversation (more than a greeting)?",
    is_objective: true,
    objective_options: [
      { value: "yes", condition: "The customer engaged and answered at least one question" },
      {
        value: "wrong_person",
        condition: "Someone other than the customer answered and the customer was not available",
      },
      { value: "no", condition: "No real conversation: immediate hangup, voicemail, silence, or only a greeting" },
    ],
  },
  {
    name: D.usage,
    question: "How is the customer using the product?",
    is_objective: true,
    objective_options: [
      { value: "daily", condition: "They have it every day or almost every day" },
      { value: "sometimes", condition: "They have it a few times a week or irregularly" },
      { value: "stopped", condition: "They used it before but have stopped" },
      { value: "not_started", condition: "They have not opened or started it" },
      { value: "unknown", condition: "Not discussed or unclear" },
    ],
  },
  {
    name: D.stock,
    question:
      "How much of the product does the customer have left? Treat answers like '30% left' or 'a few scoops' as under a week; 'half a tub' or 'just opened it' as more than a week.",
    is_objective: true,
    objective_options: [
      { value: "finished", condition: "They have finished it" },
      { value: "under_a_week", condition: "About a week or less remaining" },
      { value: "more_than_a_week", condition: "More than a week remaining" },
      { value: "unknown", condition: "Not discussed or unclear" },
    ],
  },
  {
    name: D.satisfaction,
    question: "How does the customer feel about the product overall?",
    is_objective: true,
    objective_options: [
      { value: "happy", condition: "Positive about taste, results or experience" },
      { value: "neutral", condition: "Mixed or indifferent" },
      { value: "unhappy", condition: "Negative about taste, digestion, price, delivery or results" },
      { value: "unknown", condition: "Not discussed or unclear" },
    ],
  },
  {
    name: D.issue,
    question: "What is the main problem the customer raised, if any?",
    is_objective: true,
    objective_options: [
      { value: "none", condition: "No problem raised" },
      { value: "taste", condition: "Taste, flavour fatigue, sweetness or texture" },
      { value: "digestion", condition: "Bloating, heaviness, gas or stomach discomfort" },
      { value: "price", condition: "Too expensive or wants a discount" },
      { value: "delivery", condition: "Delivery, packaging or damaged product" },
      { value: "results", condition: "Not seeing results or benefits" },
      { value: "other", condition: "Any other problem" },
    ],
  },
  {
    name: D.issueDetail,
    question: "Describe the customer's problem or feedback in one or two sentences, in their words where possible.",
    is_subjective: true,
    subjective_type: "text",
  },
  {
    name: D.reorderIntent,
    question: "Does the customer intend to reorder?",
    is_objective: true,
    objective_options: [
      { value: "yes", condition: "They agreed to reorder or asked for the link" },
      { value: "maybe", condition: "They might reorder later or want to think about it" },
      { value: "no", condition: "They do not want to reorder" },
      { value: "already_reordered", condition: "They said they already placed a new order" },
      { value: "unknown", condition: "Not discussed" },
    ],
  },
  {
    name: D.sendLink,
    question: "Should a WhatsApp reorder link be sent to this customer?",
    is_objective: true,
    objective_options: [
      { value: "yes", condition: "The customer agreed to receive the reorder link or offer on WhatsApp" },
      { value: "no", condition: "They did not agree or it was not offered" },
    ],
  },
  {
    name: D.callback,
    question: "Did the customer ask for a human callback or a call at another time?",
    is_objective: true,
    objective_options: [
      { value: "human", condition: "They asked to speak to a person from the brand" },
      { value: "later", condition: "They asked to be called back at another time" },
      { value: "no", condition: "No callback requested" },
    ],
  },
  {
    name: D.changeRequest,
    question: "What is the one thing the customer would change about the product? Quote them briefly if possible.",
    is_subjective: true,
    subjective_type: "text",
  },
  {
    name: D.nextCallSummary,
    question:
      "Write two sentences the agent should remember before the next call: how they use the product, what they said, and anything promised.",
    is_subjective: true,
    subjective_type: "text",
  },
  {
    name: D.redFlag,
    question: "Is there anything the brand must act on immediately?",
    is_objective: true,
    objective_options: [
      { value: "none", condition: "Nothing urgent" },
      { value: "do_not_call", condition: "The customer asked not to be called again" },
      { value: "health_complaint", condition: "The customer reported a health problem they link to the product" },
      { value: "angry", condition: "The customer was angry or threatened to complain publicly" },
      { value: "wrong_number", condition: "The number does not belong to the customer" },
    ],
  },
];
