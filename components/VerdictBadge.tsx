"use client";

const TONE: Record<string, "success" | "warn" | "danger" | "neutral"> = {
  "Strong argument": "success",
  "Reasonable but limited": "warn",
  "Weakly supported": "warn",
  "Contains a clearly identified logical fallacy": "danger",
  "Insufficient information to judge": "neutral",
  "No substantive argument to evaluate": "neutral",
};

export function VerdictBadge({ verdict }: { verdict: string }) {
  if (!verdict) return null;
  const tone = TONE[verdict] ?? "neutral";
  const isShort = verdict.length <= 45;

  return (
    <div className={`sx-verdict-wrapper${isShort ? " is-badge-mode" : " is-card-mode"}`}>
      <span className={`sx-verdict${isShort ? " is-badge" : " is-descriptive"}`} data-tone={tone}>
        {verdict}
      </span>
    </div>
  );
}
