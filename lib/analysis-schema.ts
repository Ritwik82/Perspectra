import type { AnalysisMode } from "./types";

const evidenceItem = {
  type: "object",
  properties: {
    quote: { type: "string" },
    speaker: { type: ["string", "null"] },
    note: { type: ["string", "null"] },
  },
  required: ["quote", "speaker", "note"],
} as const;

const section = {
  type: "object",
  properties: {
    heading: { type: "string" },
    body: { type: "string" },
    evidence: { type: "array", items: evidenceItem },
  },
  required: ["heading", "body", "evidence"],
} as const;

export function analysisSchema(mode: AnalysisMode) {
  const sectionLimit = mode === "quick" ? 2 : mode === "deep" ? 8 : 5;
  const counterLimit = mode === "counter" ? 3 : 0;
  return {
    type: "object",
    properties: {
      sourceLanguage: { type: "string" },
      responseLanguage: { type: "string" },
      contentType: { type: "string" },
      headline: { type: "string" },
      summary: { type: "string" },
      sections: { type: "array", maxItems: sectionLimit, items: section },
      openQuestions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            question: { type: "string" },
            evidenceNeeded: { type: "string" },
          },
          required: ["question", "evidenceNeeded"],
        },
      },
      tactics: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: {
              type: "string",
              enum: [
                "Loaded Language",
                "Ad Hominem",
                "Strawman",
                "False Dilemma",
                "Slippery Slope",
                "Cherry-Picking",
                "Appeal to Emotion",
                "Whataboutism",
                "Hasty Generalization",
                "False Equivalence",
                "Bandwagon Appeal",
                "Circular Reasoning",
                "Red Herring",
              ],
            },
            quote: { type: "string" },
            reason: { type: "string" },
          },
          required: ["name", "quote", "reason"],
        },
      },
      counterArguments: {
        type: "array",
        maxItems: counterLimit,
        items: {
          type: "object",
          properties: {
            claimQuote: { type: "string" },
            counter: { type: "string" },
          },
          required: ["claimQuote", "counter"],
        },
      },
      otherSide: { type: ["string", "null"] },
      settlingEvidence: { type: ["string", "null"] },
      score: { type: ["number", "null"] },
      scoreRationale: { type: "string" },
      verdict: { type: ["string", "null"] },
      confidence: { type: "string" },
      confidenceRationale: { type: "string" },
      noSignal: { type: "boolean" },
    },
    required: [
      "sourceLanguage",
      "responseLanguage",
      "contentType",
      "headline",
      "summary",
      "sections",
      "openQuestions",
      "tactics",
      "counterArguments",
      "otherSide",
      "settlingEvidence",
      "score",
      "scoreRationale",
      "verdict",
      "confidence",
      "confidenceRationale",
      "noSignal",
    ],
  } as const;
}

export function modeInstructions(mode: AnalysisMode): string {
  const common = `\n\nOUTPUT CONTRACT: Return only a valid JSON object matching the schema. No markdown fences.

CRITICAL INSTRUCTIONS:
1. CLASSIFICATION GATE (STOP THE WRONG OUTPUT):
   First classify the content:
   - A 'question' is an inquiry asking for facts or information.
   - A 'vent' is strictly a first-person emotional diary about personal feelings or moods (e.g. "I'm exhausted and stressed out today").
   - An 'exploratory' post is an open inquiry exploring possibilities without asserting a firm conclusion.
   CRITICAL: Any post that makes causal claims, policy predictions, accusations about opponents, or societal consequences (e.g. "If we do X, then civilization will collapse into the dark ages; opponents want Y") is an ARGUMENT (contentType: "argument" or "claim"), NEVER a vent!
   
   If and ONLY if the content is a genuine question, personal emotional diary, or exploratory inquiry:
   - summary: MUST start with: "This is a question, not a claim. Nothing to counter." (or "This is a vent, not a claim. Nothing to counter." / "This is an exploratory thought, not a claim. Nothing to counter.").
   - openQuestions: List open questions and what kind of empirical evidence would answer each.
   - counterArguments: []
   - tactics: []
   - score: null
   - verdict: "No substantive argument to evaluate"
   - otherSide: null
   - settlingEvidence: null
   - noSignal: true.
   
   For ARGUMENTS and CLAIMS: Write a clean, direct summary of the main point. Do NOT include phrases like "This is an argument, not a vent".

2. COUNTER-ARGUMENTS EXACT QUOTE RULE:
   Each counter-argument in counterArguments MUST include:
   - claimQuote: The exact sentence or assertion from the text being countered.
   - counter: The specific counter-argument.
   If you cannot quote a specific assertion from the input, you CANNOT produce a counter-argument. Return counterArguments: [].

3. PERSUASION TACTICS STRICT RULE & AVOIDING FALSE FLAGS:
   Only report a tactic if you can:
   - quote: Exact single sentence from the post that performs it.
   - name: Choose strictly from ["Loaded Language", "Ad Hominem", "Strawman", "False Dilemma", "Slippery Slope", "Cherry-Picking", "Appeal to Emotion", "Whataboutism", "Hasty Generalization", "False Equivalence", "Bandwagon Appeal", "Circular Reasoning", "Red Herring"].
   - reason: One-line explanation of the manipulation.
   
   GUARDRAIL AGAINST FALSE FLAGS (STRICT):
   - A reasonable, nuanced, or balanced argument MUST return tactics: [] ("none found") and noSignal: true.
   - "Appeal to Emotion" is ONLY valid when an author tries to manipulate the reader with fear, pity, or outrage instead of facts (e.g. "Doctors are absolutely terrified!", "evil traitors who starve families"). Saying "What annoys me is...", "I feel frustrated", or expressing personal irritation is NORMAL discourse, NEVER Appeal to Emotion.
   - "Red Herring" is ONLY when someone deliberately introduces an irrelevant topic to dodge an inquiry. Saying "people keep arguing about the wrong thing" or critiquing how a debate is framed is valid commentary, NEVER a Red Herring.
   - Only flag "Loaded Language" when inflammatory, dehumanizing, or abusive insults are used (e.g. "evil traitor", "corrupt pampered cronies").
   - Only flag "Slippery Slope" when a chain reaction to catastrophic disaster is claimed without justification (e.g. "if students use calculators, technical civilization will collapse").
   - Only flag "Strawman" when an opponent's position is grossly distorted (e.g. "my opponents want our kids to become completely illiterate").
   - If an argument acknowledges complexity, calls for evidence, or provides balanced analysis (such as the gender pay gap argument), it contains NO persuasion tactics. Return tactics: [] and noSignal: true.

4. NO LEAKED PROMPT TEXT IN HEADLINE:
   The headline must be a clean, natural topic title (e.g. "Critique of Remote Work Productivity"). NEVER include "MODE:", "OUTPUT CONTRACT", "PERSPECTRA", or system prompt words in headline or section headings.

5. NO-PRAISE RULE & CONFIDENCE:
   Never praise or flatter the author or post (do not say "insightful post", "well-argued", "great point"). Be strictly neutral.
   Confidence is defined as "how sure the tool is about its own findings". In confidenceRationale, explain the reason for uncertainty (e.g. missing context, lack of verified data), never praise.

6. LANGUAGE & CLARITY:
   Write in simple, clear, everyday English so any regular person can easily understand. Avoid academic jargon.`;

  const modeGuide = {
    quick: `MODE: QUICK — ORIENT ME. Give the smallest useful read: content type, faithful main point, one decision-relevant observation/evidence/caveat, and essential uncertainty. Usually one or two adaptive sections. Do not assign scores or verdicts in Quick; return null for both and a short explanation in scoreRationale. Do not return counterArguments, otherSide or settlingEvidence unless an unusually important direct context note is essential; normally keep all three empty/null. For an exploratory/neutral/balanced post that makes no manipulative move, set noSignal=true and tactics=[].`,
    deep: `MODE: DEEP — INSPECT HOW IT WORKS. Use the evidence-first rules as a toolkit, not a 17-heading checklist. First classify the content. Depending on the actual input, analyze claims, premises, evidence, inference, assumptions, scope, alternatives, fallacies only when justified, factual verification limits, speaker relationships, image/OCR uncertainty, and what would resolve uncertainty. Select headings and order for this content; omit irrelevant dimensions. Include detailed but concise reasoning in sections.`,
    counter: `MODE: COUNTER — TEST THE STRONGEST CHALLENGE. Focus on the most important claim/assumption/inference. Give 1–3 relevant objections or alternative explanations in counterArguments, each quoting the exact claim it counters (claimQuote) and giving the counter (counter). Distinguish supplied support from missing evidence. If no meaningful claim/challenge exists, return empty counterArguments, null otherSide/settlingEvidence, noSignal=true if no tactic, null score/verdict, and explain why in summary.`,
  }[mode];
  return `${modeGuide}${common}`;
}
