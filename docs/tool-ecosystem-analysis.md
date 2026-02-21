# Tool Ecosystem / "Private Execution Engine" — Fact-Check & Analysis

> **Purpose:** Aggressive analysis of the "Privacy + Intelligence Toolkit" perspective and the proposed tool ecosystem for the Sovereign Ledger hackathon project.

---

## Overall Assessment

**This perspective is significantly more grounded than the first doc**, but it still contains several critical misunderstandings about FunctionGemma's capabilities and makes library assumptions that don't hold in a React Native context.

The framing is correct:
- FunctionGemma = planner/dispatcher
- Tools = your local functions
- Libraries = implementation helpers

But the **specific tool designs and library choices have problems**. Let's go claim by claim.

---

## 1. The "Agent Orchestration Flow" Claim

The doc proposes this 6-step agent flow:

```
1. detect_pii
2. sensitivity_score → HIGH
3. redact_text
4. local_summarize
5. extract_actions
6. cloud_reason (with redacted data)
```

**Verdict: MISLEADING — FunctionGemma cannot do sequential chaining.**

Per Google's official FunctionGemma documentation (ai.google.dev/gemma/docs/functiongemma/formatting-and-best-practices):

> **Unsupported Workflows:**
> "**Multi-Step (Chaining):** Scenarios where the output of one tool is required as the argument for a subsequent tool. FunctionGemma is **not trained to reason through this dependency chain automatically.**"

> **Supported Workflows:**
> - **Single Turn:** User provides a query, model selects a single tool.
> - **Parallel:** User provides a query with multiple independent requests, model generates multiple tool calls simultaneously.

This means the proposed 6-step flow where `detect_pii` output feeds into `sensitivity_score` which feeds into `redact_text` is **not something FunctionGemma can plan on its own.** It can call `detect_pii` and `redact_text` in parallel if they're independent, but it cannot reason about "first do A, then feed A's result into B."

**Fix:** You have two options:

1. **Hardcoded orchestration pipeline** — YOUR code defines the step order. FunctionGemma just triggers the pipeline. Define a single tool like `process_sensitive_text(text)` that internally runs the full chain. FunctionGemma decides *when* to call it, not *how* to chain steps.

2. **Multi-turn loop** — Your app code runs a loop: call FunctionGemma → execute the tool it picks → feed the result back → call FunctionGemma again. This requires external state management (FunctionGemma is not trained for multi-turn). It's fragile at 270M params and will eat your latency budget.

**Recommendation:** Option 1. For the hackathon, a hardcoded pipeline triggered by FunctionGemma is dramatically more reliable than hoping a 270M model figures out chaining.

---

## 2. Tool-by-Tool Fact-Check

### Tool 1: `detect_pii(text)` — "Powered by Microsoft Presidio"

**Verdict: FALSE for React Native. Presidio is Python-only.**

Microsoft Presidio is a Python library. It has:
- A Python SDK (`presidio-analyzer`, `presidio-anonymizer`)
- A Docker-based REST API server
- **No JavaScript/TypeScript SDK**
- **No React Native compatibility**
- It depends on spaCy NLP models (hundreds of MB, Python-only)

You **cannot** `import presidio` in React Native. You would need to either:
- Run a Presidio server somewhere and call it over HTTP (defeats the "local" claim)
- Write your own PII detection in JavaScript

**Fix:** For the hackathon, write regex-based PII detection in TypeScript. This is actually more honest and more impressive to judges — it proves you understand what PII patterns look like:

```typescript
const PII_PATTERNS = {
  ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
  email: /\b[\w.-]+@[\w.-]+\.\w+\b/g,
  phone: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
  creditCard: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
}
```

This is lightweight, runs on-device, zero dependencies, and is perfectly adequate for a demo.

### Tool 2: `redact_text(text, entities)` — "Presidio already supports anonymization"

**Verdict: SAME PROBLEM — Presidio doesn't run in React Native.**

But the concept is valid. A string replacement function that takes detected entities and masks them is trivial to implement:

```typescript
function redactText(text: string, entities: PIIEntity[]): string {
  let redacted = text
  for (const entity of entities) {
    redacted = redacted.replace(entity.value, `[${entity.type}]`)
  }
  return redacted
}
```

This is 5 lines of code. No library needed.

### Tool 3: `sensitivity_score(text)` — "Local classifier (small model or rule-based)"

**Verdict: PARTIALLY TRUE — but the "small model" option is unrealistic.**

Running a *second* classification model alongside FunctionGemma on a mobile device is a bad idea:
- Memory pressure (two models loaded simultaneously)
- Cactus SDK manages one model handle at a time (you'd need to destroy/reinit)
- Adds latency

**Fix:** Make this rule-based. Count PII detections, check for financial keywords, return a score. This is fast, deterministic, and doesn't need a model:

```typescript
function sensitivityScore(piiCount: number, hasFinancialData: boolean): "LOW" | "MEDIUM" | "HIGH" {
  if (piiCount >= 3 || hasFinancialData) return "HIGH"
  if (piiCount >= 1) return "MEDIUM"
  return "LOW"
}
```

### Tool 4: `local_summarize(text)` — "Small Gemma model via Cactus"

**Verdict: MISLEADING — FunctionGemma is not a summarization model.**

The doc says "Fast. Private. Offline." — but FunctionGemma 270M is explicitly **not a dialogue/generation model**. Per Google:

> "FunctionGemma is not intended for use as a direct dialogue model."

It is trained to output structured function calls, not natural language summaries. If you ask it to summarize text, you will get garbage or hallucinated function calls.

**Fix:** Two realistic options:
1. Load a different Cactus model for summarization (e.g., `lfm2-vl-450m` or `qwen3-0.6b` which the SDK defaults to). But this means managing two model lifecycles.
2. Send to Gemini cloud for summarization (after redaction). This is more honest and plays into the hybrid story.
3. Skip "summarize" and focus on structured extraction (which FunctionGemma CAN do via tool calls).

**Recommendation:** Drop `local_summarize` as a FunctionGemma tool. If you need summarization, either use a second Cactus model or route to cloud. Don't pretend FunctionGemma can summarize.

### Tool 5: `extract_actions(text)` — "Via prompt engineering"

**Verdict: PARTIALLY TRUE — but FunctionGemma extracts via tool schema, not free-form.**

FunctionGemma can output structured JSON — but only in the form of **tool call arguments**. So you'd define:

```json
{
  "name": "extract_actions",
  "parameters": {
    "properties": {
      "tasks": { "type": "string", "description": "Comma-separated list of tasks" },
      "deadline": { "type": "string", "description": "Any deadline mentioned" },
      "contacts": { "type": "string", "description": "People mentioned" }
    }
  }
}
```

FunctionGemma would fill in the arguments. This is within its capability for simple, clear prompts. But for complex or ambiguous text, a 270M model will miss things or hallucinate.

**Fix:** Keep this tool, but set expectations low. It works for obvious cases ("Call John at 3pm about the budget") and fails for subtle ones. Enriched tool descriptions help (per Google's own guidance).

### Tool 6: `local_search(query)` — "On-device embeddings + vector store"

**Verdict: PARTIALLY TRUE — possible but not trivial.**

The Cactus React Native SDK does support:
- `embed()` for text embeddings
- `CactusIndex` for vector storage and querying

So this is technically feasible. However:
- You'd need to pre-embed documents and store them
- The embedding model may need to be different from FunctionGemma
- Memory management with multiple models is tricky

**Fix:** Use the Cactus SDK's `CactusIndex` + `embed()` if you have time. For MVP, a simple keyword search over SQLite is faster to implement and more reliable.

### Tool 7: `cloud_reason(text)` — "Gemini fallback"

**Verdict: VERIFIED — this is straightforward.**

Already implemented in our codebase via `geminiCloud.ts`. The key constraint is that it should only receive redacted/anonymized data, which is the whole point.

---

## 3. The "Real Agent" Orchestration Claim

> "That's real orchestration."

**Verdict: MISLEADING — it's real orchestration if YOUR CODE does the orchestrating.**

FunctionGemma cannot plan a 6-step pipeline. What you can build is:

```
User input
  → FunctionGemma picks ONE tool (or parallel independent tools)
  → Your code executes the tool(s)
  → Your code decides next step (hardcoded pipeline logic)
  → Optionally call FunctionGemma again with updated context
  → Repeat until done
```

This IS agentic — but the "agent loop" is in your application code, not in FunctionGemma's head. FunctionGemma is the tool selector at each step. Your code is the orchestrator.

This is actually fine! Many real agent systems work this way (LangChain, CrewAI, etc. all have external orchestration loops). Just don't claim FunctionGemma is "reasoning through" the pipeline.

---

## 4. The "Tool Categories" Problem

The doc proposes 4 categories with 15+ tools:
- Cognitive Tools (5)
- Privacy Tools (4)
- Memory Tools (4)
- Escalation Tools (3)

**Verdict: WAY too many tools for FunctionGemma 270M.**

Per the hackathon benchmark data, FunctionGemma's accuracy drops significantly as tool count increases:
- **1 tool** (easy): High accuracy
- **2-5 tools** (medium): Moderate accuracy
- **5+ tools** (hard): Struggles to pick the right one

With 15+ tools, FunctionGemma will pick the wrong tool constantly. The model card says it's "optimized to be extremely versatile... in single turn scenarios" — but versatile doesn't mean it can discriminate between 15 similar-sounding tools.

**Fix:** Max 5-7 tools total, with clearly distinct descriptions. Use Google's recommended "enriched tool definitions" with semantic keywords in descriptions.

---

## 5. The Image/Audio/Document Tools Suggestions

**Verdict: MOSTLY IRRELEVANT — focus-killing scope creep.**

- "detect faces locally" — requires a separate ML model (not FunctionGemma)
- "blur faces automatically" — image processing, not tool calling
- "transcribe locally" — Cactus DOES support this (`CactusSTT`), and it's a hackathon rubric
- "detect emotional tone" — requires a sentiment model, not FunctionGemma
- "detect contract clauses" — way beyond 270M capability
- "compute totals locally" — yes, this is just code

**Fix:** If you add anything beyond text, add **voice transcription** (`CactusSTT`) since it's explicitly a judging rubric (Rubric 3: "voice-to-action products leveraging `cactus_transcribe`"). Skip everything else.

---

## 6. The "Solo Builder Strategy" Assessment

The doc recommends:
1. `detect_pii`
2. `redact_text`
3. `local_summarize`
4. `extract_tasks`
5. `local_memory_search`
6. `cloud_reason`

**Verdict: MOSTLY GOOD — with corrections.**

Revised realistic solo-builder toolkit:

| # | Tool | Implementation | Feasibility |
|---|---|---|---|
| 1 | `detect_pii` | Regex patterns in TypeScript | Easy (30 min) |
| 2 | `redact_text` | String replacement using PII results | Easy (15 min) |
| 3 | `query_expenses` | SQL query against local SQLite | Easy (30 min) |
| 4 | `extract_tasks` | FunctionGemma structured extraction | Medium (45 min) |
| 5 | `cloud_analyze` | Gemini with redacted data | Done (already built) |
| 6 | `get_budget_status` | Local SQL aggregation | Easy (20 min) |

Dropped: `local_summarize` (FunctionGemma can't summarize), `local_memory_search` (stretch goal only)
Added: `query_expenses`, `get_budget_status` (concrete financial tools that map to the Sovereign Ledger concept)

---

## 7. What This Doc Gets RIGHT

Credit where it's due:

1. **"You are building an orchestration layer, not custom ML models"** — This is the correct framing. Judges don't expect novel research.
2. **"5-7 well-defined tools with clear reasoning why each exists"** — Exactly right.
3. **"Show decision transparency (why local vs cloud)"** — This is Rubric 1. The "Honest Hybrid" UI badges are a great idea.
4. **"FunctionGemma = planner, tools = your functions, libraries = helpers"** — Correct mental model.
5. **The scope recommendation (6 tools)** — Right ballpark.

---

## 8. Final Recommended Tool Set for Hackathon

Based on both docs, corrected for technical reality:

```
┌─────────────────────────────────────────────────┐
│              FunctionGemma (Dispatcher)          │
│         Picks which tool(s) to call              │
│      Supports: single + parallel calls           │
│      Does NOT support: chaining/multi-step       │
└──────────┬──────────────────────┬───────────────┘
           │                      │
    LOCAL TOOLS                CLOUD TOOLS
    ──────────                ────────────
    detect_pii()              cloud_analyze()
    redact_and_report()         (Gemini 2.0 Flash)
    query_expenses()            (receives ONLY
    get_budget_status()          redacted data)
    extract_tasks()
```

**Orchestration logic** (in your app code, NOT in FunctionGemma):
1. User input arrives
2. Run `detect_pii` always (deterministic, fast, no model needed)
3. Compute `sensitivity_score` (rule-based)
4. If LOW sensitivity → FunctionGemma picks a tool, run locally
5. If HIGH sensitivity → auto-redact, then FunctionGemma picks `cloud_analyze` or a local tool
6. Display result with source badge

This gives you:
- Privacy-based routing (novel strategy — Rubric 1)
- Real tool execution (Rubric 2)
- On-device priority (scoring bonus)
- Cloud only for complex + redacted queries (privacy story)

---

## TL;DR — Corrections Summary

| # | Claim | Issue | Severity |
|---|---|---|---|
| 1 | FunctionGemma can chain 6 tools sequentially | **Not trained for multi-step chaining** (Google docs) | **CRITICAL** |
| 2 | Microsoft Presidio for PII detection | **Python-only, no React Native support** | **CRITICAL** |
| 3 | `local_summarize` via FunctionGemma | **Not a dialogue/generation model** | **HIGH** |
| 4 | 15+ tools across 4 categories | Too many — accuracy degrades above 5-7 tools | **HIGH** |
| 5 | "Small model" for sensitivity scoring | Don't load a second model; use rule-based | Medium |
| 6 | Image/audio tools | Scope creep; only add voice (CactusSTT) if time permits | Medium |
| 7 | Agent orchestration framing | Your code orchestrates, FunctionGemma dispatches | Medium |
| 8 | Tool wrappers are "minimal work" | True for some, but Presidio claim is wrong | Medium |
