const TONE: Record<string, "success" | "warn" | "danger" | "neutral"> = {
  "Strong argument": "success",
  "Reasonable but limited": "warn",
  "Weakly supported": "warn",
  "Contains a clearly identified logical fallacy": "danger",
  "Insufficient information to judge": "neutral",
  "No substantive argument to evaluate": "neutral",
};

export function VerdictBadge({ verdict }: { verdict: string }) {
  const tone = TONE[verdict] ?? "neutral";
  return (
    <span className="sx-verdict" data-tone={tone}>
      {verdict || "Unreadable verdict"}
    </span>
  );
}
