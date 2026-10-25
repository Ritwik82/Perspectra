# Perspectra

> **Think clearly. See the whole picture.**  
> A local-first, privacy-preserving analyzer for social media claims, ragebait, and echo chambers across English, Hindi, and Hinglish. It exposes underlying rhetorical tactics and constructs a steelmanned opposing perspective with the evidence required to settle the dispute.

| Detail | Specification |
| :--- | :--- |
| **Track** | **Narrow Agentic Tools** *(Local Inference Agents)* |
| **Event** | Hacktoberfest Hack Day Jaipur × Hack IT Sapiens (LNMIIT) |
| **Repository** | [github.com/Ritwik82/Perspectra](https://github.com/Ritwik82/Perspectra) |
| **Licence** | Apache-2.0 |

---

## 1. Problem Statement & Target User

### The Problem
Social media feeds (X/Twitter, Reddit, Instagram, LinkedIn) are optimized for engagement through one-sided framing, outrage cultivation, and selective omission. Even when a viral post is factually sound or widely applauded, it is frequently one-sided—swapping complex tradeoffs for tribal certainty. Readers are trapped inside echo chambers not because they are uncritical, but because alternative perspectives are omitted or presented as weak strawmen.

### Target User
* **Everyday readers & students** seeking to evaluate controversial claims or viral screenshots without being manipulated by emotional framing.
* **Researchers & critical thinkers** who need an objective, two-sided breakdown of complex debates in multilingual contexts (English, Hindi, and code-switched Hinglish).
* **Privacy-conscious users** who refuse to upload their private screenshots, reading history, or personal browsing habits to proprietary cloud APIs.

---

## 2. Approach, Architecture & Workflow

Perspectra is designed as a **Narrow Agentic Tool**: it does one job end-to-end with high precision. It accepts either raw text or screenshot images, extracts text via multi-modal vision OCR, analyzes rhetorical tactics, scores reasoning quality, and constructs a steelmanned counter-argument.

### Core Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                 Browser Client (Next.js 16)                 │
│   • Textarea paste / drag-and-drop screenshot picker        │
│   • Multi-mode selector (Quick, Deep, Counter)              │
│   • Dynamic source quotation & citation highlighting        │
│   • Live elapsed execution timer & responsive dual-pane     │
└──────────────────────────────┬──────────────────────────────┘
                               │ POST /api/analyze
                               ▼
┌─────────────────────────────────────────────────────────────┐
│            Next.js Server-Side Route Handler                │
│   • Input validation, sanitization & payload limits         │
│   • Zero browser-to-Ollama CORS leaks                       │
│   • Timeout controller (300s) & context retry watchdog      │
└──────────────────────────────┬──────────────────────────────┘
                               │ POST /api/chat
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                Local Ollama Inference Engine                │
│   • Model: gemma4:e2b (4.6B, Q4_K_M)                        │
│   • num_ctx: 16384 (ensures complete generation)            │
│   • temperature: 0.2 (deterministic calibration)            │
│   • Strict JSON Schema enforcement (analysisSchema)         │
└──────────────────────────────┬──────────────────────────────┘
                               │ Structured JSON Output
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 ReportCard & OtherSidePanel                 │
│   • What it claims (distilled thesis)                       │
│   • What it's doing (identified tactics + exact quotes)     │
│   • THE OTHER SIDE (steelmanned counter-view)               │
│   • WHAT WOULD SETTLE IT (empirical deciding test)          │
│   • Reasoning Score & Categorical Verdict Badge             │
│   • Confidence metric & rationale                           │
└─────────────────────────────────────────────────────────────┘
```

### Guardrails & Failure Handling
* **The "No Manipulation" Guardrail:** Many argument analyzers force-fit fallacies onto innocent text. Perspectra actively monitors for exploratory, neutral, or self-hedging text. In these cases, it marks `noSignal: true`, emits an empty tactics list, and refrains from fabricating attacks. Even with neutral posts, the counter-perspective is provided to ensure intellectual breadth.
* **Truncation Watchdog:** Large system prompts swallow default context buffers. Perspectra enforces `num_ctx = 16384` and inspects `done_reason`. If a model response fails to terminate with `"stop"`, the runtime triggers an automatic fallback to `32768`.
* **Zero Cloud Guarantee:** All operations execute completely offline on local hardware with Wi-Fi disabled.

---

## 3. Model Details

| Attribute | Value |
| :--- | :--- |
| **Model Name** | Google Gemma 4 E2B (`gemma4:e2b`) |
| **Parameter Count** | 4.6 Billion (`4.6B`) |
| **Quantization** | Q4_K_M (4.58 GB on disk) |
| **Model Licence** | Gemma Terms of Use (Open Weights) |
| **Local Runtime** | Ollama 0.40+ (llamacpp runner) |
| **Context Window** | 16,384 tokens (`num_ctx: 16384`) |
| **Capabilities Used**| Completion, Multimodal Vision (OCR + Screenshot reading) |
| **External APIs** | **None.** Zero hosted frontier APIs (no OpenAI, Anthropic, or Gemini API keys). |
| **Target Hardware Tested** | NVIDIA GeForce RTX 2050 (4 GB VRAM), 16 GB DDR4 RAM, Windows 11 |

---

## 4. Setup & Running Locally

### 1. Prerequisites
* **Node.js** v18.18+ or v20+
* **Ollama** installed and running ([ollama.com](https://ollama.com))
* **Python** 3.10+ (optional, for running benchmark verification scripts)

### 2. Pull the Local Model
```bash
ollama run gemma4:e2b
```
*(Verify it responds, then you can exit the chat with `/bye`)*

### 3. Clone & Install Dependencies
```bash
git clone https://github.com/Ritwik82/Perspectra.git
cd Perspectra
npm install
```

### 4. Configure Environment
Copy the example environment configuration:
```bash
cp .env.example .env.local
```
*(Defaults point to `http://localhost:11434` with model `gemma4:e2b` and `OLLAMA_NUM_CTX=16384`)*

### 5. Launch the Application
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 6. Example Test Inputs
* **English Text:** Paste an excerpt arguing about workplace policies or the gender pay gap (`tests/01_text_en.txt`).
* **Hinglish Screenshot:** Drop an Instagram or Reddit screenshot discussing everyday lifestyle, diets, or fitness (`tests/04_img_en.jpeg`).
* **Hindi Devanagari:** Test a civic policy or transport debate in pure Devanagari script (`tests/06_neutral_hi.txt`).

---

## 5. Benchmark Results & Evidence

Tested across multiple runs on target laptop hardware (NVIDIA RTX 2050, 4 GB VRAM) using `tests/run_all.py`:

| Test Input | Input Type | Language | Output Tokens | Latency | Speed | Verdict / Assessment | Done Reason |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `01_text_en.txt` | Text | English | 892 tok | 87.3 s | 23.6 tok/s | Nuanced critique, calls for transparency | `stop` |
| `03_text_hinglish.txt`| Text | Hinglish | 814 tok | 71.2 s | 37.8 tok/s | Personal observation, hedged claims | `stop` |
| `05_img_hi.jpeg` | Screenshot | Hindi (Devanagari) | 948 tok | 65.5 s | 39.8 tok/s | Political claim, rhetorical questions | `stop` |
| `06_neutral_eng.txt` | Text | English | 722 tok | 77.6 s | 39.9 tok/s | **No Signal** (Guardrail passed) | `stop` |
| `08_img_en.jpeg` | Screenshot | English | 856 tok | 67.1 s | 42.4 tok/s | Anecdotal narrative, weak evidence | `stop` |

### Known Limitations
1. **Model Capacity (4.6B):** While Gemma 4 E2B shows high reasoning quality, subtle sarcasm or deeply localized idioms occasionally require the deeper prompt mode.
2. **Real-Time Fact-Checking:** Perspectra evaluates internal argument consistency, evidential structure, and rhetorical framing. It does not browse the live internet to verify breaking news facts.
3. **Hardware Latency:** On low-power 4 GB VRAM GPUs, vision-based full OCR inference takes 60–80 seconds. Warmed-up runs typically complete faster.

---

## 6. Graphify Codebase Graph

In accordance with Hack Day requirements, the codebase graph was extracted and verified using Graphify:

* **Interactive Graph:** [`graphify-out/graph.html`](graphify-out/graph.html)
* **Codebase Nodes:** 160 nodes | **Edges:** 260 edges | **Communities:** 9 functional modules
* **Shared to Discord:** Yes (shared in the official Graphify Discord channel)

To re-generate the graph:
```bash
graphify extract . --code-only
graphify cluster-only . --no-label
graphify export html
```

---

## 7. Submission Checklist & Track Compliance

- [x] **Public GitHub Repo:** Published under Apache-2.0 open-source licence.
- [x] **No Hosted Generative APIs:** 100% powered by local Ollama `gemma4:e2b`.
- [x] **Graphify Graph Shared:** `graphify-out/graph.html` generated and shared in Discord.
- [x] **Working Narrow Tool:** Accepts text & images, outputs structured claims, quotes, steelman, and verdicts.
- [x] **Guardrail Implemented:** Neutral inputs correctly produce `noSignal` instead of fabricated fallacies.
- [x] **Zero Secrets Committed:** Pure `.env.example` with zero API keys or sensitive data.
