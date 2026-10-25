import { NextResponse } from "next/server";
import { getPersonaPrompt, PERSONAS } from "@/lib/persona-prompts";
import type { PersonaId } from "@/lib/persona-types";

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

    if (!personaId || !PERSONAS[personaId]) {
      return NextResponse.json({ error: "Invalid persona specified." }, { status: 400 });
    }

    if (!topic || typeof topic !== "string" || !topic.trim()) {
      return NextResponse.json({ error: "A debate topic or claim is required." }, { status: 400 });
    }

    const systemPrompt = getPersonaPrompt(personaId, topic.trim());

    // Format chat messages for Ollama /api/chat
    const formattedMessages = [
      { role: "system", content: systemPrompt },
      ...(messages || []).map((m) => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.content,
      })),
    ];

    // If starting debate (no messages yet), ask persona to provide its opening statement
    if (!messages || messages.length === 0) {
      formattedMessages.push({
        role: "user",
        content: `Let us begin the debate on the topic: "${topic.trim()}". What is your opening argument?`,
      });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120_000);

    const res = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        model: MODEL,
        stream: false,
        messages: formattedMessages,
        options: {
          num_ctx: NUM_CTX,
          temperature: 0.7, // Slightly higher temperature for engaging, authentic personality
        },
      }),
    });

    clearTimeout(timeout);

    if (!res.ok) {
      const errorText = await res.text().catch(() => "");
      return NextResponse.json(
        { error: `Ollama returned error ${res.status}`, detail: errorText },
        { status: 502 }
      );
    }

    const data = await res.json();
    const replyContent = data?.message?.content || "(The persona did not offer a response.)";

    return NextResponse.json({
      content: replyContent,
      personaId,
      model: MODEL,
    });
  } catch (err: unknown) {
    const e = err as Error;
    return NextResponse.json(
      { error: "Failed to generate persona response.", detail: e?.message || String(err) },
      { status: 500 }
    );
  }
}
