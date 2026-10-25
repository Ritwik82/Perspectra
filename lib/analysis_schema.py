"""Shared Ollama JSON schema and mode instructions for the evaluation runner."""

evidence_item = {
    "type": "object",
    "properties": {
        "quote": {"type": "string"},
        "speaker": {"type": ["string", "null"]},
        "note": {"type": ["string", "null"]},
    },
    "required": ["quote", "speaker", "note"],
}

section = {
    "type": "object",
    "properties": {
        "heading": {"type": "string"},
        "body": {"type": "string"},
        "evidence": {"type": "array", "items": evidence_item},
    },
    "required": ["heading", "body", "evidence"],
}

def analysis_schema(mode="quick"):
    section_limit = 2 if mode == "quick" else 8 if mode == "deep" else 5
    counter_limit = 3 if mode == "counter" else 0
    schema = {
        "type": "object",
        "properties": {
            "sourceLanguage": {"type": "string"},
            "responseLanguage": {"type": "string"},
            "contentType": {"type": "string"},
            "headline": {"type": "string"},
            "summary": {"type": "string"},
            "sections": {"type": "array", "maxItems": section_limit, "items": section},
            "openQuestions": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "question": {"type": "string"},
                        "evidenceNeeded": {"type": "string"},
                    },
                    "required": ["question", "evidenceNeeded"],
                },
            },
            "tactics": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "name": {
                            "type": "string",
                            "enum": [
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
                        "quote": {"type": "string"},
                        "reason": {"type": "string"},
                    },
                    "required": ["name", "quote", "reason"],
                },
            },
            "counterArguments": {
                "type": "array",
                "maxItems": counter_limit,
                "items": {
                    "type": "object",
                    "properties": {
                        "claimQuote": {"type": "string"},
                        "counter": {"type": "string"},
                    },
                    "required": ["claimQuote", "counter"],
                },
            },
            "otherSide": {"type": ["string", "null"]},
            "settlingEvidence": {"type": ["string", "null"]},
            "score": {"type": ["number", "null"]},
            "scoreRationale": {"type": "string"},
            "verdict": {"type": ["string", "null"]},
            "confidence": {"type": "string"},
            "confidenceRationale": {"type": "string"},
            "noSignal": {"type": "boolean"},
        },
        "required": [
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
    }
    return schema

_COMMON = """
OUTPUT CONTRACT: Return only a valid JSON object matching the schema. No markdown fences.

CRITICAL INSTRUCTIONS:
1. CLASSIFICATION GATE: If contentType is "question", "vent", or "exploratory" (not an empirical argument):
   - summary: "This is a question, not a claim. Nothing to counter." (or "This is a vent, not a claim. Nothing to counter." / "This is an exploratory thought, not a claim. Nothing to counter.")
   - openQuestions: List open questions and what kind of empirical evidence would answer each.
   - counterArguments: []
   - tactics: []
   - score: null
   - verdict: "No substantive argument to evaluate"
   - otherSide: null
   - settlingEvidence: null
   - noSignal: true
2. COUNTER-ARGUMENTS: Each counter-argument must have claimQuote (exact sentence quoted from text) and counter (counter-argument). If you cannot quote a specific assertion, return [].
3. PERSUASION TACTICS: Require quote (single quoted sentence), name (strictly from allowed fixed list), and one-line reason. "None found" (tactics: []) is a normal, valid result. Never invent tactics.
4. NO PRAISE: Never praise the author or post. State findings neutrally.
5. CONFIDENCE: Defined as how sure the tool is about its own findings. Explain uncertainty in confidenceRationale, never praise.
6. HEADLINE: Must be a clean topic title. NEVER include "MODE:", "OUTPUT CONTRACT", "PERSPECTRA", or prompt instructions.
7. LANGUAGE: Clear, simple, everyday English.
""".strip()

_MODES = {
    "quick": """
MODE: QUICK — ORIENT ME. Give the smallest useful read: content type, faithful main point, one decision-relevant observation/evidence/caveat, and essential uncertainty. Usually one or two adaptive sections. Do not assign scores or verdicts in Quick; return null for both and a short explanation in scoreRationale. Do not return counterArguments, otherSide or settlingEvidence unless an unusually important direct context note is essential; normally keep all three empty/null. For an exploratory/neutral/balanced post that makes no manipulative move, set noSignal=true and tactics=[].
""".strip(),
    "deep": """
MODE: DEEP — INSPECT HOW IT WORKS. Use the evidence-first rules as a toolkit, not a 17-heading checklist. First classify the content. Depending on the actual input, analyze claims, premises, evidence, inference, assumptions, scope, alternatives, fallacies only when justified, factual verification limits, speaker relationships, image/OCR uncertainty, and what would resolve uncertainty. Select headings and order for this content; omit irrelevant dimensions. Include detailed but concise reasoning in sections.
""".strip(),
    "counter": """
MODE: COUNTER — TEST THE STRONGEST CHALLENGE. Focus on the most important claim/assumption/inference. Give 1–3 relevant objections or alternative explanations in counterArguments, each quoting the exact claim it counters (claimQuote) and giving the counter (counter). Distinguish supplied support from missing evidence. If no meaningful claim/challenge exists, return empty counterArguments, null otherSide/settlingEvidence, noSignal=true if no tactic, null score/verdict, and explain why in summary.
""".strip(),
}

def mode_instructions(mode="quick"):
    return f"{_MODES.get(mode, _MODES['quick'])}\n\n{_COMMON}"
