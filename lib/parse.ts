import type { AnalysisMode, AnalysisSection, AnalyzeMeta, AnalyzeResult, Tactic } from "./types";

type ModelAnalysis = {
  sourceLanguage: string;
  responseLanguage: string;
  contentType: string;
  headline: string;
  summary: string;
  sections: AnalysisSection[];
  tactics: Tactic[];
  counterArguments: string[];
  otherSide: string | null;
  settlingEvidence: string | null;
  score: number | null;
  scoreRationale: string;
  verdict: string | null;
  confidence: string;
  confidenceRationale: string;
  noSignal: boolean;
};

const VALID_MODES: AnalysisMode[] = ["quick", "deep", "counter"];
const SECTION_LIMITS: Record<AnalysisMode, number> = { quick: 2, deep: 8, counter: 5 };
const MAX_EVIDENCE = 6;

function cleanString(value: unknown, max = 2400): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function nullableText(value: unknown, max: number): string | null {
  const text = cleanString(value, max);
  return !text || /^(null|none|n\/?a)$/i.test(text) ? null : text;
}

function normalizedTacticName(value: string): string {
  const clean = value.trim();
  if (/^(observation|question|inquiry|observation\/question|exploratory question|personal experience|description|plain statement|summary|hedging\/limitation|limitation|cautious skepticism|framing)$/i.test(clean)) return "";
  return clean;
}

function parseModelResponse(raw: string, mode: AnalysisMode): ModelAnalysis {
  const data: unknown = JSON.parse(raw);
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("The model response was not a JSON object.");
  }
  const x = data as Record<string, unknown>;
  if (typeof x.noSignal !== "boolean" || !Array.isArray(x.sections) || !Array.isArray(x.tactics)) {
    throw new Error("The model response is missing required analysis fields.");
  }

  const sections = x.sections.slice(0, SECTION_LIMITS[mode]).flatMap((item): AnalysisSection[] => {
    if (!item || typeof item !== "object") return [];
    const section = item as Record<string, unknown>;
    const evidence = Array.isArray(section.evidence)
      ? section.evidence.slice(0, MAX_EVIDENCE).flatMap((entry) => {
          if (!entry || typeof entry !== "object") return [];
          const e = entry as Record<string, unknown>;
          const quote = cleanString(e.quote, 500);
          if (!quote) return [];
          return [{
            quote,
            speaker: typeof e.speaker === "string" ? cleanString(e.speaker, 120) || null : null,
            note: typeof e.note === "string" ? cleanString(e.note, 400) || null : null,
          }];
        })
      : [];
    const heading = cleanString(section.heading, 120);
    const body = cleanString(section.body, 2400);
    return heading || body || evidence.length ? [{ heading, body, evidence }] : [];
  });

  const parsedTactics = x.tactics.slice(0, 4).flatMap((item): Tactic[] => {
    if (!item || typeof item !== "object") return [];
    const tactic = item as Record<string, unknown>;
    const name = normalizedTacticName(cleanString(tactic.name, 120));
    const quote = cleanString(tactic.quote, 500);
    return name && quote ? [{ name, quote }] : [];
  });

  const score = typeof x.score === "number" && Number.isFinite(x.score)
    ? Math.max(0, Math.min(10, x.score))
    : null;

  const noSignal = x.noSignal || (!parsedTactics.length && !nullableText(x.otherSide, 1600) && x.score === null);

  return {
    sourceLanguage: cleanString(x.sourceLanguage, 100) || "Unknown",
    responseLanguage: cleanString(x.responseLanguage, 100) || "Unknown",
    contentType: cleanString(x.contentType, 160),
    headline: cleanString(x.headline, 240),
    summary: cleanString(x.summary, 1000),
    sections,
    tactics: noSignal ? [] : parsedTactics,
    counterArguments: Array.isArray(x.counterArguments)
      ? x.counterArguments.map((item) => cleanString(item, 1200)).filter(Boolean).slice(0, 3)
      : [],
    otherSide: noSignal ? null : nullableText(x.otherSide, 1600),
    settlingEvidence: noSignal ? null : nullableText(x.settlingEvidence, 800),
    score: noSignal ? null : score,
    scoreRationale: cleanString(x.scoreRationale, 500),
    verdict: noSignal ? null : nullableText(x.verdict, 200),
    confidence: ["high", "medium", "low"].includes(cleanString(x.confidence, 20).toLowerCase())
      ? cleanString(x.confidence, 20).toLowerCase()
      : "low",
    confidenceRationale: cleanString(x.confidenceRationale, 500),
    noSignal,
  };
}

export function parseAnalysis(
  raw: string,
  meta: AnalyzeMeta & { mode?: AnalysisMode; outputLanguage?: string },
  sourceText = "",
): AnalyzeResult {
  const mode = VALID_MODES.includes(meta.mode as AnalysisMode) ? meta.mode as AnalysisMode : "quick";
  let model: ModelAnalysis;
  let parseFailed = false;
  try {
    model = parseModelResponse(raw, mode);
  } catch {
    parseFailed = true;
    model = {
      sourceLanguage: "Unknown",
      responseLanguage: "Unknown",
      contentType: "",
      headline: "Analysis format could not be read",
      summary: "The model responded, but Perspectra could not safely interpret the structured result. The raw response is available for inspection.",
    sections: [],
      tactics: [],
      counterArguments: [],
      otherSide: null,
      settlingEvidence: null,
      score: null,
      scoreRationale: "No score is shown because the response could not be parsed reliably.",
      verdict: null,
      confidence: "low",
      confidenceRationale: "The response structure could not be validated.",
      noSignal: false,
    };
  }

  const score = model.noSignal ? null : model.score;
  if (mode === "quick") model.sections = model.sections.slice(0, SECTION_LIMITS.quick);
  if (mode === "deep") model.counterArguments = [];
  if (mode === "counter") {
    model.sections = model.sections.slice(0, SECTION_LIMITS.counter);
    if (model.noSignal) {
      model.sections = model.sections.filter((section) => !/rhetorical|fallac|verdict/i.test(section.heading));
      model.counterArguments = [];
      model.otherSide = null;
      model.settlingEvidence = null;
      model.score = null;
      model.verdict = null;
    }
  }
  const counterView = {
    steelman: model.otherSide ?? "",
    settlingEvidence: model.settlingEvidence ?? "",
  };

  const tacticsWithOffsets = model.tactics.map((tactic) => {
    const index = sourceText ? sourceText.indexOf(tactic.quote) : -1;
    return { ...tactic, sourceStart: index >= 0 ? index : null, sourceEnd: index >= 0 ? index + tactic.quote.length : null };
  });

  return {
    mode,
    sourceLanguage: model.sourceLanguage,
    responseLanguage: model.responseLanguage,
    contentType: model.contentType,
    headline: model.headline,
    summary: model.summary,
    sections: model.sections,
    claim: model.headline || model.summary,
    tactics: tacticsWithOffsets,
    counterView,
    deepAnalysis: mode === "deep" ? model.sections.map((section) => `${section.heading}\n${section.body}`.trim()).filter(Boolean).join("\n\n") : "",
    counterArguments: mode === "counter" ? model.counterArguments : [],
    scoreRationale: model.noSignal ? "No substantive reasoning to score." : model.scoreRationale,
    score,
    verdict: model.verdict ?? "",
    confidence: { level: model.confidence, why: model.confidenceRationale },
    noSignal: model.noSignal,
    parseFailed,
    raw,
    meta: { ...meta, mode },
  };
}

export function toMarkdown(result: AnalyzeResult): string {
  const lines = [
    `# ${result.headline || "Perspectra analysis"}`,
    "",
    `**Mode:** ${result.mode} · **Source language:** ${result.sourceLanguage} · **Response language:** ${result.responseLanguage}`,
    `**Model:** ${result.meta.model} · ${(result.meta.wallMs / 1000).toFixed(1)}s · ${result.meta.tokPerS} tok/s`,
    "",
    result.summary,
    "",
  ];
  for (const section of result.sections) {
    if (section.heading) lines.push(`## ${section.heading}`, "");
    if (section.body) lines.push(section.body, "");
    for (const evidence of section.evidence) {
      lines.push(`> “${evidence.quote}”${evidence.speaker ? ` — ${evidence.speaker}` : ""}`);
      if (evidence.note) lines.push(`> ${evidence.note}`);
    }
    if (section.evidence.length) lines.push("");
  }
  if (result.tactics.length) lines.push("## Rhetorical moves", ...result.tactics.map((t) => `- **${t.name}:** “${t.quote}”`), "");
  if (result.counterArguments.length) lines.push("## Counterarguments", ...result.counterArguments.map((item) => `- ${item}`), "");
  if (result.counterView.steelman) lines.push("## Other perspective", result.counterView.steelman, "");
  if (result.counterView.settlingEvidence) lines.push("## What could clarify this", result.counterView.settlingEvidence, "");
  if (result.score !== null) lines.push(`**Reasoning score:** ${result.score}/10 — ${result.scoreRationale}`, "");
  else if (result.scoreRationale) lines.push(`**Score:** Not applicable — ${result.scoreRationale}`, "");
  if (result.verdict) lines.push(`**Assessment:** ${result.verdict}`);
  if (result.confidence.why) lines.push(`**Confidence (${result.confidence.level}):** ${result.confidence.why}`);
  if (result.parseFailed) lines.push("", "> The structured response failed validation; inspect the raw model output before relying on it.", "", "```json", result.raw, "```");
  return lines.join("\n");
}

export function runParserSelfCheck() {
  const good = JSON.stringify({
    sourceLanguage: "English", responseLanguage: "English", contentType: "argument", headline: "Claim", summary: "Summary",
    sections: [], tactics: [], counterArguments: [], otherSide: null, settlingEvidence: null, score: null,
    scoreRationale: "Not applicable", verdict: null, confidence: "medium", confidenceRationale: "Limited context", noSignal: true,
  });
  const parsed = parseAnalysis(good, { wallMs: 10, tokPerS: 20, model: "test", numCtx: 16384, attempts: 1, mode: "quick" });
  if (!parsed.noSignal || parsed.score !== null || parsed.parseFailed) throw new Error("Valid no-signal response regression.");
  const invalid = parseAnalysis("not json", { wallMs: 10, tokPerS: 20, model: "test", numCtx: 16384, attempts: 1, mode: "deep" });
  if (!invalid.parseFailed || invalid.score !== null || invalid.tactics.length) throw new Error("Invalid response must not be presented as parsed analysis.");
}
