export type Verdict =
  | "Strong argument"
  | "Reasonable but limited"
  | "Weakly supported"
  | "Contains a clearly identified logical fallacy"
  | "Insufficient information to judge"
  | "No substantive argument to evaluate";

export type AnalysisMode = "quick" | "deep" | "counter";

/** The only six verdicts the model is allowed to return. */
export const VERDICTS: Verdict[] = [
  "Strong argument",
  "Reasonable but limited",
  "Weakly supported",
  "Contains a clearly identified logical fallacy",
  "Insufficient information to judge",
  "No substantive argument to evaluate",
];

export interface Tactic {
  /** Short name of the rhetorical move, e.g. "vague majority appeal". */
  name: string;
  /** The exact span from the post that triggered the flag. */
  quote: string;
  sourceStart?: number | null;
  sourceEnd?: number | null;
}

export interface CounterView {
  /** The strongest honest case against the post. Never a strawman. */
  steelman: string;
  /** The single piece of evidence that would actually decide the dispute. */
  settlingEvidence: string;
}

export interface AnalyzeMeta {
  wallMs: number;
  tokPerS: number;
  model: string;
  numCtx: number;
  /** Number of attempts, >1 means the first run was truncated and retried. */
  attempts: number;
  mode: AnalysisMode;
}

export interface AnalysisSection {
  heading: string;
  body: string;
  evidence: Array<{
    quote: string;
    speaker: string | null;
    note: string | null;
  }>;
}

export interface AnalyzeResult {
  mode: AnalysisMode;
  sourceLanguage: string;
  responseLanguage: string;
  contentType: string;
  headline: string;
  summary: string;
  sections: AnalysisSection[];
  claim: string;
  tactics: Tactic[];
  counterView: CounterView;
  /** Mode-specific extended reasoning. Present for Deep Analysis. */
  deepAnalysis: string;
  /** Explicit, evidence-aware objections. Present for Explore Counterarguments. */
  counterArguments: string[];
  scoreRationale: string;
  score: number | null;
  verdict: string;
  confidence: { level: string; why: string };
  /** True when the model reported nothing manipulative about the post. */
  noSignal: boolean;
  /**
    * True when the structured JSON response could not be recovered from the model output.
   * The UI must surface `raw` verbatim in that case rather than pretend.
   */
  parseFailed: boolean;
  raw: string;
  meta: AnalyzeMeta;
}

export interface AnalyzeRequest {
  text?: string;
  imageBase64?: string;
  mode?: AnalysisMode;
  focus?: string;
  outputLanguage?: string;
}

export type ModeRunState = "idle" | "queued" | "running" | "complete" | "error";

export interface AnalysisRun {
  id: string;
  fingerprint: string;
  createdAt: number;
  text: string;
  imageName: string | null;
  /** Kept in memory only so prior screenshot results remain inspectable in their tab. */
  imageData: string | null;
  focus: string;
  outputLanguage: string;
  results: Partial<Record<AnalysisMode, AnalyzeResult>>;
  states: Record<AnalysisMode, ModeRunState>;
  errors: Partial<Record<AnalysisMode, AnalyzeError>>;
}

export interface AnalyzeError {
  error: string;
  detail?: string;
  /** True when the caller may usefully retry the same input. */
  retryable: boolean;
}
