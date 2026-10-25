"use client";

import { useEffect, useRef, useState } from "react";
import { PersonaSelector } from "./PersonaSelector";
import { DebateEvaluationCard } from "./DebateEvaluationCard";
import { PERSONAS } from "@/lib/persona-prompts";
import type { ChatMessage, DebateEvaluation, PersonaId } from "@/lib/persona-types";
import { Icon } from "../Icon";

export function DebateArena() {
  const [personaId, setPersonaId] = useState<PersonaId>("conspiracy");
  const [topic, setTopic] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isDebating, setIsDebating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState<DebateEvaluation | null>(null);
  const [error, setError] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const selectedPersona = PERSONAS[personaId];

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  function stopGenerating() {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
    setIsEvaluating(false);
  }

  async function startDebate(chosenTopic?: string) {
    const activeTopic = chosenTopic || topic;
    if (!activeTopic.trim()) {
      setError("Please enter or pick a topic to debate.");
      return;
    }

    setError(null);
    setIsDebating(true);
    setEvaluation(null);
    setMessages([]);
    setIsLoading(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const res = await fetch("/api/persona/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          personaId,
          topic: activeTopic.trim(),
          messages: [],
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || err.error || "Failed to start debate.");
      }

      const data = await res.json();
      setMessages([
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data.content,
          timestamp: Date.now(),
        },
      ]);
    } catch (err: unknown) {
      if ((err as Error)?.name === "AbortError") return;
      setError((err as Error)?.message || "Failed to connect to persona.");
      setIsDebating(false);
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }

  async function sendMessage() {
    if (!inputMessage.trim() || isLoading) return;

    const userText = inputMessage.trim();
    setInputMessage("");
    setError(null);

    const updatedMessages: ChatMessage[] = [
      ...messages,
      {
        id: crypto.randomUUID(),
        role: "user",
        content: userText,
        timestamp: Date.now(),
      },
    ];

    setMessages(updatedMessages);
    setIsLoading(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const res = await fetch("/api/persona/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          personaId,
          topic: topic.trim(),
          messages: updatedMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || err.error || "Persona failed to reply.");
      }

      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data.content,
          timestamp: Date.now(),
        },
      ]);
    } catch (err: unknown) {
      if ((err as Error)?.name === "AbortError") return;
      setError((err as Error)?.message || "Error communicating with persona.");
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }

  async function analyzeDebate() {
    if (messages.length < 2 || isEvaluating) return;

    setIsEvaluating(true);
    setError(null);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const res = await fetch("/api/persona/evaluate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          personaId,
          topic: topic.trim(),
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || err.error || "Debate evaluation failed.");
      }

      const data = (await res.json()) as DebateEvaluation;
      setEvaluation(data);
    } catch (err: unknown) {
      if ((err as Error)?.name === "AbortError") return;
      setError((err as Error)?.message || "Failed to analyze debate.");
    } finally {
      setIsEvaluating(false);
      abortControllerRef.current = null;
    }
  }

  function handleReset() {
    setIsDebating(false);
    setEvaluation(null);
    setMessages([]);
    setInputMessage("");
    setError(null);
  }

  return (
    <div className="sx-debate-arena">
      {!isDebating && (
        <section className="sx-debate-setup">
          <div className="sx-input-heading">
            <span className="sx-input-icon">
              <Icon name="icon-people" size={18} />
            </span>
            <label>Choose who you want to debate with</label>
          </div>
          <p className="sx-lede" style={{ marginBottom: "20px" }}>
            Select an archetype with distinct assumptions and biases. Stress-test your own ideas, then click &ldquo;Analyse Debate&rdquo; to get an impartial referee score.
          </p>

          <PersonaSelector selectedId={personaId} onSelect={setPersonaId} disabled={isLoading} />

          <div className="sx-topic-section">
            <label htmlFor="debate-topic-input">Enter debate topic or controversial claim</label>
            <div className="sx-topic-input-wrapper">
              <input
                id="debate-topic-input"
                className="sx-focus-input sx-topic-input"
                placeholder="e.g. Do tech companies manipulate algorithms on purpose?"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && startDebate()}
                disabled={isLoading}
              />
              <button
                type="button"
                className="sx-btn"
                onClick={() => startDebate()}
                disabled={!topic.trim() || isLoading}
              >
                <span>{isLoading ? "Preparing opening..." : "Begin Debate"}</span>
                <Icon name="icon-arrow-right" size={14} />
              </button>
            </div>

            <div className="sx-starter-topics">
              <span className="sx-starter-label">Starter topics for {selectedPersona?.name}:</span>
              <div className="sx-starter-chips">
                {selectedPersona?.starterTopics.map((starter, i) => (
                  <button
                    key={i}
                    type="button"
                    className="sx-starter-chip"
                    onClick={() => {
                      setTopic(starter);
                      startDebate(starter);
                    }}
                    disabled={isLoading}
                  >
                    {starter}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {isDebating && !evaluation && (
        <section className="sx-debate-live">
          <header className="sx-debate-live-head">
            <div className="sx-debate-live-meta">
              <span
                className="sx-persona-badge"
                style={{ backgroundColor: `${selectedPersona.accentColor}25`, color: selectedPersona.accentColor }}
              >
                Debating: {selectedPersona.name}
              </span>
              <h2 className="sx-debate-live-topic">&ldquo;{topic}&rdquo;</h2>
            </div>
            <div className="sx-debate-live-actions">
              {messages.length >= 2 && (
                <button
                  type="button"
                  className="sx-btn sx-btn-eval"
                  onClick={analyzeDebate}
                  disabled={isEvaluating || isLoading}
                >
                  <Icon name="icon-search-plus" size={14} />
                  <span>{isEvaluating ? "Evaluating debate..." : "Analyse Debate"}</span>
                </button>
              )}
              <button type="button" className="sx-ghost-btn" onClick={handleReset} disabled={isLoading || isEvaluating}>
                <Icon name="icon-plus" size={14} />
                <span>New Topic</span>
              </button>
            </div>
          </header>

          <div className="sx-debate-chat-window">
            {messages.map((m) => {
              const isUser = m.role === "user";
              return (
                <div key={m.id} className={`sx-chat-msg ${isUser ? "is-user" : "is-persona"}`}>
                  <div className="sx-chat-bubble">
                    <div className="sx-chat-sender">
                      <span>{isUser ? "You" : selectedPersona.name}</span>
                      <time>{new Date(m.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time>
                    </div>
                    <div className="sx-chat-text">{m.content}</div>
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div className="sx-chat-msg is-persona">
                <div className="sx-chat-bubble sx-chat-typing">
                  <span className="sx-loading-dot" />
                  <span>{selectedPersona.name} is writing a response...</span>
                  <button type="button" className="sx-inline-stop-btn" onClick={stopGenerating}>
                    <Icon name="icon-close" size={12} />
                    <span>Stop</span>
                  </button>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="sx-debate-input-row">
            <input
              type="text"
              className="sx-focus-input sx-debate-chat-input"
              placeholder={`Argue your point with ${selectedPersona.name}... (Press Enter)`}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
              disabled={isLoading || isEvaluating}
            />
            {isLoading ? (
              <button type="button" className="sx-btn sx-btn-stop" onClick={stopGenerating}>
                <Icon name="icon-close" size={14} />
                <span>Stop</span>
              </button>
            ) : (
              <button
                type="button"
                className="sx-btn"
                onClick={sendMessage}
                disabled={!inputMessage.trim() || isLoading}
              >
                <span>Send</span>
                <Icon name="icon-arrow-right" size={14} />
              </button>
            )}
          </div>
        </section>
      )}

      {evaluation && (
        <section className="sx-debate-evaluation-view">
          <DebateEvaluationCard evaluation={evaluation} personaId={personaId} onReset={handleReset} />
        </section>
      )}

      {error && (
        <div className="sx-error" role="alert" style={{ marginTop: "16px" }}>
          <p className="sx-error-title">Debate Arena Notice</p>
          <p className="sx-error-detail">{error}</p>
        </div>
      )}
    </div>
  );
}
