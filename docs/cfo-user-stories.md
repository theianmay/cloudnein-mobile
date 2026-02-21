# Sovereign Ledger — CFO-on-the-Go User Stories

> The core insight: A CFO's phone is their command center between meetings. Today they fire off emails and wait hours for answers. Sovereign Ledger gives them instant, private answers from their own financial data — no waiting, no data leaks.

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

## Why Privacy Matters Here

CFOs handle the most sensitive data in any company:

- **Payroll data** — individual salaries, SSNs, bank accounts
- **M&A activity** — acquisition targets, deal terms (material non-public info)
- **Cash position** — runway, burn rate (investor-sensitive)
- **Legal spend** — litigation exposure, IP filings
- **Revenue by client** — competitive intelligence

A CFO would **never** paste this into ChatGPT. But they would use an app that provably keeps sensitive data local and only sends sanitized queries to the cloud.

**Sovereign Ledger's value prop:** "Ask anything about your finances. Sensitive data never leaves your device raw."

---

## Demo Script (5-Minute Walkthrough)

| # | Action | What It Shows | Expected Badge |
|---|---|---|---|
| 1 | "What was my total spend in February?" | Basic local query, instant answer | 🟢 Local · LOW |
| 2 | "Am I over budget on marketing?" | Budget comparison with analysis | 🟢 Local · LOW |
| 3 | "Show me all legal expenses" | Category drill-down | 🟢 Local · LOW |
| 4 | "How much did we pay Baker McKenzie?" | Vendor-specific lookup | 🟢 Local · MEDIUM |
| 5 | "John Smith SSN 123-45-6789 approved $50K" | PII auto-detected, redacted before cloud | 🟠 Redacted→Cloud · HIGH · 2 PII |
| 6 | Turn on airplane mode, ask "Expense breakdown by category" | Works fully offline | 🟢 Local · LOW |
| 7 | Show the redacted preview | Proves SSN was replaced with [SSN_1] | Transparency panel |

**Narrative arc:** Start simple → show intelligence → introduce sensitive data → show privacy protection → prove offline works → end with transparency.

---

## Mapping to Hackathon Judging Criteria

| Criterion | How We Score |
|---|---|
| **Functionality** | Real SQL queries against real financial data, not mock responses |
| **Hybrid Routing** | Local FunctionGemma for tool selection + Gemini cloud for complex analysis, with privacy-aware routing |
| **Agentic Capability** | Agent autonomously detects PII, scores sensitivity, chooses tools, executes queries, and decides routing |
| **Theme Alignment** | "CFO-on-the-Go" — a real person with a real problem, solved by local-first AI |
