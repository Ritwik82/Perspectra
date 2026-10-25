import fs from "node:fs";
import path from "node:path";
import { modeInstructions } from "./analysis-schema";

/**
 * The system message is two files, concatenated in this order:
 *
 *   prompt/subtext_system.md  the Subtext evidence-first rules
 *   prompt/overrides/*.md     the selected mode's output contract
 *
 * Why the override exists: the rule set as written asks for a 14-section
 * report, which runs ~3,000 output tokens and ~85 seconds on the target
 * hardware. That is not demoable. Everything in the rule set still governs the
 * *reasoning*; the override only restricts the *shape* of what gets emitted.
 * Later instructions dominate, so the override wins without editing the rules.
 *
 * Both files are also read by tests/run_all.py, so the corpus measures the same
 * system the app ships. Keep the concatenation identical in both places.
 *
 * Six logical fields, seven label lines — "THE OTHER SIDE" and "WHAT WOULD
 * SETTLE IT" are the two halves of one counter-view field in the API.
 *
 * To revert to the full 14-section report: drop the override from
 * getSystemPrompt() and point the runner at the base file alone.
 */

const PROMPT_DIR = path.join(process.cwd(), "prompt");
const BASE_PATH = path.join(PROMPT_DIR, "subtext_system.md");
let cached: string | undefined;

function readOrThrow(file: string, what: string): string {
  try {
    return fs.readFileSync(file, "utf8");
  } catch {
    throw new Error(
      `${what} not found at ${file}. It must exist at startup; the two prompt ` +
        `files are the analyser's entire rule set.`,
    );
  }
}

/**
 * The full system message: Subtext's rules followed by one mode override.
 * Read once per process. The files are the product — do not overwrite them.
 */
export function getSystemPrompt(mode: "quick" | "deep" | "counter" = "quick"): string {
  // In dev, re-read every time: the prompt files are the thing being edited, and
  // Turbopack does not watch .md, so a cache here means a stale prompt until the
  // server is restarted. In production the cache is kept.
  if (cached === undefined || process.env.NODE_ENV !== "production") {
    const base = readOrThrow(BASE_PATH, "Subtext evidence-first system prompt");
    if (base.trim().length < 1000) {
      throw new Error(
        `System prompt at ${BASE_PATH} looks truncated (${base.length} chars). ` +
          `Expected roughly 30,000 characters.`,
      );
    }
    cached = base.trimEnd();
  }
  return `${cached}\n\n---\n\n${modeInstructions(mode)}\n`;
}

/** Exposed for the runner and for debugging the wiring. */
export function getPromptStats() {
  const base = fs.readFileSync(BASE_PATH, "utf8");
  const full = getSystemPrompt();
  return {
    basePath: BASE_PATH,
    baseChars: base.length,
    baseLines: base.split("\n").length,
    modeInstructionChars: Object.values({ quick: modeInstructions("quick"), deep: modeInstructions("deep"), counter: modeInstructions("counter") }).reduce((sum, value) => sum + value.length, 0),
    totalChars: full.length,
    approxTokens: Math.round(full.length / 3.9),
  };
}
