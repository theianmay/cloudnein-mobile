# cloudNein — Privacy-First Financial AI for CFOs

> **Cloud? Nein.** Your financial data stays local.

---

## The Problem

CFOs handle the most sensitive data in any company: SSNs, salaries, M&A details, cash positions, client revenue. They need instant answers between meetings, but they'd **never** paste this into ChatGPT. Current solutions force a choice: privacy **or** intelligence. We built both.

---

## Our Solution

**cloudNein** is a mobile-first financial AI assistant that runs **entirely on-device** using FunctionGemma + Cactus Compute. When cloud reasoning is needed, we use a novel **reversible subgraph** — a bidirectional anonymization system that:

1. **Anonymizes** all entities (vendors, clients, employees, PII) into node aliases (`Vendor_A`, `Client_B`, `Person_A`)
2. **Sends** the anonymized structural data to Gemini for reasoning
3. **De-anonymizes** the response locally — real names never leave the device

The cloud sees financial relationships without knowing who the actual entities are. The CFO gets specific, actionable advice with real names restored.

---

## What Makes This Novel

### 1. Reversible Subgraph Anonymization

Standard redaction tools (VIDIZMO, PwC Anonymizer) are **one-way**: `"John Doe"` → `"[REDACTED]"`. This breaks AI reasoning because:
- The cloud can't distinguish between entities
- Responses are generic: *"The individual should..."*
- No way to re-hydrate with real names

**Our approach:** Every entity gets a unique node alias stored in an on-device `NodeMap`:

```
LOCAL DEVICE (NodeMap — never transmitted)    CLOUD (Gemini)
────────────────────────────────────────       ──────────────
Baker McKenzie  ↔  Vendor_A                    Sees: Vendor_A
Acme Corp       ↔  Client_A                    Sees: Client_A
Sarah Chen      ↔  Employee_A                  Sees: Employee_A
123-45-6789     ↔  SSN_A                       Sees: SSN_A
```

Gemini reasons over structural relationships: *"Vendor_A has the highest legal spend at $3,200. Consider renegotiating Vendor_A's contract..."*

Locally, we swap aliases back: *"Baker McKenzie has the highest legal spend at $3,200. Consider renegotiating Baker McKenzie's contract..."*

**This is genuinely novel.** No existing redaction tool does round-trip anonymization with structural preservation.

---

### 2. Privacy-Aware Agentic Routing

Not just "local for fast, cloud for complex" — we built a **5-stage pipeline** that dynamically adjusts routing based on data sensitivity:

```
Stage 0: PII Detection (<1ms)
  ↓ HIGH sensitivity → privacy-redact path
  ↓ LOW/MEDIUM
Stage 1: Complexity Classification (<1ms)
  ↓ ANALYTICAL → cloud-analysis path (reversible subgraph)
  ↓ DATA-LOOKUP
Stage 2: Context Narrowing (<1ms)
  ↓ 7 tools → 2-3 relevant tools
Stage 3: FunctionGemma Tool Calling (~3s, on-device)
  ↓ High confidence → local-tool
  ↓ Low confidence → cloud-tool
  ↓ All fail → local-fallback (keyword extraction)
Stage 4: Execution
  → local-tool: SQL query on-device
  → cloud-tool: Gemini picks tool → SQL on-device
  → cloud-analysis: anonymize → Gemini → de-anonymize
  → privacy-redact: anonymize → Gemini compliance → de-anonymize
```

The agent **autonomously** decides what data is safe to send to the cloud. The CFO never has to think about privacy.

---

## Tech Stack

- **FunctionGemma 270M** (via Cactus Compute) — on-device tool selection
- **Gemini 2.5 Flash** — cloud reasoning (only with anonymized data)
- **React Native + Expo** — cross-platform mobile
- **SQLite** — on-device financial database (expenses, budgets, revenue, wire approvals)
- **TypeScript** — end-to-end type safety

---

## Demo Flow (5 minutes)

| # | Prompt | Routing Path | What Judges See |
|---|---|---|---|
| 1 | "How much revenue from NovaPharma?" | `local-tool` | FunctionGemma → $76K, 3.5s, green badge |
| 2 | "What is marketing budget?" | `local-tool` | Budget status: 238% over limit |
| 3 | "Should we cut our marketing spend?" | `cloud-analysis` | **34 entities anonymized** → Gemini reasons → de-anonymized locally |
| 4 | "John Smith SSN 123-45-6789 approved $50K" | `privacy-redact` | PII detected → Person_A + SSN_A → Gemini compliance analysis → de-anonymized |
| 5 | Switch to "Local Data" tab | — | Shows all 4 SQLite tables the AI queries |
| 6 | Airplane mode → "How much did we pay Baker McKenzie?" | `local-tool` | Works fully offline |

**The showstopper:** Step 3. Show the logs — judges can verify that real vendor/client names never left the device, yet Gemini gave specific, actionable CFO advice.

---

## Current Status

✅ All 3 routing paths verified on Android device  
✅ Reversible subgraph working end-to-end with Gemini 2.5 Flash  
✅ 7 tools across 4 database tables (expenses, budgets, revenue, wire approvals)  
✅ DataExplorer UI — full transparency into local data  
✅ TypeScript compiles clean, zero critical bugs  

**Next:** Airplane mode testing, demo rehearsal

---

## How to Contribute

We're looking for:
- **Testing** — try breaking the privacy guarantees, find edge cases
- **UX feedback** — is the routing transparency clear enough?
- **Voice input** — integrate `cactus_transcribe` for voice-to-action
- **Multi-turn conversations** — extend the agent to handle follow-up queries

---

## Why This Matters

A CFO would **never** paste SSNs, salary data, or M&A details into ChatGPT. But they need AI-powered financial intelligence on their phone. cloudNein proves you can have both privacy **and** intelligence — by keeping sensitive data local and only sending anonymized structural relationships to the cloud.

This is only possible because FunctionGemma runs on-device via Cactus Compute. The local-first architecture isn't a performance optimization — it's the **entire value proposition**.

---

**Team:** Ian May  
**Demo:** [Link to video when ready]  
**Code:** [GitHub repo]
