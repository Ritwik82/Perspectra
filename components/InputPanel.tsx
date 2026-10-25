"use client";

import { useRef, useState } from "react";
import { Icon } from "./Icon";
import { LanguagePicker } from "./LanguagePicker";
import type { AnalysisMode } from "@/lib/types";

export interface InputPanelProps {
  text: string;
  setText: (value: string) => void;
  image: string | null;
  imageName: string | null;
  setImage: (dataUrl: string | null, name?: string | null) => void;
  onSubmit: () => void;
  onStop?: () => void;
  onReset: () => void;
  loading: boolean;
  hasResult: boolean;
  selectedModes: AnalysisMode[];
  onToggleMode: (mode: AnalysisMode) => void;
  loadingMode?: AnalysisMode | null;
  queueProgress?: { current: number; total: number } | null;
  focus: string;
  setFocus: (focus: string) => void;
  outputLanguage: string;
  setOutputLanguage: (language: string) => void;
}

export function InputPanel({
  text,
  setText,
  image,
  imageName,
  setImage,
  onSubmit,
  onStop,
  onReset,
  loading,
  hasResult,
  selectedModes,
  onToggleMode,
  loadingMode,
  queueProgress,
  focus,
  setFocus,
  outputLanguage,
  setOutputLanguage,
}: InputPanelProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [fileNote, setFileNote] = useState<string | null>(null);

  function readFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setFileNote("That is not an image file.");
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      setFileNote("That image is over 12 MB.");
      return;
    }
    setFileNote(null);
    const reader = new FileReader();
    reader.onload = () => setImage(reader.result as string, file.name);
    reader.onerror = () => setFileNote("Could not read that file.");
    reader.readAsDataURL(file);
  }

  const ready = (text.trim().length > 0 || !!image) && !loading && selectedModes.length > 0;

  function getButtonLabel() {
    if (loading) {
      if (queueProgress && queueProgress.total > 1) {
        return `Analysing ${loadingMode ?? "mode"} (${queueProgress.current} of ${queueProgress.total})…`;
      }
      return `Analysing ${loadingMode ?? "mode"}…`;
    }
    if (selectedModes.length === 1) {
      const single = selectedModes[0];
      return `Generate ${single === "deep" ? "Deep" : single === "counter" ? "Counter" : "Quick"}`;
    }
    if (selectedModes.length === 2) {
      return `Generate 2 Modes (One by one)`;
    }
    if (selectedModes.length === 3) {
      return `Generate All 3 (One by one)`;
    }
    return "Select at least 1 mode";
  }

  return (
    <section className="sx-panel" aria-label="Analyze a post">
      <div className="sx-input-heading">
        <span className="sx-input-icon"><Icon name="icon-search-plus" size={17} /></span>
        <label htmlFor="post-input">What would you like to examine?</label>
      </div>

      <div
        className={`sx-drop${dragging ? " is-dragging" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files?.[0];
          if (file) readFile(file);
        }}
      >
        <textarea
          id="post-input"
          className="sx-textarea"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste a post, comment, claim or argument…"
          rows={7}
          spellCheck={false}
          aria-label="Post text"
          disabled={loading}
        />

        {dragging && <div className="sx-drop-veil">Drop the screenshot</div>}
      </div>

      <div className="sx-panel-foot sx-upload-row">
        <div className="sx-attach">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="sx-sr"
            aria-label="Choose a screenshot to analyse"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) readFile(file);
              e.target.value = "";
            }}
          />

          {image ? (
            <span className="sx-chip">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image} alt="" className="sx-chip-thumb" />
              <span className="sx-chip-name">{imageName ?? "screenshot"}</span>
              <button
                type="button"
                className="sx-chip-x"
                onClick={() => setImage(null, null)}
                aria-label="Remove image"
              >
                <Icon name="icon-close" size={12} />
              </button>
            </span>
          ) : (
            <button
              type="button"
              className="sx-ghost-btn"
              onClick={() => fileRef.current?.click()}
              disabled={loading}
            >
              <Icon name="icon-image" />
              <span>Add a screenshot</span>
            </button>
          )}

          <span className="sx-hint">Language is matched automatically</span>
        </div>
      </div>

      {/* Selectable Mode Cards with visible Checkmarks for Multi-Selection */}
      <fieldset className="sx-mode-fieldset" disabled={loading}>
        <legend className="sx-mode-legend">Select Analysis Modes (Select one or more)</legend>
        <div className="sx-mode-cards-grid" role="group" aria-label="Select analysis modes">
          <button
            type="button"
            role="checkbox"
            aria-checked={selectedModes.includes("quick")}
            className={`sx-mode-card is-quick${selectedModes.includes("quick") ? " is-selected" : ""}`}
            onClick={() => onToggleMode("quick")}
          >
            <div className="sx-mode-card-top">
              <span className="sx-mode-card-icon"><Icon name="icon-bolt" size={16} /></span>
              <span className={`sx-mode-check${selectedModes.includes("quick") ? " is-checked" : ""}`}>
                {selectedModes.includes("quick") ? <Icon name="icon-check" size={11} /> : null}
              </span>
            </div>
            <strong className="sx-mode-card-title">Quick Overview</strong>
            <span className="sx-mode-card-desc">The essential read: main claims & key caveats</span>
          </button>

          <button
            type="button"
            role="checkbox"
            aria-checked={selectedModes.includes("deep")}
            className={`sx-mode-card is-deep${selectedModes.includes("deep") ? " is-selected" : ""}`}
            onClick={() => onToggleMode("deep")}
          >
            <div className="sx-mode-card-top">
              <span className="sx-mode-card-icon"><Icon name="icon-depth" size={16} /></span>
              <span className={`sx-mode-check${selectedModes.includes("deep") ? " is-checked" : ""}`}>
                {selectedModes.includes("deep") ? <Icon name="icon-check" size={11} /> : null}
              </span>
            </div>
            <strong className="sx-mode-card-title">Deep Analysis</strong>
            <span className="sx-mode-card-desc">Comprehensive reasoning, evidence audit & tactics</span>
          </button>

          <button
            type="button"
            role="checkbox"
            aria-checked={selectedModes.includes("counter")}
            className={`sx-mode-card is-counter${selectedModes.includes("counter") ? " is-selected" : ""}`}
            onClick={() => onToggleMode("counter")}
          >
            <div className="sx-mode-card-top">
              <span className="sx-mode-card-icon"><Icon name="icon-branch" size={16} /></span>
              <span className={`sx-mode-check${selectedModes.includes("counter") ? " is-checked" : ""}`}>
                {selectedModes.includes("counter") ? <Icon name="icon-check" size={11} /> : null}
              </span>
            </div>
            <strong className="sx-mode-card-title">Counter Perspective</strong>
            <span className="sx-mode-card-desc">Steelmanned challenges & what would settle the debate</span>
          </button>
        </div>
      </fieldset>

      <details className="sx-focus-details">
        <summary>Fine-tune this reading <span>Optional focus · response language</span></summary>
        <label htmlFor="analysis-focus">Focus this analysis</label>
        <input
          id="analysis-focus"
          className="sx-focus-input"
          value={focus}
          onChange={(event) => setFocus(event.target.value.slice(0, 300))}
          placeholder="e.g. Check only for logical fallacies"
          maxLength={300}
          disabled={loading}
        />
        <label>Write the analysis in… <span>Select from Gemma supported languages or leave blank to match post</span></label>
        <LanguagePicker
          value={outputLanguage}
          onChange={setOutputLanguage}
          disabled={loading}
        />
      </details>

      <div className="sx-submit-row">
        <span className="sx-submit-note">Your post stays on this device.</span>
        <div className="sx-panel-actions">
          {hasResult && !loading && (
            <button type="button" className="sx-ghost-btn" onClick={onReset} disabled={loading}>
              <Icon name="icon-plus" />
              <span>New</span>
            </button>
          )}
          {loading && onStop ? (
            <button
              type="button"
              className="sx-btn sx-btn-stop"
              onClick={onStop}
              title="Stop the current analysis"
            >
              <Icon name="icon-close" size={14} />
              <span>Stop Analysing</span>
            </button>
          ) : (
            <button type="button" className="sx-btn" onClick={onSubmit} disabled={!ready || loading}>
              <Icon name="icon-search-plus" />
              <span>{getButtonLabel()}</span>
            </button>
          )}
        </div>
      </div>

      {fileNote && <p className="sx-note-error">{fileNote}</p>}
    </section>
  );
}
