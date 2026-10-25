"use client";

import type { DebateEvaluation } from "@/lib/persona-types";
import { PERSONAS } from "@/lib/persona-prompts";
import type { PersonaId } from "@/lib/persona-types";
import { Icon } from "../Icon";

export function DebateEvaluationCard({
  evaluation,
  personaId,
  onReset,
  onBackToChat,
}: {
  evaluation: DebateEvaluation;
  personaId: PersonaId;
  onReset: () => void;
  onBackToChat: () => void;
}) {
  const persona = PERSONAS[personaId];

  return (
    <article className="sx-report sx-debate-eval-card" aria-live="polite">
      <div className="sx-debate-eval-top-bar">
        <button
          type="button"
          className="sx-btn sx-btn-secondary sx-back-btn"
          onClick={onBackToChat}
          title="Return to the conversation transcript"
        >
          <Icon name="icon-arrow-left" size={14} />
          <span>Back to Debate Chat</span>
        </button>
        <button
          type="button"
          className="sx-ghost-btn"
          onClick={onReset}
        >
          <Icon name="icon-plus" size={13} />
          <span>New Debate</span>
        </button>
      </div>

      <header className="sx-report-head">
        <div className="sx-debate-eval-verdict">
          <span className="sx-debate-eval-badge">Referee Evaluation</span>
          <p className="sx-debate-eval-title">{evaluation.headline}</p>
        </div>

        <div className="sx-debate-scores-row">
          <div className="sx-debate-score-box">
            <span className="sx-debate-score-label">You (User)</span>
            <div className="sx-score">
              <span className="sx-score-num">
                {evaluation.userScore !== null ? evaluation.userScore : "—"}
                <span className="sx-score-den">/10</span>
              </span>
              {evaluation.userScore !== null && (
                <span className="sx-score-track">
                  <i style={{ width: `${evaluation.userScore * 10}%` }} />
                </span>
              )}
            </div>
          </div>

          <div className="sx-debate-score-vs">VS</div>

          <div className="sx-debate-score-box">
            <span className="sx-debate-score-label" style={{ color: persona?.accentColor }}>
              {persona?.name || "Persona"}
            </span>
            <div className="sx-score">
              <span className="sx-score-num">
                {evaluation.personaScore !== null ? evaluation.personaScore : "—"}
                <span className="sx-score-den">/10</span>
              </span>
              {evaluation.personaScore !== null && (
                <span className="sx-score-track">
                  <i style={{ width: `${evaluation.personaScore * 10}%`, backgroundColor: persona?.accentColor }} />
                </span>
              )}
            </div>
          </div>
        </div>

        <details className="sx-scoring-explainer" style={{ marginTop: "16px", width: "100%" }}>
          <summary className="sx-scoring-explainer-trigger">
            <Icon name="icon-info" size={13} />
            <span>How referee scoring works</span>
          </summary>
          <div className="sx-scoring-explainer-body">
            <p style={{ margin: "0 0 8px" }}>The referee gives a score from 1 to 10 based on how well each side argued:</p>
            <ul style={{ margin: 0, paddingLeft: "18px", display: "grid", gap: "6px" }}>
              <li><strong>Backing Claims with Proof:</strong> Giving reasons, facts, or examples instead of just repeating assertions.</li>
              <li><strong>Avoiding Fallacies:</strong> Not resorting to personal attacks, twisting the opponent&apos;s words (strawman), or jumping to unproven conclusions.</li>
              <li><strong>Facing Hard Questions:</strong> Directly addressing counterarguments rather than dodging or changing the topic.</li>
            </ul>
          </div>
        </details>
      </header>

      <div className="sx-report-body-container">
        <section className="sx-block">
          <h3 className="sx-label">Debate Overview & Summary</h3>
          <p className="sx-adaptive-body">{evaluation.summary}</p>
        </section>

        {evaluation.fallaciesIdentified.length > 0 && (
          <section className="sx-block sx-fallacies-section">
            <h3 className="sx-label sx-label-danger">Logical Fallacies Identified</h3>
            <div className="sx-fallacy-grid">
              {evaluation.fallaciesIdentified.map((f, i) => (
                <div key={i} className="sx-fallacy-card">
                  <div className="sx-fallacy-card-head">
                    <span className="sx-fallacy-speaker" data-speaker={f.speaker.toLowerCase()}>
                      {f.speaker}
                    </span>
                    <strong className="sx-fallacy-name">{f.fallacy}</strong>
                  </div>
                  {f.quote && <blockquote className="sx-fallacy-quote">&ldquo;{f.quote}&rdquo;</blockquote>}
                  <p className="sx-fallacy-exp">{f.explanation}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="sx-claims-comparison-grid">
          <section className="sx-claims-col">
            <h3 className="sx-label">Your Strongest Moves</h3>
            {evaluation.userClaims.length > 0 ? (
              <ul className="sx-claims-list">
                {evaluation.userClaims.map((c, i) => (
                  <li key={i}>
                    <strong>{c.claim}</strong>
                    {c.quote && <blockquote>&ldquo;{c.quote}&rdquo;</blockquote>}
                    <span className="sx-claim-soundness" data-soundness={c.reasoningSoundness?.toLowerCase()}>
                      Soundness: {c.reasoningSoundness}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="sx-muted-note">No specific claims highlighted.</p>
            )}
          </section>

          <section className="sx-claims-col">
            <h3 className="sx-label" style={{ color: persona?.accentColor }}>
              {persona?.name}&rsquo;s Key Moves
            </h3>
            {evaluation.personaClaims.length > 0 ? (
              <ul className="sx-claims-list">
                {evaluation.personaClaims.map((c, i) => (
                  <li key={i}>
                    <strong>{c.claim}</strong>
                    {c.quote && <blockquote>&ldquo;{c.quote}&rdquo;</blockquote>}
                    <span className="sx-claim-soundness" data-soundness={c.reasoningSoundness?.toLowerCase()}>
                      Soundness: {c.reasoningSoundness}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="sx-muted-note">No specific claims highlighted.</p>
            )}
          </section>
        </div>

        <section className="sx-other sx-debate-synthesis">
          <div className="sx-other-head">
            <h3 className="sx-label sx-label-accent">Steelmanned Synthesis & Common Ground</h3>
          </div>
          <div className="sx-other-grid">
            <p className="sx-other-text">{evaluation.steelmannedConsensus}</p>
            <div className="sx-settle">
              <div className="sx-settle-head">
                <Icon name="icon-info" size={13} />
                <span>What Would Settle It</span>
              </div>
              <p>{evaluation.whatWouldSettleIt}</p>
            </div>
          </div>
        </section>

        <section className="sx-block sx-takeaway-block">
          <h3 className="sx-label">Critical Thinking Takeaway</h3>
          <p className="sx-takeaway-text">{evaluation.criticalThinkingTakeaway}</p>
        </section>
      </div>

      <footer className="sx-report-foot" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
        <p className="sx-confidence" style={{ margin: 0 }}>
          <span>Verdict: {evaluation.refereeVerdict}</span>
        </p>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button type="button" className="sx-ghost-btn" onClick={onBackToChat}>
            <Icon name="icon-arrow-left" size={14} />
            <span>Back to Debate Chat</span>
          </button>
          <button type="button" className="sx-btn" onClick={onReset}>
            <span>Start New Debate</span>
          </button>
        </div>
      </footer>
    </article>
  );
}
