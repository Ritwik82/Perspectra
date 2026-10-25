"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { InputPanel } from "@/components/InputPanel";
import { ReportCard } from "@/components/ReportCard";
import { ThemeToggle } from "@/components/ThemeToggle";
import { DebateArena } from "@/components/persona/DebateArena";
import type { AnalysisMode, AnalysisRun, AnalyzeError, AnalyzeResult } from "@/lib/types";

const MODES: AnalysisMode[] = ["quick", "deep", "counter"];
const EMPTY_STATES: AnalysisRun["states"] = { quick: "idle", deep: "idle", counter: "idle" };
const MAX_SESSION_RUNS = 3;

function fingerprint(values: string[]) {
  let hash = 2166136261;
  const source = values.map((value, index) => index === 2 && value.length > 512
    ? `${value.length}:${value.slice(0, 256)}:${value.slice(-256)}`
    : value).join("\u001f");
  for (let i = 0; i < source.length; i++) {
    hash ^= source.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `${source.length}:${(hash >>> 0).toString(16)}`;
}

export default function Page() {
  const [activeView, setActiveView] = useState<"analyzer" | "debate">("analyzer");
  const [text, setText] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [imageName, setImageName] = useState<string | null>(null);
  const [focus, setFocus] = useState("");
  const [outputLanguage, setOutputLanguage] = useState("");
  const [selectedModes, setSelectedModes] = useState<AnalysisMode[]>(["quick"]);
  const [mode, setMode] = useState<AnalysisMode>("quick");
  const [runs, setRuns] = useState<AnalysisRun[]>([]);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [loadingMode, setLoadingMode] = useState<AnalysisMode | null>(null);
  const [queueProgress, setQueueProgress] = useState<{ current: number; total: number; mode: AnalysisMode } | null>(null);
  const [lastCompletedMode, setLastCompletedMode] = useState<AnalysisMode | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [highlightedQuote, setHighlightedQuote] = useState("");
  const [error, setError] = useState<AnalyzeError | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const cancelQueueRef = useRef(false);

  const currentFingerprint = useMemo(
    () => fingerprint([text.trim(), imageName ?? "", image ?? "", focus.trim(), outputLanguage.trim()]),
    [text, imageName, image, focus, outputLanguage],
  );
  const activeRun = runs.find((run) => run.id === activeRunId) ?? null;
  const isStale = !!activeRun && activeRun.fingerprint !== currentFingerprint;
  const activeResult = mode === "quick" || mode === "deep" || mode === "counter"
    ? activeRun?.results[mode] ?? null
    : null;

  useEffect(() => {
    if (!highlightedQuote || !activeRun?.text.includes(highlightedQuote)) return;
    document.querySelector(".sx-source mark")?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "center",
    });
  }, [highlightedQuote, activeRun?.id]);

  useEffect(() => {
    if (!loadingMode) return;
    const started = Date.now();
    setElapsed(0);
    const id = window.setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 250);
    return () => window.clearInterval(id);
  }, [loadingMode]);

  function createRun(): AnalysisRun {
    const run: AnalysisRun = {
      id: crypto.randomUUID(),
      fingerprint: currentFingerprint,
      createdAt: Date.now(),
      text: text.trim(),
      imageName,
      imageData: image,
      focus: focus.trim(),
      outputLanguage: outputLanguage.trim(),
      results: {},
      states: { ...EMPTY_STATES },
      errors: {},
    };
    setRuns((existing) => [...existing, run].slice(-MAX_SESSION_RUNS));
    setActiveRunId(run.id);
    return run;
  }

  function toggleMode(target: AnalysisMode) {
    setSelectedModes((prev) => {
      if (prev.includes(target)) {
        if (prev.length <= 1) return prev;
        return prev.filter((m) => m !== target);
      }
      return MODES.filter((m) => prev.includes(m) || m === target);
    });
  }

  function stopAnalysis() {
    cancelQueueRef.current = true;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setLoadingMode(null);
    setQueueProgress(null);
  }

  async function executeMode(run: AnalysisRun, requestedMode: AnalysisMode): Promise<boolean> {
    setLoadingMode(requestedMode);
    setError(null);
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setRuns((existing) => existing.map((item) => item.id === run.id
      ? { ...item, states: { ...item.states, [requestedMode]: "running" }, errors: { ...item.errors, [requestedMode]: undefined } }
      : item));
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          text: run.text,
          imageBase64: run.imageData ?? undefined,
          mode: requestedMode,
          focus: run.focus || undefined,
          outputLanguage: run.outputLanguage || undefined,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw { error: payload?.error ?? "The analysis failed.", detail: payload?.detail, retryable: payload?.retryable ?? true };
      const result = payload as AnalyzeResult;
      setRuns((existing) => existing.map((item) => item.id === run.id
        ? { ...item, results: { ...item.results, [requestedMode]: result }, states: { ...item.states, [requestedMode]: "complete" } }
        : item));
      return true;
    } catch (caught) {
      if ((caught as any)?.name === "AbortError" || (caught instanceof DOMException && caught.name === "AbortError")) {
        setRuns((existing) => existing.map((item) => item.id === run.id
          ? { ...item, states: { ...item.states, [requestedMode]: "idle" } }
          : item));
        return false;
      }
      const failure = caught as AnalyzeError;
      const normalized = failure?.error ? failure : {
        error: "Could not reach the local analyser.",
        detail: "Check that the Perspectra server and Ollama are running, then retry this mode.",
        retryable: true,
      };
      setError(normalized);
      setRuns((existing) => existing.map((item) => item.id === run.id
        ? { ...item, states: { ...item.states, [requestedMode]: "error" }, errors: { ...item.errors, [requestedMode]: normalized } }
        : item));
      return false;
    } finally {
      setLoadingMode(null);
    }
  }

  async function generateSelected() {
    if ((!text.trim() && !image) || loadingMode || selectedModes.length === 0) return;
    cancelQueueRef.current = false;
    setLastCompletedMode(null);
    const run = activeRun && !isStale ? activeRun : createRun();

    const modesToRun = [...selectedModes];
    // If the currently viewed tab has no results yet, point it to the first mode to run
    if (!run.results[mode]) {
      setMode(modesToRun[0]);
    }

    for (let i = 0; i < modesToRun.length; i++) {
      if (cancelQueueRef.current) break;
      const targetMode = modesToRun[i];
      setQueueProgress({ current: i + 1, total: modesToRun.length, mode: targetMode });

      const success = await executeMode(run, targetMode);
      if (!success || cancelQueueRef.current) {
        break;
      }
      setLastCompletedMode(targetMode);
    }
    setQueueProgress(null);
  }

  async function generateSingleMode(singleMode: AnalysisMode) {
    if ((!text.trim() && !image) || loadingMode) return;
    cancelQueueRef.current = false;
    setLastCompletedMode(null);
    const run = activeRun && !isStale ? activeRun : createRun();
    setMode(singleMode);
    setQueueProgress({ current: 1, total: 1, mode: singleMode });
    await executeMode(run, singleMode);
    setQueueProgress(null);
  }

  function startFresh() {
    setRuns([]);
    setActiveRunId(null);
    setError(null);
    setText("");
    setImage(null);
    setImageName(null);
    setFocus("");
    setOutputLanguage("");
    setSelectedModes(["quick"]);
    setMode("quick");
    setQueueProgress(null);
    setLastCompletedMode(null);
  }

  const runIds = runs.map((run) => run.id);

  return (
    <main className="sx-shell">
      <header className="sx-head">
        <div className="sx-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon.png" alt="Perspectra" className="sx-logo-img" />
          <span className="sx-wordmark">Perspectra</span>
          <span className="sx-tagline">think clearly. see the whole picture.</span>
        </div>
        <div className="sx-head-actions">
          <span className="sx-privacy" title="Inference runs locally through Ollama"><Icon name="icon-info" size={13} />Local inference</span>
          <ThemeToggle />
        </div>
      </header>

      <nav className="sx-view-tabs" role="tablist" aria-label="Feature navigation">
        <button
          type="button"
          role="tab"
          aria-selected={activeView === "analyzer"}
          className={`sx-view-tab${activeView === "analyzer" ? " is-active" : ""}`}
          onClick={() => setActiveView("analyzer")}
        >
          <Icon name="icon-search-plus" size={15} />
          <span>Post Analyser</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeView === "debate"}
          className={`sx-view-tab${activeView === "debate" ? " is-active" : ""}`}
          onClick={() => setActiveView("debate")}
        >
          <Icon name="icon-people" size={16} />
          <span>Debate Arena</span>
          <span className="sx-tab-badge">4 Personas</span>
        </button>
      </nav>

      <div style={{ display: activeView === "debate" ? "block" : "none" }}>
        <DebateArena />
      </div>

      <div style={{ display: activeView === "analyzer" ? "block" : "none" }}>
        <section className="sx-intro" id="top">
          <h1 className="sx-h1">Before you believe or share it,<br /><span className="sx-h1-accent">see the full story.</span></h1>
          <p className="sx-lede">Check the main claims, see what proof is provided, and find out what the other side says.</p>
        </section>

      <InputPanel
        text={text}
        setText={setText}
        image={image}
        imageName={imageName}
        setImage={(value, name) => { setImage(value); setImageName(name ?? null); }}
        onSubmit={generateSelected}
        onStop={stopAnalysis}
        onReset={startFresh}
        loading={!!loadingMode}
        hasResult={!!activeRun}
        selectedModes={selectedModes}
        onToggleMode={toggleMode}
        loadingMode={loadingMode}
        queueProgress={queueProgress}
        focus={focus}
        setFocus={setFocus}
        outputLanguage={outputLanguage}
        setOutputLanguage={setOutputLanguage}
      />

      {activeRun && (
        <section className="sx-workspace" aria-labelledby="sx-workspace-heading">
          <div className="sx-workspace-heading">
            <div>
              <h2 id="sx-workspace-heading">Your reading</h2>
              <p>{activeRun.imageName || (activeRun.text ? `${activeRun.text.length.toLocaleString()} characters` : "Screenshot analysis")} · {new Date(activeRun.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
            </div>
            {isStale && <span className="sx-stale-badge">Out of date · source changed</span>}
          </div>

          {runIds.length > 1 && (
            <div className="sx-run-tabs" role="tablist" aria-label="Submitted posts">
              {runs.map((run, index) => (
                <button key={run.id} role="tab" aria-selected={run.id === activeRunId} onClick={() => setActiveRunId(run.id)}>
                  Reading {index + 1}{run.fingerprint !== currentFingerprint ? " · old input" : ""}
                </button>
              ))}
            </div>
          )}

          <div className="sx-source-analysis">
            <aside className="sx-source" aria-label="Source post">
              <div className="sx-source-head">
                <span className="sx-source-badge">
                  <Icon name="icon-file" size={13} />
                  <span>Original Post</span>
                </span>
                {activeRun.text && (
                  <span className="sx-source-count">{activeRun.text.length.toLocaleString()} chars</span>
                )}
              </div>
              {activeRun.imageName && activeRun.imageData && (
                <img className="sx-source-image" src={activeRun.imageData} alt={`Submitted screenshot: ${activeRun.imageName}`} />
              )}
              {activeRun.text && (
                <p id="sx-source-post">
                  {highlightedQuote && activeRun.text.includes(highlightedQuote) ? (
                    <>
                      {activeRun.text.slice(0, activeRun.text.indexOf(highlightedQuote))}
                      <mark>{highlightedQuote}</mark>
                      {activeRun.text.slice(activeRun.text.indexOf(highlightedQuote) + highlightedQuote.length)}
                    </>
                  ) : (
                    activeRun.text
                  )}
                </p>
              )}
              {activeRun.imageName && <p className="sx-source-filename">Image: {activeRun.imageName}</p>}
              {(activeRun.focus || activeRun.outputLanguage) && (
                <div className="sx-source-options">
                  {activeRun.focus && <p><b>Focus:</b> {activeRun.focus}</p>}
                  {activeRun.outputLanguage && <p><b>Response language:</b> {activeRun.outputLanguage}</p>}
                </div>
              )}
              {isStale && <p className="sx-stale-note">The editor has changed. These results still refer to the submitted version above.</p>}
            </aside>

            <div className="sx-analysis-column">
              <div className="sx-result-tabs" role="tablist" aria-label="Analysis mode results">
                {MODES.map((item) => {
                  const state = activeRun.states[item];
                  const hasResult = !!activeRun.results[item];
                  const isTabRunning = loadingMode === item;
                  return (
                    <button
                      key={item}
                      id={`sx-tab-${activeRun.id}-${item}`}
                      role="tab"
                      aria-controls={`sx-panel-${activeRun.id}-${item}`}
                      aria-selected={mode === item}
                      className={`sx-mode-tab is-${item}${mode === item ? " is-active" : ""}`}
                      tabIndex={mode === item ? 0 : -1}
                      onKeyDown={(event) => {
                        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
                        event.preventDefault();
                        const current = MODES.indexOf(item);
                        const next = event.key === "Home" ? MODES[0] : event.key === "End" ? MODES[2] : MODES[(current + (event.key === "ArrowRight" ? 1 : 2)) % 3];
                        setMode(next);
                        document.getElementById(`sx-tab-${activeRun.id}-${next}`)?.focus();
                      }}
                      onClick={() => {
                        setMode(item);
                        if (lastCompletedMode === item) setLastCompletedMode(null);
                      }}
                    >
                      <span className="sx-tab-title">{item === "quick" ? "Quick Summary" : item === "deep" ? "Deep Check" : "Other Side"}</span>
                      <span className={`sx-tab-state is-${hasResult ? "complete" : isTabRunning ? "running" : state}`}>
                        {hasResult ? "Ready" : isTabRunning ? "Running" : state === "queued" ? "Queued" : state === "error" ? "Failed" : "Not run"}
                      </span>
                    </button>
                  );
                })}
              </div>

              {loadingMode && mode !== loadingMode && (
                <div className="sx-background-task-banner" role="status" aria-live="polite">
                  <span className="sx-loading-dot" />
                  <span className="sx-banner-text">
                    Generating <strong>{loadingMode === "deep" ? "Deep" : loadingMode === "counter" ? "Counter" : "Quick"}</strong> analysis in background{queueProgress && queueProgress.total > 1 ? ` (${queueProgress.current} of ${queueProgress.total})` : ""}... ({elapsed}s)
                  </span>
                  <button
                    type="button"
                    className="sx-tab-switch-btn"
                    onClick={() => setMode(loadingMode)}
                  >
                    View {loadingMode} tab
                  </button>
                </div>
              )}

              {lastCompletedMode && lastCompletedMode !== mode && activeRun?.results[lastCompletedMode] && (
                <div className="sx-ready-banner">
                  <span>
                    <Icon name="icon-check" size={14} /> <strong>{lastCompletedMode === "deep" ? "Deep" : lastCompletedMode === "counter" ? "Counter" : "Quick"}</strong> analysis is ready to view.
                  </span>
                  <button
                    type="button"
                    className="sx-tab-switch-btn"
                    onClick={() => {
                      setMode(lastCompletedMode);
                      setLastCompletedMode(null);
                    }}
                  >
                    Switch to {lastCompletedMode}
                  </button>
                </div>
              )}

              {error && (
                <section className="sx-error" role="alert">
                  <p className="sx-error-title">{error.error}</p>
                  {error.detail && <p className="sx-error-detail">{error.detail}</p>}
                  <button className="sx-ghost-btn" onClick={() => generateSingleMode(mode)}>Retry {mode}</button>
                </section>
              )}

              <div id={`sx-panel-${activeRun.id}-${mode}`} role="tabpanel" aria-labelledby={`sx-tab-${activeRun.id}-${mode}`}>
                {activeResult ? (
                  <ReportCard
                    key={`${activeRun.id}-${mode}`}
                    result={activeResult}
                    sourceText={activeRun.text}
                    onEvidenceSelect={setHighlightedQuote}
                  />
                ) : loadingMode === mode ? (
                  <div className="sx-loading-hero-card" role="status" aria-live="polite">
                    <div className="sx-loading-pulse-ring">
                      <span className="sx-loading-spinner" />
                    </div>
                    <div className="sx-loading-hero-info">
                      <h4>Checking {mode === "deep" ? "Deep Check" : mode === "counter" ? "Other Side" : "Quick Summary"}…</h4>
                      <p>Local Gemma model is evaluating the claims, proof, and reasoning ({elapsed}s elapsed).</p>
                      <div className="sx-loading-hero-meta">
                        <span className="sx-loading-badge">Local Inference</span>
                        <span>Ollama gemma4:e2b</span>
                      </div>
                    </div>
                  </div>
                ) : !error ? (
                  <div className="sx-mode-empty">
                    <div className="sx-mode-empty-top">
                      <span className="sx-mode-empty-icon">
                        <Icon name={mode === "deep" ? "icon-depth" : mode === "counter" ? "icon-branch" : "icon-bolt"} size={20} />
                      </span>
                      <strong>{mode === "quick" ? "Quick Summary" : mode === "deep" ? "Deep Check" : "Other Side"} has not been run yet.</strong>
                    </div>
                    <p className="sx-mode-empty-desc">
                      {mode === "quick"
                        ? "Get the main points and what you need to know in seconds."
                        : mode === "deep"
                        ? "A thorough check of claims, evidence, and whether the reasoning holds up."
                        : "The strongest counter-arguments, opposing views, and what proof would settle the debate."}
                    </p>
                    <button type="button" className="sx-btn sx-btn-sm" onClick={() => generateSingleMode(mode)}>
                      <Icon name="icon-search-plus" size={13} />
                      <span>Run {mode === "deep" ? "Deep Check" : mode === "counter" ? "Other Side" : "Quick Summary"}</span>
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </section>
      )}
      </div>

      <footer className="sx-foot"><p>Local inference through Ollama. Perspectra can examine reasoning; it does not independently verify current facts or know an author’s intent.</p></footer>
    </main>
  );
}
