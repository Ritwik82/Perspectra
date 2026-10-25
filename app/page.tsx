"use client";

import { useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/Icon";
import { InputPanel } from "@/components/InputPanel";
import { ReportCard } from "@/components/ReportCard";
import { ThemeToggle } from "@/components/ThemeToggle";
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
  const [text, setText] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [imageName, setImageName] = useState<string | null>(null);
  const [focus, setFocus] = useState("");
  const [outputLanguage, setOutputLanguage] = useState("");
  const [mode, setMode] = useState<AnalysisMode>("quick");
  const [runs, setRuns] = useState<AnalysisRun[]>([]);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [loadingMode, setLoadingMode] = useState<AnalysisMode | null>(null);
  const [batchPosition, setBatchPosition] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [highlightedQuote, setHighlightedQuote] = useState("");
  const [error, setError] = useState<AnalyzeError | null>(null);

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

  async function executeMode(run: AnalysisRun, requestedMode: AnalysisMode): Promise<boolean> {
    setLoadingMode(requestedMode);
    setError(null);
    setRuns((existing) => existing.map((item) => item.id === run.id
      ? { ...item, states: { ...item.states, [requestedMode]: "running" }, errors: { ...item.errors, [requestedMode]: undefined } }
      : item));
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
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
    if ((!text.trim() && !image) || loadingMode) return;
    const run = activeRun && !isStale ? activeRun : createRun();
    await executeMode(run, mode);
  }

  async function generateAll() {
    if ((!text.trim() && !image) || loadingMode) return;
    const run = activeRun && !isStale ? activeRun : createRun();
    const missing = MODES.filter((item) => !run.results[item]);
    for (let index = 0; index < missing.length; index++) {
      const nextMode = missing[index];
      setMode(nextMode);
      setBatchPosition(index + 1);
      setRuns((existing) => existing.map((item) => item.id === run.id
        ? { ...item, states: { ...item.states, [nextMode]: "queued" } }
        : item));
      const succeeded = await executeMode(run, nextMode);
      if (!succeeded) break;
    }
    setBatchPosition(0);
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
    setMode("quick");
  }

  const runIds = runs.map((run) => run.id);

  return (
    <main className="sx-shell">
      <header className="sx-head">
        <a className="sx-brand" href="#top">
          <span className="sx-logo"><Icon name="icon-logo-search" size={18} /></span>
          <span className="sx-wordmark">Perspectra</span>
          <span className="sx-tagline">think clearly. see the whole picture.</span>
        </a>
        <div className="sx-head-actions">
          <span className="sx-privacy" title="Inference runs locally through Ollama"><Icon name="icon-info" size={13} />Local inference</span>
          <ThemeToggle />
        </div>
      </header>

      <section className="sx-intro" id="top">
        <h1 className="sx-h1">Before you believe it,<br /><span>take a closer look.</span></h1>
        <p className="sx-lede">Read the claim. Inspect what supports it. Keep the context that changes what it means.</p>
      </section>

      <InputPanel
        text={text}
        setText={setText}
        image={image}
        imageName={imageName}
        setImage={(value, name) => { setImage(value); setImageName(name ?? null); }}
        onSubmit={generateSelected}
        onReset={startFresh}
        loading={!!loadingMode}
        hasResult={!!activeRun}
        mode={mode}
        setMode={setMode}
        focus={focus}
        setFocus={setFocus}
        outputLanguage={outputLanguage}
        setOutputLanguage={setOutputLanguage}
        onGenerateAll={generateAll}
        batchRunning={!!loadingMode && batchPosition > 0}
        batchPosition={batchPosition}
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
              <h3>The post</h3>
              {activeRun.imageName && activeRun.imageData && <img className="sx-source-image" src={activeRun.imageData} alt={`Submitted screenshot: ${activeRun.imageName}`} />}
              {activeRun.text && <p id="sx-source-post">{highlightedQuote && activeRun.text.includes(highlightedQuote)
                ? <>{activeRun.text.slice(0, activeRun.text.indexOf(highlightedQuote))}<mark>{highlightedQuote}</mark>{activeRun.text.slice(activeRun.text.indexOf(highlightedQuote) + highlightedQuote.length)}</>
                : activeRun.text}</p>}
              {activeRun.imageName && <p className="sx-source-filename">Image: {activeRun.imageName}</p>}
              {(activeRun.focus || activeRun.outputLanguage) && <div className="sx-source-options">
                {activeRun.focus && <p><b>Focus:</b> {activeRun.focus}</p>}
                {activeRun.outputLanguage && <p><b>Response language:</b> {activeRun.outputLanguage}</p>}
              </div>}
              {isStale && <p className="sx-stale-note">The editor has changed. These results still refer to the submitted version above.</p>}
            </aside>

            <div className="sx-analysis-column">
              <div className="sx-result-tabs" role="tablist" aria-label="Analysis mode results">
                {MODES.map((item) => {
                  const state = activeRun.states[item];
                  const hasResult = !!activeRun.results[item];
                  return <button key={item} id={`sx-tab-${activeRun.id}-${item}`} role="tab" aria-controls={`sx-panel-${activeRun.id}-${item}`} aria-selected={mode === item} tabIndex={mode === item ? 0 : -1} onKeyDown={(event) => {
                    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
                    event.preventDefault();
                    const current = MODES.indexOf(item);
                    const next = event.key === "Home" ? MODES[0] : event.key === "End" ? MODES[2] : MODES[(current + (event.key === "ArrowRight" ? 1 : 2)) % 3];
                    setMode(next);
                    document.getElementById(`sx-tab-${activeRun.id}-${next}`)?.focus();
                  }} onClick={() => setMode(item)}>
                    <span>{item === "quick" ? "Quick" : item === "deep" ? "Deep" : "Counter"}</span>
                    <span className={`sx-tab-state is-${state}`}>{hasResult ? "Ready" : state === "running" ? "Running" : state === "queued" ? "Queued" : state === "error" ? "Failed" : "Not run"}</span>
                  </button>;
                })}
              </div>

              {loadingMode && <div className="sx-loading sx-loading-inline" role="status" aria-live="polite">
                <span className="sx-loading-dot" />
                <span className="sx-loading-text">{batchPosition ? `Generating ${loadingMode} · ${batchPosition} of 3` : `Generating ${loadingMode} analysis`}</span>
                <span className="sx-loading-time">{elapsed}s</span>
              </div>}

              {error && <section className="sx-error" role="alert"><p className="sx-error-title">{error.error}</p>{error.detail && <p className="sx-error-detail">{error.detail}</p>}<button className="sx-ghost-btn" onClick={generateSelected}>Retry {mode}</button></section>}

              <div id={`sx-panel-${activeRun.id}-${mode}`} role="tabpanel" aria-labelledby={`sx-tab-${activeRun.id}-${mode}`}>
                {activeResult && !loadingMode && <ReportCard key={`${activeRun.id}-${mode}`} result={activeResult} sourceText={activeRun.text} onEvidenceSelect={setHighlightedQuote} />}
                {!activeResult && !loadingMode && !error && <div className="sx-mode-empty"><span>{mode === "quick" ? "A quick read, when you want it." : mode === "deep" ? "A closer examination, when you ask for it." : "The strongest fair challenge, when you need it."}</span><button className="sx-inline-action" onClick={generateSelected}>Generate {mode} <Icon name="icon-arrow-right" size={14} /></button></div>}
              </div>
            </div>
          </div>
        </section>
      )}

      {!loadingMode && <section className="sx-perspectives" aria-labelledby="sx-perspectives-title">
        <div><p className="sx-perspectives-kicker">Future direction</p><h2 id="sx-perspectives-title">More than one point of view.</h2><p>Explore different perspectives on a claim. This feature is not active yet.</p></div>
        <span className="sx-coming-soon">Coming later</span>
      </section>}

      <footer className="sx-foot"><p>Local inference through Ollama. Perspectra can examine reasoning; it does not independently verify current facts or know an author’s intent.</p></footer>
    </main>
  );
}
