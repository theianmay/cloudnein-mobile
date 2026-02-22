# cloudNein — Technical Roadmap & Progress Tracker

> **Last updated:** Phases 1-8 COMPLETE. All 3 routing paths verified on Android device. Reversible subgraph working end-to-end with Gemini 2.5 Flash.

---

## Pre-work (Done Before Hackathon)

| Task | File(s) | Status |
|---|---|---|
| Scaffold Ignite React Native app | entire project | DONE |
| Install `cactus-react-native` + `react-native-nitro-modules` | `package.json` | DONE |
| Install `@google/generative-ai` | `package.json` | DONE |
| Create Gemini cloud integration | `src/services/cactus/geminiCloud.ts` | DONE |
| Create base hybrid router | `src/services/cactus/hybridRouter.ts` | DONE (rewritten in Phase 4) |
| Create shared types | `src/services/cactus/types.ts` | DONE (updated in Phase 4) |
| Create generic tool definitions | `src/services/cactus/tools.ts` | DONE (rewritten in Phase 2) |
| Create barrel exports | `src/services/cactus/index.ts` | DONE (updated in Phase 6) |
| Create base ChatScreen UI | `src/screens/ChatScreen.tsx` | DONE (rewritten in Phase 5) |
| Wire ChatScreen as main route | `src/app/index.tsx` | DONE |
| Add `.env` for Gemini API key | `.env` | DONE |
| Add `.env` to `.gitignore` | `.gitignore` | DONE |
| Write concept analysis docs | `docs/sovereign-ledger-analysis.md` | DONE |
| Write tool ecosystem analysis | `docs/tool-ecosystem-analysis.md` | DONE |
| Write hackathon build plan | `docs/hackathon-build-plan.md` | DONE |

---

## Phase 1: Data Layer (SQLite + Sample Data) — DONE

**Goal:** Local financial database with sample expenses and budgets.

| Task | File(s) | Status |
|---|---|---|
| Install `react-native-nitro-sqlite` | `package.json` | DONE |
| Create DB initialization + schema | `src/services/database/index.ts` | DONE |
| Create seed data (20 expenses + 9 budgets) | `src/services/database/seed.ts` | DONE |
| Create query helper functions | `src/services/database/queries.ts` | DONE |

---

## Phase 2: Financial Tool Definitions + Executors — DONE

**Goal:** Replace generic tools with 5 Sovereign Ledger tools. Write the executor functions that actually run when FunctionGemma calls them.

| Task | File(s) | Status |
|---|---|---|
| Rewrite tool definitions (5 financial tools) | `src/services/cactus/tools.ts` | DONE |
| Create tool executor registry | `src/services/cactus/toolExecutor.ts` | DONE |
| Implement `query_expenses` executor | `src/services/cactus/toolExecutor.ts` | DONE |
| Implement `get_budget_status` executor | `src/services/cactus/toolExecutor.ts` | DONE |
| Implement `detect_pii` executor | `src/services/cactus/toolExecutor.ts` | DONE |
| Implement `redact_and_analyze` executor | `src/services/cactus/toolExecutor.ts` | DONE |
| Implement `cloud_analyze` executor | `src/services/cactus/toolExecutor.ts` | DONE |

---

## Phase 3: PII Detection + Sensitivity Scoring — DONE

**Goal:** Regex-based PII detection that runs before every query. Rule-based sensitivity scoring.

| Task | File(s) | Status |
|---|---|---|
| Create PII detection module (regex) | `src/services/privacy/piiDetector.ts` | DONE |
| Create sensitivity scorer (rule-based) | `src/services/privacy/sensitivityScorer.ts` | DONE |
| Create redaction function | `src/services/privacy/redactor.ts` | DONE |
| Create barrel exports | `src/services/privacy/index.ts` | DONE |

---

## Phase 4: Privacy-Aware Hybrid Router (Rewrite) — DONE

**Goal:** Replace the generic confidence-based router with the PII-first → sensitivity → route pipeline.

| Task | File(s) | Status |
|---|---|---|
| Update `HybridResult` type (add `redacted-cloud` source, sensitivity, PII count) | `src/services/cactus/types.ts` | DONE |
| Rewrite `hybridRouter.ts` with privacy pipeline | `src/services/cactus/hybridRouter.ts` | DONE |
| Integrate tool executor into router | `src/services/cactus/hybridRouter.ts` | DONE |
| Update barrel exports | `src/services/cactus/index.ts` | DONE |

---

## Phase 5: UI Update (Source Badges + Polish) — DONE

**Goal:** Colored source badges, PII detection indicators, tool execution results display.

| Task | File(s) | Status |
|---|---|---|
| Add colored source badges (green/blue/orange) | `src/screens/ChatScreen.tsx` | DONE |
| Add sensitivity level badges (red/yellow/green) | `src/screens/ChatScreen.tsx` | DONE |
| Add PII count badges (purple) | `src/screens/ChatScreen.tsx` | DONE |
| Show redacted preview for cloud-sent data | `src/screens/ChatScreen.tsx` | DONE |
| Show tool execution results (not just calls) | `src/screens/ChatScreen.tsx` | DONE |
| Update header for Sovereign Ledger branding | `src/screens/ChatScreen.tsx` | DONE |
| Update empty state with example prompts | `src/screens/ChatScreen.tsx` | DONE |
| Wire database initialization on mount | `src/screens/ChatScreen.tsx` | DONE |
| Multiline input support | `src/screens/ChatScreen.tsx` | DONE |

---

## Phase 6: TypeScript Compile + Exports — DONE

| Task | File(s) | Status |
|---|---|---|
| TypeScript compiles with zero errors | `npx tsc --noEmit` | DONE |
| All barrel exports updated | `src/services/cactus/index.ts` | DONE |

---

## Phase 7: On-Device Testing + Demo Polish — DONE

**Goal:** End-to-end flow works on a real device. Demo script rehearsed.

| Task | File(s) | Status |
|---|---|---|
| Run on Android device (EAS dev build) | — | DONE |
| Test: local-tool path (revenue, budget, expenses, wires) | — | DONE ✓ |
| Test: cloud-analysis path (reversible subgraph round-trip) | — | DONE ✓ |
| Test: privacy-redact path (PII → Person_A → Gemini → de-anonymize) | — | DONE ✓ |
| Test: airplane mode (offline) | — | PENDING |
| Fix Gemini model names (2.0→2.5-flash) | `geminiCloud.ts` | DONE |
| Add model fallback chain (2.5-flash → 2.5-flash-lite) | `geminiCloud.ts` | DONE |
| Fix fallback regex for revenue queries | `hybridRouter.ts` | DONE |
| Upgrade privacy-redact to use reversible subgraph + compliance reasoning | `hybridRouter.ts` | DONE |

---

## Phase 8: Reversible Subgraph + DataExplorer — DONE

| Task | File(s) | Status |
|---|---|---|
| Implement reversible subgraph (NodeMap) in redactor | `src/services/privacy/redactor.ts` | DONE |
| Integrate subgraph into cloud-analysis path | `src/services/cactus/hybridRouter.ts` | DONE |
| Integrate subgraph into privacy-redact path | `src/services/cactus/hybridRouter.ts` | DONE |
| DataExplorer screen (view all 4 SQLite tables) | `src/screens/DataExplorerScreen.tsx` | DONE |
| Tab navigation (Chat + Local Data) | `src/app/_layout.tsx`, `src/app/data.tsx` | DONE |

---

## Phase 9: Stretch Goals (If Time Permits)

| Task | File(s) | Status |
|---|---|---|
| Voice input via `CactusSTT` | `src/services/cactus/stt.ts` | NOT STARTED |
| Connectivity-aware routing (NetInfo) | `src/services/cactus/hybridRouter.ts` | NOT STARTED |
| Align with teammate's Python routing strategy | `src/services/cactus/hybridRouter.ts` | NOT STARTED |

---

## Architecture Diagram

```
User Input
    │
    ▼
Stage 0: PII Detection (<1ms, regex)
    │ HIGH sensitivity → privacy-redact path ──┐
    │ LOW/MEDIUM ↓                             │
    ▼                                          │
Stage 1: Complexity Classifier (<1ms)          │
    │ ANALYTICAL → cloud-analysis path ──┐     │
    │ DATA-LOOKUP ↓                      │     │
    ▼                                    │     │
Stage 2: Context Narrowing (<1ms)        │     │
    │ 7 tools → 2-3 relevant tools       │     │
    ▼                                    │     │
Stage 3: FunctionGemma (~3s, on-device)  │     │
    │ High conf → local-tool ──┐         │     │
    │ Low conf → cloud-tool ──┐│         │     │
    │ All fail → fallback ───┐││         │     │
    ▼                        │││         │     │
Stage 4: Execution           │││         │     │
                             │││         │     │
  ┌──────────────────────────┘││         │     │
  │ local-tool / fallback     ││         │     │
  │ SQL → on-device SQLite    ││         │     │
  │                           ││         │     │
  │  ┌────────────────────────┘│         │     │
  │  │ cloud-tool              │         │     │
  │  │ Gemini picks tool →     │         │     │
  │  │ SQL → on-device SQLite  │         │     │
  │  │                         │         │     │
  │  │  ┌──────────────────────┘         │     │
  │  │  │ cloud-analysis                 │     │
  │  │  │ Gather local data              │     │
  │  │  │ → Build NodeMap (34 entities)  │     │
  │  │  │ → Anonymize (Vendor_A, etc.)   │     │
  │  │  │ → Gemini reasons               │     │
  │  │  │ → De-anonymize locally         │     │
  │  │  │                                │     │
  │  │  │  ┌─────────────────────────────┘     │
  │  │  │  │ privacy-redact                    │
  │  │  │  │ Detect PII → Build NodeMap ←──────┘
  │  │  │  │ → Anonymize (Person_A, SSN_A)
  │  │  │  │ → Gather local context
  │  │  │  │ → Gemini compliance analysis
  │  │  │  │ → De-anonymize locally
  │  │  │  │
  ▼  ▼  ▼  ▼
┌─────────────────┐
│ ChatScreen UI   │
│ Source badges    │
│ Routing reason   │
│ Confidence/time  │
│ Redacted preview │
└─────────────────┘
```

---

## File Map (Final State)

```
src/
├── app/
│   ├── _layout.tsx                    (Tabs: Chat + Local Data)
│   ├── index.tsx                      (ChatScreen route)
│   └── data.tsx                       (DataExplorerScreen route)
├── screens/
│   ├── ChatScreen.tsx                 (Main chat UI with badges + metadata)
│   ├── DataExplorerScreen.tsx         (Browse all 4 SQLite tables)
│   └── WelcomeScreen.tsx              (kept, unused)
├── services/
│   ├── cactus/
│   │   ├── index.ts                   (barrel exports)
│   │   ├── types.ts                   (HybridResult, RoutingPath, etc.)
│   │   ├── tools.ts                   (7 financial tools)
│   │   ├── toolExecutor.ts            (executor + fuzzy matching)
│   │   ├── hybridRouter.ts            (5-stage pipeline + reversible subgraph)
│   │   └── geminiCloud.ts             (Gemini 2.5 Flash + model fallback)
│   ├── database/
│   │   ├── index.ts                   (schema + init)
│   │   ├── seed.ts                    (realistic CFO data: 4 tables)
│   │   └── queries.ts                 (typed query functions)
│   └── privacy/
│       ├── index.ts                   (barrel exports)
│       ├── piiDetector.ts             (regex PII detection)
│       ├── sensitivityScorer.ts       (rule-based LOW/MEDIUM/HIGH)
│       └── redactor.ts                (reversible subgraph: NodeMap + anonymize/deAnonymize)
└── ...
```
