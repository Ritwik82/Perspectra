"use client";

import { PERSONAS } from "@/lib/persona-prompts";
import type { PersonaId } from "@/lib/persona-types";

export function PersonaSelector({
  selectedId,
  onSelect,
  disabled = false,
}: {
  selectedId: PersonaId;
  onSelect: (id: PersonaId) => void;
  disabled?: boolean;
}) {
  const personas = Object.values(PERSONAS);

  return (
    <div className="sx-persona-grid" role="radiogroup" aria-label="Select a debate opponent">
      {personas.map((persona) => {
        const isSelected = persona.id === selectedId;
        return (
          <button
            key={persona.id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            className={`sx-persona-card${isSelected ? " is-selected" : ""}`}
            onClick={() => onSelect(persona.id)}
            disabled={disabled}
            style={{
              borderColor: isSelected ? persona.accentColor : undefined,
            }}
          >
            <div className="sx-persona-card-head">
              <span
                className="sx-persona-badge"
                style={{ backgroundColor: `${persona.accentColor}20`, color: persona.accentColor }}
              >
                {persona.badge}
              </span>
            </div>

            <h3 className="sx-persona-name">{persona.name}</h3>
            <p className="sx-persona-tagline">&ldquo;{persona.tagline}&rdquo;</p>
            <p className="sx-persona-desc">{persona.description}</p>

            <div className="sx-persona-traits">
              <span className="sx-persona-trait-label">Watch for:</span>
              <ul className="sx-persona-weaknesses">
                {persona.reasoningWeaknesses.slice(0, 2).map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          </button>
        );
      })}
    </div>
  );
}
