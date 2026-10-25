"use client";

import { useId, useMemo, useRef, useState, useEffect } from "react";
import { Icon } from "./Icon";

export interface SupportedLanguage {
  name: string;
  native: string;
  code: string;
  category?: string;
}

export const GEMMA_SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  { name: "English", native: "English", code: "en", category: "Common" },
  { name: "Hindi", native: "हिन्दी", code: "hi", category: "Common" },
  { name: "Hinglish", native: "Hindi-English mix", code: "hi-en", category: "Common" },
  { name: "Spanish", native: "Español", code: "es", category: "Common" },
  { name: "French", native: "Français", code: "fr", category: "Common" },
  { name: "German", native: "Deutsch", code: "de", category: "Common" },
  { name: "Portuguese", native: "Português", code: "pt" },
  { name: "Italian", native: "Italiano", code: "it" },
  { name: "Russian", native: "Русский", code: "ru" },
  { name: "Japanese", native: "日本語", code: "ja" },
  { name: "Korean", native: "한국어", code: "ko" },
  { name: "Chinese (Simplified)", native: "简体中文", code: "zh-Hans" },
  { name: "Chinese (Traditional)", native: "繁體中文", code: "zh-Hant" },
  { name: "Arabic", native: "العربية", code: "ar" },
  { name: "Bengali", native: "বাংলা", code: "bn" },
  { name: "Marathi", native: "मराठी", code: "mr" },
  { name: "Telugu", native: "తెలుగు", code: "te" },
  { name: "Tamil", native: "தமிழ்", code: "ta" },
  { name: "Gujarati", native: "ગુજરાતી", code: "gu" },
  { name: "Urdu", native: "اردو", code: "ur" },
  { name: "Kannada", native: "ಕನ್ನಡ", code: "kn" },
  { name: "Malayalam", native: "മലയാളം", code: "ml" },
  { name: "Punjabi", native: "ਪੰਜਾਬੀ", code: "pa" },
  { name: "Vietnamese", native: "Tiếng Việt", code: "vi" },
  { name: "Turkish", native: "Türkçe", code: "tr" },
  { name: "Dutch", native: "Nederlands", code: "nl" },
  { name: "Polish", native: "Polski", code: "pl" },
  { name: "Indonesian", native: "Bahasa Indonesia", code: "id" },
];

export function LanguagePicker({
  value,
  onChange,
  disabled = false,
}: {
  value: string;
  onChange: (language: string) => void;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputId = useId();

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return GEMMA_SUPPORTED_LANGUAGES;
    return GEMMA_SUPPORTED_LANGUAGES.filter(
      (lang) =>
        lang.name.toLowerCase().includes(q) ||
        lang.native.toLowerCase().includes(q) ||
        lang.code.toLowerCase().includes(q)
    );
  }, [query]);

  const selectedLanguage = useMemo(() => {
    if (!value) return null;
    return GEMMA_SUPPORTED_LANGUAGES.find(
      (lang) => lang.name.toLowerCase() === value.toLowerCase() || lang.code.toLowerCase() === value.toLowerCase()
    );
  }, [value]);

  function handleSelect(langName: string) {
    onChange(langName);
    setQuery("");
    setOpen(false);
  }

  function handleClear() {
    onChange("");
    setQuery("");
    setOpen(false);
  }

  const quickPills = ["English", "Hindi", "Hinglish", "Spanish", "French", "German"];

  return (
    <div className="sx-lang-picker" ref={containerRef}>
      <div className="sx-lang-pills">
        <span className="sx-lang-pills-label">Quick select:</span>
        {quickPills.map((lang) => {
          const isSelected = value.toLowerCase() === lang.toLowerCase();
          return (
            <button
              key={lang}
              type="button"
              className={`sx-lang-pill${isSelected ? " is-active" : ""}`}
              onClick={() => (isSelected ? handleClear() : handleSelect(lang))}
              disabled={disabled}
            >
              {lang}
            </button>
          );
        })}
      </div>

      <div className="sx-lang-search-wrapper">
        <div className="sx-lang-input-container">
          <span className="sx-lang-search-icon">
            <Icon name="icon-search" size={14} />
          </span>
          <input
            id={inputId}
            type="text"
            className="sx-focus-input sx-lang-input"
            placeholder={value ? `Selected: ${value} (Click to change)` : "Search languages supported by Gemma (e.g. Hindi, French, Japanese)..."}
            value={open ? query : value ? `${value}${selectedLanguage ? ` (${selectedLanguage.native})` : ""}` : ""}
            onChange={(e) => {
              setQuery(e.target.value);
              if (!open) setOpen(true);
            }}
            onFocus={() => {
              setOpen(true);
              setQuery("");
            }}
            disabled={disabled}
            autoComplete="off"
          />
          {value ? (
            <button
              type="button"
              className="sx-lang-clear-btn"
              onClick={handleClear}
              title="Clear selection (match post language)"
              disabled={disabled}
            >
              <Icon name="icon-close" size={12} />
            </button>
          ) : null}
        </div>

        {open && (
          <div className="sx-lang-dropdown" role="listbox">
            <div className="sx-lang-dropdown-header">
              <span>Gemma 4 Supported Languages</span>
              <button
                type="button"
                className="sx-lang-dropdown-auto"
                onClick={() => handleClear()}
              >
                Auto-detect (Default)
              </button>
            </div>
            <div className="sx-lang-dropdown-list">
              {filtered.length > 0 ? (
                filtered.map((lang) => {
                  const isSelected = value.toLowerCase() === lang.name.toLowerCase();
                  return (
                    <button
                      key={lang.code}
                      type="button"
                      className={`sx-lang-option${isSelected ? " is-selected" : ""}`}
                      onClick={() => handleSelect(lang.name)}
                    >
                      <span className="sx-lang-option-name">{lang.name}</span>
                      <span className="sx-lang-option-native">{lang.native}</span>
                      <span className="sx-lang-option-code">{lang.code}</span>
                    </button>
                  );
                })
              ) : (
                <div className="sx-lang-no-match">
                  <span>No matching Gemma language found.</span>
                  {query && (
                    <button
                      type="button"
                      className="sx-lang-custom-btn"
                      onClick={() => handleSelect(query.trim())}
                    >
                      Use &ldquo;{query.trim()}&rdquo; anyway
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
