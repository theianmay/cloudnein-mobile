# Hackathon Build Plan — Afternoon Sprint

> **Constraint:** ~5 hours of build time. Must ship a working demo.
> **Evaluated on:** Functionality, Hybrid Routing, Agentic Capability, Theme Alignment.

---

## The Idea: "Sovereign Ledger — Private Financial Agent"

A mobile financial assistant that keeps sensitive money data on-device. FunctionGemma handles routine queries locally. When the user asks something that requires deeper reasoning, the app **auto-detects PII, strips it, and sends only sanitized data to Gemini cloud.** The user sees transparent badges showing what ran where and why.

### Why This Scores Well Against the Rubric

| Criterion | How We Hit It | Target Score |
|---|---|---|
| **Functionality & Execution** | React Native app, runs on-device, pre-loaded data, chat UI already scaffolded | 4-5 |
| **Hybrid Architecture & Routing** | Privacy-based routing (not just confidence). PII detected → auto-redact → cloud. No PII → stay local. Connectivity-aware. | 4-5 |
| **Agentic Capability** | FunctionGemma dispatches to 5 tools. App-level orchestration pipeline runs PII check → route decision → tool execution → de-mask. | 4 |
| **Theme Alignment** | Entire architecture depends on local-first: financial data never leaves device raw. Airplane mode demo. FunctionGemma + Cactus are load-bearing. | 5 |

---

## What FunctionGemma Actually Does (Per Google's Docs)

**Supported:**
- Single turn: user query → model picks one tool
- Parallel: user query with independent parts → model picks multiple tools simultaneously

**NOT Supported (without fine-tuning):**
- Multi-step chaining (tool A output feeds into tool B)
- Multi-turn stateful conversation

**Our approach:** FunctionGemma is the **dispatcher**. Our app code is the **orchestrator**. This is honest and correct.

---

## The 5 Tools (Final)

These are designed for FunctionGemma to choose between. Max 5 keeps accuracy high.

### 1. `query_expenses`
- **What it does:** Queries local SQLite for expense data
- **Implementation:** SQL query against pre-loaded sample data
- **Runs:** 100% local
- **Build time:** 30 min
```
"Query expense records by category, date range, or amount. Use this for questions about spending, costs, totals, or transactions."
```

### 2. `get_budget_status`
- **What it does:** Returns budget vs. actual for a category
- **Implementation:** SQL aggregation against local data
- **Runs:** 100% local
- **Build time:** 20 min
```
"Get budget status showing budget limit versus actual spending for a category. Use for questions about budget, overspending, or remaining balance."
```

### 3. `detect_pii`
- **What it does:** Scans text for SSNs, emails, phone numbers, credit cards, names
- **Implementation:** Regex patterns in TypeScript (~20 lines)
- **Runs:** 100% local
- **Build time:** 15 min
```
"Detect personally identifiable information (PII) in text. Use when the user pastes or references text that may contain sensitive personal or financial data like names, SSNs, account numbers, emails, or phone numbers."
```

### 4. `redact_and_analyze`
- **What it does:** Strips detected PII from text, then sends sanitized version to Gemini for analysis
- **Implementation:** String replacement + Gemini API call
- **Runs:** Local redaction → Cloud analysis
- **Build time:** 30 min
```
"Redact sensitive information from text and send the sanitized version to cloud AI for deep analysis, market comparison, or strategic advice. Use when the question requires reasoning beyond simple lookups and the text contains sensitive data."
```

### 5. `cloud_analyze`
- **What it does:** Sends already-safe text to Gemini for complex reasoning
- **Implementation:** Gemini 2.0 Flash API call
- **Runs:** Cloud (only for non-sensitive queries)
- **Build time:** Already done
```
"Send a question to cloud AI for complex analysis, comparisons, trend analysis, or strategic advice. Only use when the question requires deep reasoning and the text does NOT contain sensitive personal or financial information."
```

### Why 5 is the right number:
- FunctionGemma accuracy degrades above 5-7 tools
- Each tool has a clearly distinct purpose
- Covers: local query, local aggregation, PII detection, hybrid redact+cloud, pure cloud
- Maps to the privacy routing story

---

## The Orchestration Flow (App Code, Not FunctionGemma)

```
User types message
       │
       ▼
┌──────────────────┐
│ Always: detect_pii│ ← Runs deterministically, no model needed
│ (regex, instant)  │
└───────┬──────────┘
        │
        ▼
┌───────────────────┐
│ Sensitivity Score  │ ← Rule-based: count PII entities
│ LOW / MEDIUM / HIGH│
└───────┬───────────┘
        │
        ├── LOW ──────► FunctionGemma picks from ALL 5 tools
        │                (likely picks local tools)
        │
        ├── MEDIUM ───► FunctionGemma picks from tools,
        │                but cloud_analyze is blocked;
        │                only redact_and_analyze allowed for cloud
        │
        └── HIGH ─────► Auto-route to redact_and_analyze
                         (skip FunctionGemma, force redaction)
```

**This is the "intelligent routing" the judges want.** It's not just confidence-based — it's **content-aware, privacy-aware, and dynamic.**

---

## Pre-loaded Sample Data (Skip File Ingestion)

20-30 rows of fake financial data in SQLite. Loaded on app start.

```sql
CREATE TABLE expenses (
  id INTEGER PRIMARY KEY,
  date TEXT,
  category TEXT,
  vendor TEXT,
  amount REAL,
  notes TEXT
);

CREATE TABLE budgets (
  id INTEGER PRIMARY KEY,
  category TEXT,
  monthly_limit REAL
);
```

Sample rows:
```
('2026-02-01', 'Engineering', 'AWS', 2400.00, 'Cloud hosting')
('2026-02-03', 'Marketing', 'Google Ads', 1500.00, 'Q1 campaign')
('2026-02-05', 'Payroll', 'ADP', 15000.00, 'February salaries - Project Alpha team')
('2026-02-10', 'Legal', 'Baker McKenzie', 3200.00, 'Acquisition review - confidential')
```

Budgets:
```
('Engineering', 5000.00)
('Marketing', 3000.00)
('Payroll', 20000.00)
('Legal', 4000.00)
```

---

## UI Plan

### Screen 1: Chat Interface (already built)
- Message bubbles with source badges: "Local" (green) / "Cloud" (blue) / "Redacted → Cloud" (orange)
- Tool call chips showing what was called and with what arguments
- Latency display per response

### Screen 2: Privacy Dashboard (stretch goal)
- Shows PII detections log
- Shows what was redacted before cloud transmission
- "Airplane mode" indicator

### Demo Script (for judging)

1. **Open app** — model already downloaded, data pre-loaded
2. **"What was my total spend in February?"** → FunctionGemma calls `query_expenses` → Runs locally → Green badge → ~100ms
3. **"Am I over budget on marketing?"** → FunctionGemma calls `get_budget_status` → Runs locally → Green badge → ~100ms
4. **Turn on Airplane Mode** → Repeat a query → Still works → Proves local-first
5. **Turn off Airplane Mode**
6. **Paste text with PII:** *"John Smith (SSN: 123-45-6789) approved $50K for Project X"* → App auto-detects PII → Orange badge "Redacted → Cloud" → Shows Gemini received `[PERSON] (SSN: [REDACTED]) approved $50K for [REDACTED]`
7. **"How does our engineering spend compare to typical Series A burn rates?"** → FunctionGemma calls `cloud_analyze` → Blue badge → Complex reasoning from Gemini
8. **Show the source badges** — "This is the Honest Hybrid. You always know what ran where."

**Total demo time: ~90 seconds. Hits all 4 rubric criteria.**

---

## Afternoon Build Schedule

| Time | Task | Status |
|---|---|---|
| **Hour 1** | Install `react-native-nitro-sqlite`, create DB schema, seed sample data | Not started |
| **Hour 2** | Implement 5 tool functions (query_expenses, get_budget_status, detect_pii, redact_and_analyze, cloud_analyze) | Not started |
| **Hour 2.5** | Wire tools to FunctionGemma via Cactus SDK, update tool definitions | Not started |
| **Hour 3** | Build the privacy-aware orchestration router (PII check → sensitivity → route) | Not started |
| **Hour 3.5** | Update ChatScreen UI: source badges, PII detection indicators, tool call display | Partially done |
| **Hour 4** | End-to-end testing, fix bugs, polish | Not started |
| **Hour 4.5** | Practice demo script, edge case testing | Not started |
| **Hour 5** | Buffer / stretch goals (privacy dashboard, voice input) | Stretch |

---

## What We Already Have (from earlier work)

- `cactus-react-native` + `react-native-nitro-modules` + `@google/generative-ai` installed
- `src/services/cactus/geminiCloud.ts` — Gemini 2.0 Flash integration
- `src/services/cactus/hybridRouter.ts` — base hybrid routing (needs updating for privacy-aware routing)
- `src/services/cactus/types.ts` — shared types
- `src/screens/ChatScreen.tsx` — chat UI with message bubbles, tool call chips, metadata display
- `.env` setup for Gemini API key

## What Needs to Change

1. **Replace generic tool definitions** in `tools.ts` with the 5 financial tools above
2. **Rewrite `hybridRouter.ts`** to use the PII-first → sensitivity → route pipeline
3. **Add SQLite layer** for expense data
4. **Implement tool executor functions** that actually run queries and PII detection
5. **Update ChatScreen** with colored source badges

---

## Risk Mitigation

| Risk | Mitigation |
|---|---|
| FunctionGemma picks wrong tool | Enriched tool descriptions with semantic keywords; only 5 tools |
| SQLite setup takes too long | Fallback: use in-memory JS object as data store (skip SQLite) |
| Model download too slow at hackathon | Pre-download weights before demo time |
| Gemini API rate limits | Cache cloud responses; keep demo queries predictable |
| React Native build issues | Already have working scaffold; prebuild ahead of time |
