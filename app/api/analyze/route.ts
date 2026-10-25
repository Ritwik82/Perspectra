import { NextResponse } from "next/server";
import { chat, OllamaError } from "@/lib/ollama";
import { parseAnalysis } from "@/lib/parse";
import type { AnalysisMode, AnalyzeRequest } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const MAX_TEXT = 20_000;
const MAX_IMAGE_BASE64 = 16 * 1024 * 1024;
const TIMEOUT_MS = 300_000;

function fail(status: number, error: string, retryable: boolean, detail?: string) {
  return NextResponse.json({ error, detail, retryable }, { status });
}

/**
 * The browser never talks to Ollama. Everything goes through here, which means
 * no CORS, no OLLAMA_ORIGINS, and no model endpoint exposed to the page.
 */
export async function POST(request: Request) {
  const bodyLength = Number(request.headers.get("content-length") ?? 0);
  if (bodyLength > MAX_IMAGE_BASE64 + MAX_TEXT + 2_000) {
    return fail(413, "The request is too large. Images must be 12 MB or smaller.", false);
  }
  let body: AnalyzeRequest;
  try {
    body = (await request.json()) as AnalyzeRequest;
  } catch {
    return fail(400, "Malformed request body.", false);
  }

  const text = typeof body.text === "string" ? body.text.trim() : "";

  let imageBase64 = typeof body.imageBase64 === "string" ? body.imageBase64.trim() : "";
  if (imageBase64.startsWith("data:")) {
    const comma = imageBase64.indexOf(",");
    imageBase64 = comma >= 0 ? imageBase64.slice(comma + 1) : "";
  }
  if (imageBase64.length > MAX_IMAGE_BASE64) {
    return fail(413, "That image is over the 12 MB limit.", false);
  }

  if (!text && !imageBase64) {
    return fail(400, "Add some text or an image first.", false);
  }

  const mode: AnalysisMode =
    body.mode === "deep" || body.mode === "counter" ? body.mode : "quick";
  const focus = typeof body.focus === "string" ? body.focus.trim() : "";
  if (focus.length > 300) {
    return fail(400, "Keep the analysis focus under 300 characters.", false);
  }
  const outputLanguage = typeof body.outputLanguage === "string" ? body.outputLanguage.trim() : "";
  if (outputLanguage.length > 60) {
    return fail(400, "Keep the output language name under 60 characters.", false);
  }

  if (text.length > MAX_TEXT) {
    return fail(400, `That post is ${text.length} characters; the limit is ${MAX_TEXT}.`, false);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const out = await chat({
      userText: text,
      imageBase64: imageBase64 || undefined,
      mode,
      focus: focus || undefined,
      outputLanguage: outputLanguage || undefined,
      signal: controller.signal,
    });

    const result = parseAnalysis(out.text, {
      wallMs: out.wallMs,
      tokPerS: out.tokPerS,
      model: out.model,
      numCtx: out.numCtx,
      attempts: out.attempts,
      mode,
      outputLanguage: outputLanguage || undefined,
    }, text);

    return NextResponse.json(result, {
      headers: { "cache-control": "no-store" },
    });
  } catch (err) {
    if (err instanceof OllamaError) {
      return fail(err.status, err.message, true, err.detail);
    }
    const e = err as Error;
    return fail(
      500,
      "Something went wrong while analysing.",
      true,
      e?.message ?? String(err),
    );
  } finally {
    clearTimeout(timer);
  }
}
