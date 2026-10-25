import type { CounterView } from "@/lib/types";
import { Icon } from "./Icon";

/**
 * The point of the product. Cyan is reserved across the token set for the
 * opposing view and nothing else, so this panel is the only accent on screen.
 */
export function OtherSidePanel({ counterView, mode }: { counterView: CounterView; mode: "quick" | "deep" | "counter" }) {
  const { steelman, settlingEvidence } = counterView;
  if (!steelman && !settlingEvidence) return null;

  return (
    <section className="sx-other" aria-labelledby="sx-other-heading">
      <div className="sx-other-head">
        <h2 className="sx-label sx-label-accent" id="sx-other-heading">
          {mode === "counter" ? "The strongest opposing view" : "The other side"}
        </h2>
        {mode === "counter" && <span className="sx-other-note">when a genuine counterview exists</span>}
      </div>

      <div className="sx-other-grid">
        <p className="sx-other-text">{steelman || "—"}</p>

        {settlingEvidence && (
          <div className="sx-settle">
            <div className="sx-settle-head">
              <Icon name="icon-info" size={13} />
              <span>What would settle it</span>
            </div>
            <p>{settlingEvidence}</p>
          </div>
        )}
      </div>
    </section>
  );
}
