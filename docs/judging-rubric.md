# cloudNein — Judging Rubric & Scoring Strategy

---

## Official Judging Criteria

### 1. Functionality & Execution (1–5)

| Score | Description |
|---|---|
| 1 | Project does not run or is entirely conceptual. |
| 2 | Major bugs prevent core functionality from being demonstrated. |
| 3 | Runs, but has significant stability or integration issues. |
| 4 | Runs reliably, demonstrates core features. |
| 5 | Flawless execution, robust on-device performance. |

**Our target: 5**

**How we score it:**
- App runs natively on Android with zero critical bugs
- FunctionGemma model downloads and loads on-device
- SQLite database initializes with realistic CFO financial data
- All 7 tool calls execute and return real query results (not mocked)
- PII detection, reversible subgraph redaction, and cloud analysis all work end-to-end
- UI shows results with colored badges, routing path, routing reason, confidence, and metadata
- DataExplorer tab lets judges see the raw SQLite data the AI queries

**Risk factors:**
- Native build issues (CMake, Gradle) — must resolve before demo
- Model download time on slow WiFi — pre-download before demo
- expo-sqlite or cactus-react-native runtime crashes
- Gemini API quota — model fallback chain (2.5-flash → 2.5-flash-lite) mitigates

---

### 2. Hybrid Architecture & Routing (1–5)

| Score | Description |
|---|---|
| 1 | No clear local/cloud split; all logic is in the cloud. |
| 2 | Local execution is present but serves no meaningful purpose. |
| 3 | Simple, static routing between local (FunctionGemma) and cloud (Gemini). |
| 4 | Intelligent routing based on context (e.g., latency, complexity, connectivity). |
| 5 | Sophisticated, dynamic, and optimized routing that showcases seamless fallback/escalation. |

**Our target: 5**

**How we score it:**
- **Privacy-aware routing** — not just latency/complexity, but *sensitivity-based* routing that's unique to financial data
- **3-tier sensitivity pipeline:**
  - LOW → FunctionGemma picks any tool, executes locally
  - MEDIUM → FunctionGemma picks tool, but `cloud_analyze` is blocked
  - HIGH → Bypass FunctionGemma entirely, reversible subgraph redaction → Gemini compliance analysis → de-anonymize locally
- **5-stage pipeline:** PII detection → complexity classification → context narrowing → FunctionGemma tool calling → execution
- **5 routing paths:** local-tool, cloud-tool, cloud-analysis, privacy-redact, local-fallback
- **Reversible subgraph anonymization** — bidirectional NodeMap (Vendor_A ↔ "Baker McKenzie") that never leaves the device. Cloud sees structural relationships without real names. Response de-anonymized locally.
- **Confidence-based fallback** — if FunctionGemma's confidence is low, escalate to Gemini for tool selection (but still respect sensitivity filters)
- **Offline resilience** — airplane mode demo proves local-only path works
- **Transparency** — every response shows which path was taken and why

**What makes this a "5" not a "4":**
- It's not just "local for fast, cloud for complex" — it's a *privacy-first decision tree* that dynamically adjusts available tools based on data sensitivity
- **Reversible subgraph** is genuinely novel — no existing redaction tool does round-trip anonymization with structural preservation
- Redaction pipeline proves data never leaves raw — this is verifiable in the UI and logs

---

### 3. Agentic Capability & Utility (1–5)

| Score | Description |
|---|---|
| 1 | Simple, non-agentic task execution. |
| 2 | Agent logic is present but trivial or easily replicated without agents. |
| 3 | Demonstrates basic agentic workflow using FunctionGemma. |
| 4 | Complex, useful agent workflow that leverages local speed for responsiveness. |
| 5 | Groundbreaking agent system that unlocks a new local-first UX pattern (e.g., real-time offline coordination). |

**Our target: 4–5**

**How we score it:**
- **Autonomous tool selection** — FunctionGemma decides which of 5+ tools to call based on natural language
- **Multi-step reasoning** — PII detection → sensitivity scoring → tool filtering → tool selection → execution → result formatting
- **Real utility** — CFO gets actual answers to real questions (expense lookups, budget status, vendor history, anomaly flags)
- **Privacy as agentic behavior** — the agent *autonomously* decides to protect data, not the user
- **Offline agentic capability** — agent works fully without internet, which is genuinely novel

**What pushes us toward "5":**
- The agent doesn't just call tools — it *reasons about data sensitivity* before deciding what tools are even available
- **Reversible subgraph** enables a new pattern: cloud AI gives specific, actionable advice using node aliases, then the device swaps real names back in. This multi-step anonymize→reason→de-anonymize chain is genuinely agentic.
- This is a new UX pattern: "privacy-aware agentic routing" that only makes sense on-device
- The CFO never has to think about privacy — the agent handles it automatically

---

### 4. Theme Alignment — Local-First & Tech Stack (1–5)

| Score | Description |
|---|---|
| 1 | Does not use FunctionGemma or Cactus Compute, or uses them superficially. |
| 2 | Uses the required tech, but the solution would work identically in the cloud. |
| 3 | Clearly uses FunctionGemma/Cactus, but the privacy/latency benefits are not central to the demo. |
| 4 | Excellent use of FunctionGemma for speed/privacy, with Gemini used effectively for fallback. |
| 5 | The entire architecture is fundamentally dependent on the local-first capabilities unlocked by FunctionGemma/Cactus Compute. |

**Our target: 5**

**How we score it:**
- **FunctionGemma is the brain** — all tool selection happens on-device via Cactus Compute
- **Privacy is impossible without local-first** — PII detection MUST happen before data leaves the device; this fundamentally requires on-device inference
- **Latency advantage** — local tool selection + local SQL queries = sub-second responses for most queries
- **Offline capability** — the entire expense/budget query flow works without internet
- **Gemini is the escalation path, not the default** — cloud is used only when local confidence is low or complex analysis is needed, and always with redacted data

**What makes this a "5" not a "4":**
- This app *cannot exist* as a cloud-only solution — a CFO would never paste SSNs, salary data, or M&A details into a cloud API
- The local-first architecture is the *entire value proposition*, not a performance optimization
- FunctionGemma + Cactus Compute enable a use case that was previously impossible: private, instant financial intelligence on a phone

---

## Demo Narrative for Judges

### Opening (30 seconds)
> "Meet the CFO-on-the-Go. They're between meetings, approving wires, checking budgets, and reviewing expenses — all from their phone. The problem? Financial data is the most sensitive data in any company. They'd never paste it into ChatGPT. cloudNein solves this — cloud? Nein. Your data stays local."

### Demo Flow (5 minutes)

| # | Prompt | Routing Path | What Judges See | Criterion |
|---|---|---|---|---|
| 1 | "How much revenue did we receive from NovaPharma?" | `local-tool` | FunctionGemma → `query_revenue` → $76K, 3.5s, green badge | Functionality, Agentic |
| 2 | "What is marketing budget?" | `local-tool` | Budget status with % used, status flags | Functionality |
| 3 | "Show pending wire approvals" | `local-tool` | Wire approval queue from local DB | Agentic (tool selection) |
| 4 | "Should we cut our marketing spend?" | `cloud-analysis` | **Reversible subgraph**: 34 entities anonymized → Gemini reasons over anonymized data → de-anonymized locally. Blue badge. | Hybrid Routing, Theme |
| 5 | "John Smith SSN 123-45-6789 approved $50K" | `privacy-redact` | PII auto-detected (HIGH) → Person_A + SSN_A → Gemini compliance analysis with local financial context → de-anonymized. Orange badge. | Hybrid Routing, Agentic |
| 6 | Switch to "Local Data" tab | — | Shows the 4 SQLite tables the AI queries — full transparency | Functionality |
| 7 | Turn on airplane mode → "How much did we pay Baker McKenzie?" | `local-tool` | Works fully offline — zero cloud dependency | Theme (local-first) |
| 8 | Point to routing reasons, badges, logs | — | Every response shows path taken, why, confidence, time | All criteria |

### Key Demo Moments

**Step 4 is the showstopper.** Show the logs:
- "34 entities registered" — every vendor, client, employee aliased
- "Anonymized context" — Gemini sees `Vendor_A`, `Client_B`, not real names
- "De-anonymized response" — real names swapped back locally
- Ask: *"Would you paste Baker McKenzie's $5,200 legal fee into ChatGPT? We didn't."*

### Closing (30 seconds)
> "Every query runs through a 5-stage privacy-first pipeline. PII is detected in <1ms. Sensitive data is anonymized via a reversible subgraph — a bidirectional map that never leaves the device. The cloud reasons over structural relationships without knowing real names. And when there's no internet, the CFO still gets answers. This is only possible because FunctionGemma runs on-device via Cactus Compute."

---

## Risk Mitigation for Demo Day

| Risk | Mitigation |
|---|---|
| Model download takes too long | Pre-download before demo, verify model is cached |
| Android build fails | Have backup: screen recording of working demo |
| Gemini API key expires or quota hit | Model fallback chain (2.5-flash → 2.5-flash-lite), local still works |
| WiFi is unreliable | Airplane mode demo is a *feature*, not a bug |
| FunctionGemma picks wrong tool | Confidence threshold triggers Gemini fallback |
| Judge asks "why not just use ChatGPT?" | "Would you paste your company's SSNs and salary data into ChatGPT?" |
