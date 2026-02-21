# Sovereign Ledger — Technical Roadmap & Progress Tracker

> **Last updated:** Phase 0 complete, starting Phase 1

---

## Pre-work (Done Before Hackathon)

| Task | File(s) | Status |
|---|---|---|
| Scaffold Ignite React Native app | entire project | DONE |
| Install `cactus-react-native` + `react-native-nitro-modules` | `package.json` | DONE |
| Install `@google/generative-ai` | `package.json` | DONE |
| Create Gemini cloud integration | `src/services/cactus/geminiCloud.ts` | DONE |
| Create base hybrid router | `src/services/cactus/hybridRouter.ts` | DONE (needs rewrite) |
| Create shared types | `src/services/cactus/types.ts` | DONE (needs update) |
| Create generic tool definitions | `src/services/cactus/tools.ts` | DONE (needs rewrite) |
| Create barrel exports | `src/services/cactus/index.ts` | DONE (needs update) |
| Create base ChatScreen UI | `src/screens/ChatScreen.tsx` | DONE (needs update) |
| Wire ChatScreen as main route | `src/app/index.tsx` | DONE |
| Add `.env` for Gemini API key | `.env` | DONE |
| Add `.env` to `.gitignore` | `.gitignore` | DONE |
| Write concept analysis docs | `docs/sovereign-ledger-analysis.md` | DONE |
| Write tool ecosystem analysis | `docs/tool-ecosystem-analysis.md` | DONE |
| Write hackathon build plan | `docs/hackathon-build-plan.md` | DONE |

---

## Phase 1: Data Layer (SQLite + Sample Data)

**Goal:** Local financial database with sample expenses and budgets.

| Task | File(s) | Status |
|---|---|---|
| Install `react-native-nitro-sqlite` | `package.json` | NOT STARTED |
| Create DB initialization + schema | `src/services/database/index.ts` | NOT STARTED |
| Create seed data (expenses + budgets) | `src/services/database/seed.ts` | NOT STARTED |
| Create query helper functions | `src/services/database/queries.ts` | NOT STARTED |

**Estimated time:** 45 min

---

## Phase 2: Financial Tool Definitions + Executors

**Goal:** Replace generic tools with 5 Sovereign Ledger tools. Write the executor functions that actually run when FunctionGemma calls them.

| Task | File(s) | Status |
|---|---|---|
| Rewrite tool definitions (5 financial tools) | `src/services/cactus/tools.ts` | NOT STARTED |
| Create tool executor registry | `src/services/cactus/toolExecutor.ts` | NOT STARTED |
| Implement `query_expenses` executor | `src/services/cactus/toolExecutor.ts` | NOT STARTED |
| Implement `get_budget_status` executor | `src/services/cactus/toolExecutor.ts` | NOT STARTED |
| Implement `detect_pii` executor | `src/services/cactus/toolExecutor.ts` | NOT STARTED |
| Implement `redact_and_analyze` executor | `src/services/cactus/toolExecutor.ts` | NOT STARTED |
| Implement `cloud_analyze` executor | `src/services/cactus/toolExecutor.ts` | NOT STARTED |

**Estimated time:** 60 min

---

## Phase 3: PII Detection + Sensitivity Scoring

**Goal:** Regex-based PII detection that runs before every query. Rule-based sensitivity scoring.

| Task | File(s) | Status |
|---|---|---|
| Create PII detection module (regex) | `src/services/privacy/piiDetector.ts` | NOT STARTED |
| Create sensitivity scorer (rule-based) | `src/services/privacy/sensitivityScorer.ts` | NOT STARTED |
| Create redaction function | `src/services/privacy/redactor.ts` | NOT STARTED |
| Create barrel exports | `src/services/privacy/index.ts` | NOT STARTED |

**Estimated time:** 30 min

---

## Phase 4: Privacy-Aware Hybrid Router (Rewrite)

**Goal:** Replace the generic confidence-based router with the PII-first → sensitivity → route pipeline.

| Task | File(s) | Status |
|---|---|---|
| Update `HybridResult` type (add `redacted` source) | `src/services/cactus/types.ts` | NOT STARTED |
| Rewrite `hybridRouter.ts` with privacy pipeline | `src/services/cactus/hybridRouter.ts` | NOT STARTED |
| Integrate tool executor into router | `src/services/cactus/hybridRouter.ts` | NOT STARTED |
| Update barrel exports | `src/services/cactus/index.ts` | NOT STARTED |

**Estimated time:** 45 min

---

## Phase 5: UI Update (Source Badges + Polish)

**Goal:** Colored source badges, PII detection indicators, tool execution results display.

| Task | File(s) | Status |
|---|---|---|
| Add colored source badges (green/blue/orange) | `src/screens/ChatScreen.tsx` | NOT STARTED |
| Show PII detection count in metadata | `src/screens/ChatScreen.tsx` | NOT STARTED |
| Show tool execution results (not just calls) | `src/screens/ChatScreen.tsx` | NOT STARTED |
| Update header subtitle for Sovereign Ledger | `src/screens/ChatScreen.tsx` | NOT STARTED |
| Update empty state text | `src/screens/ChatScreen.tsx` | NOT STARTED |

**Estimated time:** 30 min

---

## Phase 6: Integration Testing + Demo Polish

**Goal:** End-to-end flow works. Demo script rehearsed.

| Task | File(s) | Status |
|---|---|---|
| Test: local expense query works | — | NOT STARTED |
| Test: budget status query works | — | NOT STARTED |
| Test: PII detection triggers redaction | — | NOT STARTED |
| Test: airplane mode (offline) works | — | NOT STARTED |
| Test: cloud fallback with redacted data | — | NOT STARTED |
| Fix any bugs found | various | NOT STARTED |

**Estimated time:** 30 min

---

## Phase 7: Stretch Goals (If Time Permits)

| Task | File(s) | Status |
|---|---|---|
| Privacy dashboard screen | `src/screens/PrivacyDashboardScreen.tsx` | NOT STARTED |
| Voice input via `CactusSTT` | `src/services/cactus/stt.ts` | NOT STARTED |
| Connectivity-aware routing (NetInfo) | `src/services/cactus/hybridRouter.ts` | NOT STARTED |

---

## Architecture Diagram

```
User Input
    │
    ▼
┌────────────────────┐
│ PII Detector       │ ← Always runs first (regex, <1ms)
│ (local, instant)   │
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│ Sensitivity Scorer │ ← Rule-based: LOW / MEDIUM / HIGH
└────────┬───────────┘
         │
    ┌────┴────┬──────────┐
    │         │          │
   LOW      MEDIUM     HIGH
    │         │          │
    ▼         ▼          ▼
 FuncGemma  FuncGemma   Force
 picks any  (cloud      redact_and_analyze
 tool       blocked     (skip model)
    │       unless       │
    │       redact)      │
    ▼         │          │
┌─────────┐  │     ┌────┴──────────┐
│ Execute │  │     │ Redact PII    │
│ locally │  │     │ → Send to     │
│         │  │     │   Gemini      │
└─────────┘  │     └───────────────┘
             │
             ▼
      ┌─────────────┐
      │ Execute     │
      │ tool result │
      └─────────────┘
             │
             ▼
      ┌─────────────┐
      │ ChatScreen  │
      │ + badges    │
      └─────────────┘
```

---

## File Map (Final State)

```
src/
├── app/
│   ├── _layout.tsx                    (no changes needed)
│   └── index.tsx                      (DONE — points to ChatScreen)
├── screens/
│   ├── ChatScreen.tsx                 (Phase 5 — update UI)
│   └── WelcomeScreen.tsx              (kept, unused)
├── services/
│   ├── cactus/
│   │   ├── index.ts                   (Phase 4 — update exports)
│   │   ├── types.ts                   (Phase 4 — add redacted source)
│   │   ├── tools.ts                   (Phase 2 — rewrite with 5 tools)
│   │   ├── toolExecutor.ts            (Phase 2 — NEW)
│   │   ├── hybridRouter.ts            (Phase 4 — rewrite)
│   │   └── geminiCloud.ts             (DONE — no changes)
│   ├── database/
│   │   ├── index.ts                   (Phase 1 — NEW)
│   │   ├── seed.ts                    (Phase 1 — NEW)
│   │   └── queries.ts                 (Phase 1 — NEW)
│   └── privacy/
│       ├── index.ts                   (Phase 3 — NEW)
│       ├── piiDetector.ts             (Phase 3 — NEW)
│       ├── sensitivityScorer.ts       (Phase 3 — NEW)
│       └── redactor.ts                (Phase 3 — NEW)
└── ...
```
