import { NextResponse } from "next/server";
import { getDebateEvaluationPrompt, PERSONAS } from "@/lib/persona-prompts";
import type { DebateEvaluation, PersonaId } from "@/lib/persona-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const OLLAMA_URL = (process.env.OLLAMA_URL ?? "http://localhost:11434").replace(/\/+$/, "");
const MODEL = process.env.OLLAMA_MODEL ?? "gemma4:e2b";
const NUM_CTX = Number(process.env.OLLAMA_NUM_CTX ?? 16384);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { personaId, topic, messages } = body as {
      personaId: PersonaId;
      topic: string;
      messages: Array<{ role: "user" | "assistant"; content: string }>;
    };

    if (!topic || !messages || messages.length === 0) {
      return NextResponse.json({ error: "A valid debate transcript is required to evaluate." }, { status: 400 });
    }

    const personaName = PERSONAS[personaId]?.name ?? "Opposing Persona";

    // Format full transcript
    const transcriptText = messages
      .map((m, idx) => `[Turn ${idx + 1}] ${m.role === "user" ? "User" : personaName}:\n"${m.content}"`)
      .join("\n\n");

    const evaluationPrompt = getDebateEvaluationPrompt(topic, transcriptText);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 180_000);

    const res = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        model: MODEL,
        stream: false,
        format: "json",
        messages: [
          { role: "system", content: "You are an expert impartial critical thinking judge. Respond ONLY in valid JSON matching the user schema." },
          { role: "user", content: evaluationPrompt },
        ],
        options: {
          num_ctx: NUM_CTX,
          temperature: 0.2, // Low temperature for calibrated, consistent evaluation
        },
      }),
    });

    clearTimeout(timeout);

    if (!res.ok) {
      const errorText = await res.text().catch(() => "");
      return NextResponse.json(
        { error: `Ollama evaluator error ${res.status}`, detail: errorText },
        { status: 502 }
      );
    }

    const data = await res.json();
    const rawContent = data?.message?.content || "{}";

    let parsed: Partial<DebateEvaluation>;
    try {
      parsed = JSON.parse(rawContent);
    } catch {
      // Fallback extraction
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Could not parse JSON evaluation from model.");
      }
    }

    const result: DebateEvaluation = {
      topic,
      headline: parsed.headline || "Debate Reasoning Evaluation",
      summary: parsed.summary || "Evaluation completed for this debate exchange.",
      personaClaims: Array.isArray(parsed.personaClaims) ? parsed.personaClaims : [],
      userClaims: Array.isArray(parsed.userClaims) ? parsed.userClaims : [],
      fallaciesIdentified: Array.isArray(parsed.fallaciesIdentified) ? parsed.fallaciesIdentified : [],
      steelmannedConsensus: parsed.steelmannedConsensus || "Both parties presented compelling points.",
      whatWouldSettleIt: parsed.whatWouldSettleIt || "Empirical longitudinal observation.",
      personaScore: typeof parsed.personaScore === "number" ? parsed.personaScore : null,
      userScore: typeof parsed.userScore === "number" ? parsed.userScore : null,
      refereeVerdict: parsed.refereeVerdict || "Both sides defended their positions with distinct reasoning styles.",
      criticalThinkingTakeaway: parsed.criticalThinkingTakeaway || "Question the framing of complex disputes.",
      raw: rawContent,
    };

    return NextResponse.json(result);
  } catch (err: unknown) {
    const e = err as Error;
    return NextResponse.json(
      { error: "Failed to evaluate debate.", detail: e?.message || String(err) },
      { status: 500 }
    );
  }
}
