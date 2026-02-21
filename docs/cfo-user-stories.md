# cloudNein — CFO-on-the-Go User Stories

> The core insight: A CFO's phone is their command center between meetings. Today they fire off emails and wait hours for answers. cloudNein gives them instant, private answers from their own financial data — no waiting, no data leaks.

---

## The User: Mobile CFO

**Who:** CFO / VP Finance / Controller at a Series A–C startup or mid-market company ($5M–$200M revenue).

**When they use the app:**
- In the back of an Uber to a board meeting
- Between calls, scanning approval queues
- Weekend/evening when something urgent hits their inbox
- On a plane (offline!) reviewing financials before landing

**What they care about:**
- Speed — answers in seconds, not hours
- Privacy — financial data is the most sensitive data in the company
- Accuracy — wrong numbers are worse than no numbers
- Context — not just the number, but whether it's normal

---

## User Stories

### 1. Wire / Payment Approval Triage

> *"I just got a $47K wire approval request from procurement. Did we pay this vendor last quarter? How much?"*

**The scenario:** CFO gets a push notification that a wire needs approval. Before signing off, they want to sanity-check the amount against history.

**Questions they ask:**
- "How much did we pay [vendor] last quarter?"
- "What's our total spend with [vendor] this year?"
- "Is this amount unusual compared to previous payments?"
- "Show me all payments to [vendor] over $10K"

**Data sources:** AP ledger, payment history, vendor master

**Privacy concern:** Vendor names, payment amounts, and bank details are highly sensitive. This query should NEVER go to the cloud raw.

**Demo prompt:** `"How much did we pay Baker McKenzie last quarter?"`

---

### 2. Budget Check Before Committing Spend

> *"Marketing wants to sponsor a $15K conference. Are we over budget already?"*

**The scenario:** A department head pings the CFO on Slack asking for budget approval. CFO needs to know the current burn rate before saying yes.

**Questions they ask:**
- "What's our marketing spend this month vs budget?"
- "How much budget is left in [department] for Q1?"
- "Which categories are over budget right now?"
- "If I approve this, what's our remaining runway for marketing?"

**Data sources:** Budget allocations, GL actuals, department roll-ups

**Privacy concern:** LOW — category-level aggregates don't contain PII. Can go to cloud for richer analysis.

**Demo prompt:** `"Am I over budget on marketing?"`

---

### 3. Revenue Lookup Before a Meeting

> *"I'm about to walk into a board meeting. What was our revenue from enterprise clients last quarter?"*

**The scenario:** CFO is prepping in the elevator. Needs a quick number they can cite confidently.

**Questions they ask:**
- "What was total revenue last quarter?"
- "How much revenue came from [client/segment]?"
- "What's our MoM revenue growth?"
- "Top 5 clients by revenue this year?"

**Data sources:** Revenue ledger, CRM closed-won data, segment breakdowns

**Privacy concern:** Client names + revenue figures = MEDIUM-HIGH sensitivity. Redact client names before any cloud analysis.

**Demo prompt:** `"What was our total spend in February?"`

---

### 4. Expense Anomaly Investigation

> *"I just saw a $3,200 legal charge I don't recognize. What is this?"*

**The scenario:** CFO is reviewing a weekly expense digest on their phone and spots something unfamiliar.

**Questions they ask:**
- "What was the $3,200 legal charge on Feb 7?"
- "Show me all legal expenses this month"
- "Is this a recurring charge or one-time?"
- "Who approved this expense?"

**Data sources:** Expense ledger, approval workflows, vendor contracts

**Privacy concern:** Legal expenses often relate to M&A, litigation, or IP — extremely sensitive. Force local-only or redacted-cloud.

**Demo prompt:** `"Show me all legal expenses this month"`

---

### 5. Sensitive Transaction with PII

> *"John Smith (SSN 123-45-6789) approved a $50K equipment purchase. Log this and analyze."*

**The scenario:** CFO is dictating notes about a transaction that includes personal identifiable information. The app must detect and protect this automatically.

**Questions they ask:**
- "Log this approval: [person] approved [amount] for [purpose]"
- "Analyze this transaction for compliance flags"
- "Is this within [person]'s approval authority?"

**Data sources:** Approval authority matrix, transaction log, HR data

**Privacy concern:** **CRITICAL** — SSN, person names, and financial amounts. Must be detected, redacted, and never sent to cloud in raw form.

**Demo prompt:** `"John Smith SSN 123-45-6789 approved $50K for new servers"`

---

### 6. Cash Position / Runway Check

> *"Do we have enough cash to make payroll next month if the Series B is delayed?"*

**The scenario:** Late-night worry. CFO wants a quick sanity check without opening their laptop.

**Questions they ask:**
- "What's our current cash position?"
- "What's our monthly burn rate?"
- "How many months of runway do we have?"
- "What are our largest upcoming obligations?"

**Data sources:** Bank balances, cash flow forecast, payroll schedule, AP aging

**Privacy concern:** Cash position is board-level confidential. LOCAL ONLY.

**Demo prompt:** `"What's our total payroll spend this month?"`

---

### 7. Vendor Comparison / Negotiation Prep

> *"We're renegotiating our AWS contract. What have we spent with them over the past year?"*

**The scenario:** CFO is prepping for a vendor call and needs historical spend data to negotiate from a position of knowledge.

**Questions they ask:**
- "Total spend with [vendor] last 12 months?"
- "How has our [vendor] spend trended quarter over quarter?"
- "What percentage of our engineering budget goes to [vendor]?"
- "Compare [vendor A] vs [vendor B] spend"

**Data sources:** AP ledger, vendor master, budget allocations

**Privacy concern:** MEDIUM — vendor names aren't PII but contract terms and spend patterns are competitively sensitive.

**Demo prompt:** `"How much did we spend on AWS this month?"`

---

### 8. Offline Financial Review (Airplane Mode)

> *"I'm on a 5-hour flight. I want to review our expense categories and spot any issues."*

**The scenario:** No internet. CFO wants to browse their financial data and ask questions. Everything must work locally.

**Questions they ask:**
- "Show me a breakdown of expenses by category"
- "Which categories had the biggest increase this month?"
- "List all expenses over $1,000"
- "What's our top spending category?"

**Data sources:** All local SQLite data

**Privacy concern:** N/A — everything is on-device. This is the strongest privacy story.

**Demo prompt:** `"Show me all expense categories and totals"` (with airplane mode on)

---

## Where Does the Data Come From?

In a production app, data would sync from:

| Source | Data | Sync Method |
|---|---|---|
| **ERP** (NetSuite, SAP, QBO) | GL, AP, AR, journal entries | API sync → local SQLite |
| **Banking** (Plaid, Mercury, SVB) | Bank balances, transactions, wires | API sync → local SQLite |
| **HRIS** (Rippling, Gusto, ADP) | Payroll, headcount, comp data | API sync → local SQLite |
| **CRM** (Salesforce, HubSpot) | Revenue pipeline, closed-won | API sync → local SQLite |
| **Expense** (Brex, Ramp, Expensify) | Card transactions, receipts | API sync → local SQLite |

**For the hackathon demo:** We pre-seed SQLite with realistic sample data that represents a snapshot from these systems.

---

### 9. Strategic Financial Advice (Analytical Query)

> *"Should we cut marketing spend? We're 238% over budget."*

**The scenario:** CFO has seen the budget numbers and wants strategic advice — not just data, but reasoning. This requires cloud AI (Gemini) for complex analysis, but the financial data contains sensitive vendor names, client names, and employee names that shouldn't be sent raw.

**Questions they ask:**
- "Should we cut marketing spend?"
- "Compare our revenue growth vs expense growth"
- "What's the risk if we reduce legal spending?"
- "Give me a summary of our financial health"
- "Which departments should I prioritize for budget cuts?"

**Data sources:** All local data (budgets, expenses, revenue, wire approvals) — gathered and anonymized before cloud

**Privacy concern:** **HIGH architectural significance** — This is where the **Reversible Subgraph** comes in. The raw financial context contains vendor names ("Baker McKenzie"), client names ("Acme Corp"), employee names ("Sarah Chen"). These are competitively sensitive. We anonymize them before cloud processing and de-anonymize the response locally.

**Demo prompt:** `"Should we cut marketing spend?"`

**Expected flow:**
1. Classified as ANALYTICAL (not a data lookup)
2. Local context gathered from SQLite (budgets, expenses, revenue, wire approvals)
3. All entities registered in NodeMap: `Baker McKenzie → Vendor_A`, `Acme Corp → Client_A`, etc.
4. Context anonymized: `"Vendor_A: $3,200 (Legal)"` instead of `"Baker McKenzie: $3,200 (Legal)"`
5. Anonymized context + question sent to Gemini
6. Gemini responds using node names: `"Vendor_A spending is high relative to..."`
7. Response de-anonymized locally: `"Baker McKenzie spending is high relative to..."`
8. User sees full, contextualized advice with real names

---

## The Secret Sauce: Reversible Subgraph Anonymization

### The Problem with Standard Redaction

Most redaction tools (VIDIZMO, PwC Anonymizer, etc.) are **one-way**: they black out `"John Doe"` → `"[REDACTED]"`. This works for compliance but breaks AI reasoning because:
- The cloud model can't distinguish between entities
- The response is generic: "The individual should..." instead of naming specifics
- No way to re-hydrate the response with real names

### Our Approach: Node-Based Round-Trip Anonymization

cloudNein implements a **reversible subgraph** — a bidirectional mapping that lives ONLY on-device:

```
LOCAL DEVICE (NodeMap — never leaves)          CLOUD (Gemini)
─────────────────────────────────────          ──────────────
Baker McKenzie  ←→  Vendor_A                   Sees: Vendor_A
Acme Corp       ←→  Client_A                   Sees: Client_A
Sarah Chen      ←→  Employee_A                 Sees: Employee_A
123-45-6789     ←→  SSN_A                      Sees: SSN_A
```

**How it works:**

1. **Register:** When gathering local data, every named entity (vendor, client, employee, PII) gets a unique node alias: `Vendor_A`, `Client_B`, `Employee_A`, etc.

2. **Anonymize:** Before sending to cloud, ALL instances of real names are replaced with their aliases. The cloud sees structural financial relationships without knowing who the actual entities are.

3. **Reason:** Gemini analyzes the anonymized data and responds using the node aliases: *"Vendor_A has the highest legal spend at $3,200. Consider renegotiating Vendor_A's contract..."*

4. **De-Anonymize:** On-device, we swap all node aliases back to real names: *"Baker McKenzie has the highest legal spend at $3,200. Consider renegotiating Baker McKenzie's contract..."*

### Why This Is Novel

| Feature | Standard Redaction | cloudNein Subgraph |
|---|---|---|
| Direction | One-way (destroy) | Round-trip (preserve) |
| Entity distinction | All become `[REDACTED]` | Each gets unique node (`Vendor_A`, `Client_B`) |
| Cloud reasoning quality | Poor (generic) | High (structural relationships preserved) |
| Response personalization | None | Full (de-anonymized locally) |
| Mapping storage | N/A | On-device only (never transmitted) |

### Structural Insight

We're not just hiding names — we're **distilling financial relationships into a graph**. The cloud model sees:
- "Vendor_A charges $3,200/month for legal services"
- "Client_A generates $45,000/month in Enterprise revenue"
- "Employee_A requested a $47,000 wire to Vendor_B"

This preserves the **structure** that enables high-quality reasoning while protecting the **identity** of every entity.

---

## Why Privacy Matters Here

CFOs handle the most sensitive data in any company:

- **Payroll data** — individual salaries, SSNs, bank accounts
- **M&A activity** — acquisition targets, deal terms (material non-public info)
- **Cash position** — runway, burn rate (investor-sensitive)
- **Legal spend** — litigation exposure, IP filings
- **Revenue by client** — competitive intelligence

A CFO would **never** paste this into ChatGPT. But they would use an app that provably keeps sensitive data local and only sends sanitized queries to the cloud.

**cloudNein's value prop:** "Ask anything about your finances. Sensitive data never leaves your device. When cloud reasoning is needed, your data is anonymized first and de-anonymized locally."

---

## Demo Script (5-Minute Walkthrough)

| # | Action | Routing Path | What It Shows |
|---|---|---|---|
| 1 | "What is marketing budget?" | `local-tool` | FunctionGemma picks tool → local SQL → instant answer |
| 2 | "Show me pending wire approvals" | `local-tool` | FunctionGemma picks tool → wire approval queue |
| 3 | "How much did we pay Baker McKenzie?" | `local-tool` or `local-fallback` | Vendor lookup from local data |
| 4 | "Should we cut marketing spend?" | `cloud-analysis` | **Reversible subgraph**: local data anonymized → Gemini reasons → de-anonymized locally |
| 5 | "John Smith SSN 123-45-6789 approved $50K" | `privacy-redact` | PII auto-detected → node-based redaction → cloud analysis |
| 6 | Switch to "Local Data" tab | — | Shows the pre-seeded SQLite database the AI queries |
| 7 | Turn on airplane mode, ask "Expense breakdown" | `local-tool` | Works fully offline — no cloud needed |

**Narrative arc:**
1. **Simple lookup** → show FunctionGemma tool calling works (3s, on-device)
2. **Strategic question** → show cloud-analysis with reversible subgraph (anonymize → reason → de-anonymize)
3. **Sensitive data** → show PII detection + automatic redaction
4. **Transparency** → show Local Data tab, routing badges, node map in logs
5. **Offline** → prove everything works without internet

---

## Architecture: 5-Stage Routing Pipeline

```
User Input
    │
    ▼
Stage 0: PII Detection (<1ms, regex)
    │ HIGH sensitivity → privacy-redact path
    │ LOW/MEDIUM ↓
    ▼
Stage 1: Complexity Classifier (<1ms, regex)
    │ ANALYTICAL ("should we...", "compare", "trend") → cloud-analysis path
    │ DATA-LOOKUP ("what is", "show me", "how much") ↓
    ▼
Stage 2: Context Narrowing (<1ms, keyword)
    │ 7 tools → 2-3 relevant tools
    ▼
Stage 3: FunctionGemma Tool Calling (~3s, on-device)
    │ High confidence → local-tool path
    │ Low confidence → cloud-tool path (Gemini picks tool)
    │ All fail → local-fallback path
    ▼
Stage 4: Execution
    │ local-tool: SQL query against on-device SQLite
    │ cloud-tool: Gemini picks tool → SQL query against on-device SQLite
    │ cloud-analysis: anonymize → Gemini reasons → de-anonymize locally
    │ privacy-redact: node-based redaction → Gemini → de-anonymize locally
```

---

## Mapping to Hackathon Judging Criteria

| Criterion | How We Score |
|---|---|
| **Functionality** | Real SQL queries against real financial data, not mock responses. 7 tools across 4 database tables. |
| **Hybrid Routing** | 5-stage pipeline: PII detection → complexity classification → context narrowing → FunctionGemma tool calling → confidence-gated cloud fallback. Reversible subgraph for cloud anonymization. |
| **Agentic Capability** | Agent autonomously: detects PII, scores sensitivity, classifies query complexity, narrows tool context, calls FunctionGemma, estimates confidence, gathers local data, anonymizes entities, sends to cloud, de-anonymizes response. Multi-step agentic chain. |
| **Theme Alignment** | "CFO-on-the-Go" — a real person with a real problem. Local-first AI with reversible subgraph anonymization. No real entity names ever leave the device. |
