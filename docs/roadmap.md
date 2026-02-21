# Sovereign Ledger — Technical Roadmap & Progress Tracker

> **Last updated:** Phases 1-6 COMPLETE. TypeScript compiles cleanly. Ready for on-device testing.

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

## Phase 7: On-Device Testing + Demo Polish — NEXT

**Goal:** End-to-end flow works on a real device. Demo script rehearsed.

| Task | File(s) | Status |
|---|---|---|
| Run `npx expo prebuild --clean` | — | NOT STARTED |
| Run on iOS or Android device | — | NOT STARTED |
| Test: local expense query works | — | NOT STARTED |
| Test: budget status query works | — | NOT STARTED |
| Test: PII detection triggers redaction | — | NOT STARTED |
| Test: airplane mode (offline) works | — | NOT STARTED |
| Test: cloud fallback with redacted data | — | NOT STARTED |
| Fix any bugs found | various | NOT STARTED |

**Estimated time:** 30-45 min

---

## Phase 8: Stretch Goals (If Time Permits)

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
