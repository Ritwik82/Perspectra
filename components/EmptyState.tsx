import { Icon } from "./Icon";

/**
 * The guardrail, made visible. A clean post is a real answer, not an empty one:
 * the opposing view still renders underneath this.
 */
export function EmptyState() {
  return (
    <div className="sx-empty">
      <Icon name="icon-dash" size={15} />
      <div>
        <p className="sx-empty-title">No manipulation signal detected</p>
        <p className="sx-empty-body">
          Nothing in this post is doing rhetorical work that hides its own reasoning. That is a
          finding, not a failure — and the post still has another side worth seeing.
        </p>
      </div>
    </div>
  );
}
