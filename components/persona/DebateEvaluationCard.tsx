"use client";

import type { DebateEvaluation } from "@/lib/persona-types";
import { PERSONAS } from "@/lib/persona-prompts";
import type { PersonaId } from "@/lib/persona-types";
import { Icon } from "../Icon";

export function DebateEvaluationCard({
  evaluation,
  personaId,
  onReset,
}: {
  evaluation: DebateEvaluation;
  personaId: PersonaId;
  onReset: () => void;
}) {
  const persona = PERSONAS[personaId];

  return (
    <article className="sx-report sx-debate-eval-card" aria-live="polite">
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

      <footer className="sx-report-foot">
        <p className="sx-confidence">
          <span>Verdict: {evaluation.refereeVerdict}</span>
        </p>
        <button type="button" className="sx-btn" onClick={onReset}>
          <span>Start New Debate</span>
        </button>
      </footer>
    </article>
  );
}
