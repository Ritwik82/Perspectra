"use client";

import type { AnalyzeResult } from "@/lib/types";
import { toMarkdown } from "@/lib/parse";
import { EmptyState } from "./EmptyState";
import { Icon } from "./Icon";
import { OtherSidePanel } from "./OtherSidePanel";
import { VerdictBadge } from "./VerdictBadge";

function SourceMatch({ quote, sourceText }: { quote: string; sourceText: string }) {
  const found = !!quote && sourceText.includes(quote);
  return <span className={found ? "sx-evidence-match" : "sx-evidence-unmatched"}>{found ? "Exact quote in post" : "Exact span not found in pasted text"}</span>;
}

function download(markdown: string) {
  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `perspectra-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.md`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function ReportCard({ result, sourceText = "", onEvidenceSelect }: { result: AnalyzeResult; sourceText?: string; onEvidenceSelect?: (quote: string) => void }) {
  const seconds = (result.meta.wallMs / 1000).toFixed(1);
  const score = result.score;
  const scoreApplicable = score !== null;

  return (
    <article className="sx-report" aria-live="polite">
      <header className="sx-report-head">
        {result.verdict && <VerdictBadge verdict={result.verdict} />}

        <div className="sx-score" aria-label={scoreApplicable ? `Evidence score ${score} out of 10` : "Evidence score not applicable"}>
          <span className="sx-score-num">
            {scoreApplicable ? score : "N/A"}
            {scoreApplicable && <span className="sx-score-den">/10</span>}
          </span>
          {scoreApplicable && <span className="sx-score-track"><i style={{ width: `${score * 10}%` }} /></span>}
          {!scoreApplicable && <span className="sx-score-na">Not applicable</span>}
        </div>

        <span className="sx-meta">
          {result.meta.model} · {seconds}s · {result.meta.tokPerS} tok/s · {result.mode}
          {result.meta.attempts > 1 ? ` · ${result.meta.attempts} passes` : ""}
        </span>
      </header>

      {result.parseFailed && (
        <div className="sx-warn-box">
          <strong>The response did not pass structure validation.</strong> Treat the result as incomplete; inspect the raw model output before relying on it.
        </div>
      )}

      <div className="sx-report-opening">
        <div><span className="sx-report-mode">{result.contentType} · {result.sourceLanguage} → {result.responseLanguage}</span><span className="sx-report-opening-title">{result.headline || "A closer look"}</span></div>
      </div>

      {result.summary && <p className="sx-report-summary">{result.summary}</p>}

      {result.sections.map((section, index) => <section className="sx-block sx-adaptive-section" key={`${section.heading}-${index}`}>
        <h2 className="sx-label">{section.heading}</h2>
        {section.body && <p className="sx-adaptive-body">{section.body}</p>}
        {section.evidence.length > 0 && <ul className="sx-evidence-list">{section.evidence.map((evidence, i) => <li key={`${evidence.quote}-${i}`}>
          <blockquote>{evidence.quote}</blockquote>
          {(evidence.speaker || evidence.note) && <p>{evidence.speaker && <b>{evidence.speaker}</b>} {evidence.note}</p>}
          {sourceText && evidence.quote && <button type="button" className="sx-evidence-jump" onClick={() => onEvidenceSelect?.(evidence.quote)} aria-label={`Show source span: ${evidence.quote}`}>
            {sourceText.includes(evidence.quote) ? "Show in post" : "Exact source span unavailable"}
          </button>}
        </li>)}</ul>}
      </section>)}

      {!result.sections.length && result.claim && <section className="sx-block"><h2 className="sx-label">What it claims</h2><p className="sx-claim">{result.claim}</p></section>}
      {result.scoreRationale && <p className="sx-score-rationale">{result.scoreRationale}</p>}

      {result.counterArguments.length > 0 && <section className="sx-block sx-counter-list"><h2 className="sx-label">Reasonable challenges</h2><ol>{result.counterArguments.map((item, index) => <li key={index}>{item}</li>)}</ol></section>}

      {result.noSignal && <section className="sx-block">
        <EmptyState />
      </section>}

      {!result.noSignal && result.tactics.length > 0 && <section className="sx-block"><h2 className="sx-label">Rhetorical moves</h2><ul className="sx-tactics">{result.tactics.map((tactic, i) => <li key={i} className="sx-tactic"><span className="sx-tactic-name">{tactic.name}</span><blockquote className="sx-tactic-quote">&ldquo;{tactic.quote}&rdquo;</blockquote>{sourceText && <p className="sx-evidence-match">{sourceText.includes(tactic.quote) ? <button type="button" className="sx-evidence-jump" onClick={() => onEvidenceSelect?.(tactic.quote)}>Show in post</button> : "Exact span could not be matched to pasted text."}</p>}</li>)}</ul></section>}

      {!result.noSignal && (result.counterView.steelman || result.counterView.settlingEvidence) && <OtherSidePanel counterView={result.counterView} mode={result.mode} />}

      <footer className="sx-report-foot">
        <p className="sx-confidence">
        {result.confidence.level && (
            <span className="sx-confidence-level" data-level={result.confidence.level.toLowerCase()}>
              {result.confidence.level} confidence
            </span>
          )}
          {result.confidence.why && <span>{result.confidence.why}</span>}
        </p>

        <div className="sx-report-tools">
          <button type="button" className="sx-ghost-btn" onClick={() => download(toMarkdown(result))}>
            <Icon name="icon-download" size={13} />
            <span>Export</span>
          </button>
          <details className="sx-raw">
            <summary>Full model output</summary>
            <pre>{result.raw}</pre>
          </details>
        </div>
      </footer>
    </article>
  );
}
