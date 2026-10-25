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
  mode: AnalysisMode;
  setMode: (mode: AnalysisMode) => void;
  focus: string;
  setFocus: (focus: string) => void;
  outputLanguage: string;
  setOutputLanguage: (language: string) => void;
  onGenerateAll: () => void;
  batchRunning: boolean;
  batchPosition: number;
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
  mode,
  setMode,
  focus,
  setFocus,
  outputLanguage,
  setOutputLanguage,
  onGenerateAll,
  batchRunning,
  batchPosition,
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

  const ready = (text.trim().length > 0 || !!image) && !loading;

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

      <fieldset className="sx-mode-fieldset" disabled={loading}>
        <legend>Analysis mode</legend>
        <div className="sx-mode-picker" role="group" aria-label="Analysis mode">
          <button type="button" className="sx-mode-option" aria-pressed={mode === "quick"} onClick={() => setMode("quick")}>
            <span className="sx-mode-name"><Icon name="icon-bolt" />Quick</span>
            <span className="sx-mode-description">The essential read</span>
          </button>
          <button type="button" className="sx-mode-option" aria-pressed={mode === "deep"} onClick={() => setMode("deep")}>
            <span className="sx-mode-name"><Icon name="icon-depth" />Deep</span>
            <span className="sx-mode-description">Reasoning & evidence</span>
          </button>
          <button type="button" className="sx-mode-option" aria-pressed={mode === "counter"} onClick={() => setMode("counter")}>
            <span className="sx-mode-name"><Icon name="icon-branch" />Counter</span>
            <span className="sx-mode-description">Explore challenges</span>
          </button>
        </div>
          <p className="sx-mode-help">Each mode asks a different question of the same post.</p>
          <button type="button" className="sx-all-modes" onClick={onGenerateAll} disabled={!ready || batchRunning}>
          {batchRunning ? `Generating all · ${batchPosition}/3` : "Generate all three · one at a time"}
          </button>
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
          {loading && onStop && (
            <button
              type="button"
              className="sx-btn sx-btn-stop"
              onClick={onStop}
              title="Stop the current analysis"
            >
              <Icon name="icon-close" size={14} />
              <span>Stop Analysing</span>
            </button>
          )}
          <button type="button" className="sx-btn" onClick={onSubmit} disabled={!ready || loading}>
            <Icon name="icon-search-plus" />
            <span>{loading ? `Analysing ${mode}…` : `Generate ${mode === "deep" ? "Deep" : mode === "counter" ? "Counter" : "Quick"}`}</span>
          </button>
        </div>
      </div>

      {fileNote && <p className="sx-note-error">{fileNote}</p>}
    </section>
  );
}
