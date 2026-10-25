# Graph Report - Perspectra  (2026-10-25)

## Corpus Check
- 35 files · ~24,800 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 209 nodes · 370 edges · 8 communities
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- React UI Components & Views
- Multi-Perspective Analysis API
- Next.js App Shell & Config
- Chat & Ollama Streaming API
- Evaluation Runner & Schemas
- TypeScript Compiler Config
- Analysis Parser & Data Models
- Page State & Execution Controller

## God Nodes (most connected - your core abstractions)
1. `Icon()` - 19 edges
2. `compilerOptions` - 16 edges
3. `Page()` - 14 edges
4. `DebateArena()` - 11 edges
5. `ReportCard()` - 10 edges
6. `AnalysisMode` - 9 edges
7. `PersonaId` - 7 edges
8. `InputPanel()` - 7 edges
9. `LanguagePicker()` - 7 edges
10. `parseModelResponse()` - 7 edges

## Surprising Connections (you probably didn't know these)
- `InputPanelProps` --references--> `AnalysisMode`  [EXTRACTED]
  components/InputPanel.tsx → lib/types.ts
- `Page()` --calls--> `Icon()`  [EXTRACTED]
  app/page.tsx → components/Icon.tsx
- `Page()` --calls--> `InputPanel()`  [EXTRACTED]
  app/page.tsx → components/InputPanel.tsx
- `Page()` --calls--> `ReportCard()`  [EXTRACTED]
  app/page.tsx → components/ReportCard.tsx
- `Page()` --calls--> `ThemeToggle()`  [EXTRACTED]
  app/page.tsx → components/ThemeToggle.tsx

## Import Cycles
- None detected.

## Communities (8 total, 0 thin omitted)

### Community 0 - "React UI Components & Views"
Cohesion: 0.09
Nodes (29): EMPTY_STATES, MODES, EmptyState(), Icon(), InputPanel(), InputPanelProps, GEMMA_SUPPORTED_LANGUAGES, LanguagePicker() (+21 more)

### Community 1 - "Multi-Perspective Analysis API"
Cohesion: 0.10
Nodes (24): dynamic, fail(), maxDuration, POST(), runtime, analysisSchema(), evidenceItem, modeInstructions() (+16 more)

### Community 2 - "Next.js App Shell & Config"
Cohesion: 0.08
Nodes (24): metadata, nextConfig, dependencies, next@^16.4.3, react-dom@^19.3.1, devDependencies, @types/node@^26.6.5, @types/react@^19.3.0 (+16 more)

### Community 3 - "Chat & Ollama Streaming API"
Cohesion: 0.15
Nodes (21): dynamic, maxDuration, NUM_CTX, OLLAMA_URL, POST(), runtime, dynamic, maxDuration (+13 more)

### Community 4 - "Evaluation Runner & Schemas"
Cohesion: 0.12
Nodes (9): analysis_schema(), mode_instructions(), build_messages(), call(), discover(), main(), print_row(), run_one() (+1 more)

### Community 5 - "TypeScript Compiler Config"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 6 - "Analysis Parser & Data Models"
Cohesion: 0.20
Nodes (15): cleanString(), isLegitimateTactic(), ModelAnalysis, normalizedTacticName(), nullableText(), parseAnalysis(), parseModelResponse(), runParserSelfCheck() (+7 more)

### Community 7 - "Page State & Execution Controller"
Cohesion: 0.17
Nodes (7): fingerprint(), Page(), createRun(), executeMode(), generateSelected(), generateSingleMode(), DebateArena()

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `Next.js App Shell & Config` to `Multi-Perspective Analysis API`, `Chat & Ollama Streaming API`?**
  _High betweenness centrality (0.165) - this node is a cross-community bridge._
- **Should `React UI Components & Views` be split into smaller, more focused modules?**
  _Cohesion score 0.08888888888888889 - nodes in this community are weakly interconnected._
- **Why does `react` connect `React UI Components & Views` to `Next.js App Shell & Config`, `Chat & Ollama Streaming API`?**
  _High betweenness centrality (0.080) - this node is a cross-community bridge._
- **Should `Multi-Perspective Analysis API` be split into smaller, more focused modules?**
  _Cohesion score 0.1010752688172043 - nodes in this community are weakly interconnected._
- **Why does `AnalysisMode` connect `React UI Components & Views` to `Multi-Perspective Analysis API`, `Analysis Parser & Data Models`?**
  _High betweenness centrality (0.055) - this node is a cross-community bridge._
- **Should `Next.js App Shell & Config` be split into smaller, more focused modules?**
  _Cohesion score 0.08374384236453201 - nodes in this community are weakly interconnected._
- **Should `Chat & Ollama Streaming API` be split into smaller, more focused modules?**
  _Cohesion score 0.14814814814814814 - nodes in this community are weakly interconnected._