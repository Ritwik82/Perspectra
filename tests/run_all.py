#!/usr/bin/env python3
"""
Run every post in tests/ through the shipped system prompt and dump the raw output.

The system prompt is prompt/subtext_system.md followed by the chosen mode override,
concatenated exactly as lib/prompt.ts does it.

No grading, no expected.md comparison. Just: does the model produce a complete
report on each input, and how long does it take.

    python tests/run_all.py                  # one pass over every input
    python tests/run_all.py --list           # show what would run
    python tests/run_all.py --only 05        # filenames containing "05"
    python tests/run_all.py --runs 3         # consistency check (the README needs this)
    python tests/run_all.py --no-override    # measure the full 14-section report

Outputs go to tests/results/<name>__run<N>.md plus a .json sidecar of metrics,
and a combined tests/results/summary.md.
"""

from __future__ import annotations

import argparse
import base64
import json
import re
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path
import sys as _sys

APP_DIR = Path(__file__).resolve().parent.parent
if str(APP_DIR) not in _sys.path:
    _sys.path.insert(0, str(APP_DIR))

from lib.analysis_schema import analysis_schema, mode_instructions

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

TESTS_DIR = Path(__file__).resolve().parent
APP_DIR = TESTS_DIR.parent
RESULTS_DIR = TESTS_DIR / "results"

# The system message is two files, concatenated exactly as lib/prompt.ts does it.
# If you change the separator or the order here, change it there too.
PROMPT_DIR = APP_DIR / "prompt"
DEFAULT_PROMPT = PROMPT_DIR / "subtext_system.md"
PROMPT_SEPARATOR = "\n\n---\n\n"

OLLAMA_URL = "http://localhost:11434/api/chat"
MODEL = "gemma4:e2b"
MODE = "quick"
last_image: str | None = None

TEXT_EXT = {".txt"}
IMAGE_EXT = {".png", ".jpg", ".jpeg", ".webp"}
SKIP_NAMES = {"README.md", "expected.md", "run_all.py"}

# Measured: the prompt alone is ~5,900 tokens. 8192 truncates the OUTPUT
# (report dies at section 4). 16384 completes all 14 sections with headroom.
NUM_CTX = 16384
NUM_CTX_RETRY = 32768
TEMPERATURE = 0.2
# Matches lib/ollama.ts: thinking is off unless asked for. It costs ~4x wall time.
THINK = False
REQUEST_TIMEOUT = 1800

IMAGE_INSTRUCTION = (
    "Analyse the content of the attached image according to your instructions. "
    "Transcribe the visible text before analysing it."
)

# Verdict labels used by the prompt and summary parser.
VERDICT_LABELS = [
    "Strong argument",
    "Reasonable but limited",
    "Weakly supported",
    "Contains a clearly identified logical fallacy",
    "Insufficient information to judge",
    "No substantive argument to evaluate",
]

# Legacy section headings used only when --no-override runs the source prompt.
SECTION_NAMES = [
    "Content Summary",
    "Explicit Claims",
    "Possible Implications",
    "Reasoning Analysis",
    "Reasoning-Quality Score",
    "Logical Fallacies",
    "Factual and Statistical",
    "Image and Data Analysis",
    "Strongest Point",
    "Biggest Weakness",
    "Strongest Counterargument",
    "Final Verdict",
    "Confidence and Limitations",
    "What Would Help Establish",
]


# ---------------------------------------------------------------- discovery

def discover() -> list[Path]:
    found = []
    for p in sorted(TESTS_DIR.iterdir()):
        if not p.is_file() or p.name in SKIP_NAMES:
            continue
        if p.suffix.lower() in TEXT_EXT or p.suffix.lower() in IMAGE_EXT:
            found.append(p)
    return found


def build_messages(path: Path, system_prompt: str) -> list[dict]:
    global last_image
    if path.suffix.lower() in IMAGE_EXT:
        b64 = base64.b64encode(path.read_bytes()).decode("ascii")
        last_image = b64
        return [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": IMAGE_INSTRUCTION, "images": [b64]},
        ]
    body = path.read_text(encoding="utf-8", errors="replace").strip()
    last_image = None
    return [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": body},
    ]


# ---------------------------------------------------------------- inference

def call(messages: list[dict], num_ctx: int) -> dict:
    payload = json.dumps(
        {
            "model": MODEL,
            "stream": False,
            "options": {"temperature": TEMPERATURE, "num_ctx": num_ctx},
            "think": THINK,
            "format": analysis_schema(MODE),
            "messages": messages,
        }
    ).encode("utf-8")

    req = urllib.request.Request(
        OLLAMA_URL, data=payload, headers={"Content-Type": "application/json"}
    )
    started = time.time()
    with urllib.request.urlopen(req, timeout=REQUEST_TIMEOUT) as resp:
        data = json.load(resp)
    data["_wall_s"] = round(time.time() - started, 1)
    return data


def run_one(path: Path, system_prompt: str) -> dict:
    messages = build_messages(path, system_prompt)
    ctx = NUM_CTX
    data = call(messages, ctx)

    # Never accept a silently truncated report.
    if data.get("done_reason") != "stop":
        print(f"    done_reason={data.get('done_reason')!r} at num_ctx={ctx}, "
              f"retrying at {NUM_CTX_RETRY}...")
        ctx = NUM_CTX_RETRY
        data = call(messages, ctx)
        data["_retried"] = True

    text = data.get("message", {}).get("content", "")
    try:
        decoded = json.loads(text)
    except (TypeError, json.JSONDecodeError):
        decoded = {}
    eval_count = data.get("eval_count") or 0
    eval_dur = data.get("eval_duration") or 1
    return {
        "file": path.name,
        "num_ctx": ctx,
        "wall_s": data.get("_wall_s"),
        "prompt_tokens": data.get("prompt_eval_count"),
        "out_tokens": eval_count,
        "tok_per_s": round(eval_count / eval_dur * 1e9, 1) if eval_dur else None,
        "done_reason": data.get("done_reason"),
        "retried": data.get("_retried", False),
        "sections_present": len(decoded.get("sections", [])) if isinstance(decoded, dict) else 0,
        "verdict": decoded.get("verdict") or "(not applicable)",
        "score": decoded.get("score"),
        "no_signal": decoded.get("noSignal", False),
        "chars": len(text),
        "text": text,
    }


# ---------------------------------------------------------------- extraction

def extract_verdict(text: str) -> str:
    lowered = text.lower()
    # Prefer a label appearing after the "Final Verdict" heading.
    anchor = lowered.rfind("final verdict")
    scope = lowered[anchor:] if anchor >= 0 else lowered
    for label in VERDICT_LABELS:
        if label.lower() in scope:
            return label
    for label in VERDICT_LABELS:
        if label.lower() in lowered:
            return label
    return "(none found)"


def extract_score(text: str):
    anchor = text.lower().rfind("reasoning-quality score")
    scope = text[anchor:] if anchor >= 0 else text
    for pattern in (r"[Tt]otal[^0-9\n]{0,25}(\d+(?:\.\d+)?)\s*/\s*10",
                    r"(\d+(?:\.\d+)?)\s*/\s*10"):
        m = re.search(pattern, scope)
        if m:
            return m.group(1)
    return None


# ---------------------------------------------------------------- reporting

def print_row(r: dict) -> None:
    score = f"{r['score']}/10" if r["score"] else "  -  "
    flag = "" if r["done_reason"] == "stop" else "  <-- TRUNCATED"
    print(
        f"  {r['file']:<22} {r['wall_s']:>6}s  {r['out_tokens']:>5} tok  "
        f"{r['tok_per_s']:>5} t/s  {r['sections_present']:>2} sections  "
        f"{score:<7} {'NO SIGNAL' if r['no_signal'] else r['verdict']}{flag}"
    )


def write_summary(rows: list[dict]) -> Path:
    RESULTS_DIR.mkdir(exist_ok=True)
    lines = [
        f"# Subtext {MODE} test run summary",
        "",
        f"model `{MODEL}` · num_ctx `{NUM_CTX}` · temperature `{TEMPERATURE}`",
        "",
        "| file | wall s | out tok | tok/s | adaptive sections | score | assessment | no-signal | done |",
        "|---|---|---|---|---|---|---|---|---|",
    ]
    for r in rows:
        lines.append(
            f"| `{r['file']}` | {r['wall_s']} | {r['out_tokens']} | "
            f"{r['tok_per_s']} | {r['sections_present']} | "
            f"{r['score'] if r['score'] is not None else '-'} | {r['verdict']} | {r['no_signal']} | {r['done_reason']} |"
        )
    out = RESULTS_DIR / "summary.md"
    out.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return out


# ---------------------------------------------------------------- main

def main() -> int:
    global MODEL, NUM_CTX, THINK, MODE
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--list", action="store_true", help="list inputs and exit")
    ap.add_argument("--only", help="only files whose name contains this string")
    ap.add_argument("--runs", type=int, default=1, help="repeats per file (default 1)")
    ap.add_argument("--prompt", type=Path, default=DEFAULT_PROMPT,
                    help=f"rule-set prompt file (default {DEFAULT_PROMPT.name})")
    ap.add_argument("--mode", choices=("quick", "deep", "counter"), default="quick",
                    help="analysis mode (default quick)")
    ap.add_argument("--model", default=MODEL, help=f"ollama model (default {MODEL})")
    ap.add_argument("--num-ctx", type=int, default=NUM_CTX,
                    help=f"context window (default {NUM_CTX})")
    ap.add_argument("--think", action="store_true",
                    help="let the model reason first in any mode (deep enables it automatically)")
    args = ap.parse_args()

    MODEL = args.model
    NUM_CTX = args.num_ctx
    MODE = args.mode
    THINK = args.think or args.mode == "deep"

    if not args.prompt.is_file():
        print(f"ERROR: prompt file not found: {args.prompt}", file=sys.stderr)
        return 2
    base_prompt = args.prompt.read_text(encoding="utf-8", errors="replace")
    if len(base_prompt.strip()) < 1000:
        print(f"ERROR: prompt file looks truncated: {args.prompt}", file=sys.stderr)
        return 2

    system_prompt = f"{base_prompt.rstrip()}{PROMPT_SEPARATOR}{mode_instructions(args.mode)}\n"

    inputs = discover()
    if args.only:
        inputs = [p for p in inputs if args.only in p.name]
    if not inputs:
        print("No inputs found. Put posts in tests/ and try again.", file=sys.stderr)
        return 1

    if args.list:
        print(f"prompt: {args.prompt}  ({len(system_prompt):,} chars)")
        print(f"mode  : {args.mode} · structured JSON")
        print(f"model : {MODEL}   num_ctx: {NUM_CTX}   runs: {args.runs}")
        print(f"{len(inputs)} input(s):")
        for p in inputs:
            size = p.stat().st_size
            kind = "image" if p.suffix.lower() in IMAGE_EXT else "text"
            print(f"  {p.name:<24} {kind:<6} {size:>8,} bytes")
        return 0

    print(f"prompt : {args.prompt.name} ({len(system_prompt):,} chars)")
    print(f"mode   : {args.mode}")
    print("shape  : structured JSON")
    print(f"model  : {MODEL}   num_ctx: {NUM_CTX}   runs/file: {args.runs}")
    print(f"inputs : {len(inputs)}")
    print()

    RESULTS_DIR.mkdir(exist_ok=True)
    rows: list[dict] = []
    failures = 0

    for path in inputs:
        if path.stat().st_size == 0:
            print(f"  {path.name:<22} EMPTY - skipped")
            failures += 1
            continue
        for run in range(1, args.runs + 1):
            try:
                r = run_one(path, system_prompt)
            except urllib.error.URLError as exc:
                print(f"  {path.name:<22} connection error: {exc}")
                failures += 1
                continue
            except Exception as exc:  # noqa: BLE001
                print(f"  {path.name:<22} error: {exc}")
                failures += 1
                continue

            stem = f"{path.stem}__run{run}"
            (RESULTS_DIR / f"{stem}.md").write_text(r["text"], encoding="utf-8")
            meta = {k: v for k, v in r.items() if k != "text"}
            (RESULTS_DIR / f"{stem}.json").write_text(
                json.dumps(meta, indent=2, ensure_ascii=False), encoding="utf-8"
            )

            r["run"] = run
            rows.append(r)
            print_row(r)

    print()
    if rows:
        summary = write_summary(rows)
        print(f"raw reports : {RESULTS_DIR}")
        print(f"summary     : {summary}")
    if failures:
        print(f"skipped/errored: {failures}")
    return 0 if rows else 1


if __name__ == "__main__":
    raise SystemExit(main())
