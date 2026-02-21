import {
  queryExpenses,
  getTotalSpend,
  getBudgetStatus,
  queryRevenue,
  getTotalRevenue,
  getWireApprovals,
  getVendorHistory,
} from "@/services/database/queries"
import { detectPII, redactText, scoreSensitivity } from "@/services/privacy"
import { generateCloud } from "./geminiCloud"
import type { FunctionCall, Message } from "./types"

export interface ToolExecutionResult {
  output: string
  source: "on-device" | "cloud" | "redacted-cloud"
  piiDetected?: number
  redactedPreview?: string
}

/**
 * Fuzzy-match tool names to handle FunctionGemma 270M typos
 * (e.g. "get_wire_approval" → "get_wire_approvals")
 */
const TOOL_ALIASES: Record<string, string> = {
  get_wire_approval: "get_wire_approvals",
  wire_approvals: "get_wire_approvals",
  budget_status: "get_budget_status",
  expenses: "query_expenses",
  revenue: "query_revenue",
  detect_pii_entities: "detect_pii",
  redact: "redact_and_analyze",
  cloud: "cloud_analyze",
}

function resolveToolName(name: string): string {
  return TOOL_ALIASES[name] ?? name
}

/**
 * Fix common argument mistakes from FunctionGemma 270M.
 * e.g. passing "Enterprise" as client instead of segment for query_revenue.
 */
function fixArguments(name: string, args: Record<string, unknown>): Record<string, unknown> {
  if (name === "query_revenue") {
    const client = args.client as string | undefined
    if (client && ["enterprise", "mid-market", "smb"].includes(client.toLowerCase())) {
      return { ...args, segment: client, client: undefined }
    }
  }
  return args
}

export async function executeTool(
  functionCall: FunctionCall,
): Promise<ToolExecutionResult> {
  const resolvedName = resolveToolName(functionCall.name)
  const args = fixArguments(resolvedName, functionCall.arguments)

  console.log(`[cloudNein:exec] Tool: ${functionCall.name}${resolvedName !== functionCall.name ? ` → ${resolvedName}` : ""}, Args: ${JSON.stringify(args)}`)

  switch (resolvedName) {
    case "query_expenses":
      return executeQueryExpenses(args)
    case "get_budget_status":
      return executeGetBudgetStatus(args)
    case "query_revenue":
      return executeQueryRevenue(args)
    case "get_wire_approvals":
      return executeGetWireApprovals(args)
    case "detect_pii":
      return executeDetectPII(args)
    case "redact_and_analyze":
      return executeRedactAndAnalyze(args)
    case "cloud_analyze":
      return executeCloudAnalyze(args)
    default:
      return { output: `Unknown tool: ${resolvedName}`, source: "on-device" }
  }
}

// ── Expense Queries ──────────────────────────────────────────────────────

function executeQueryExpenses(args: Record<string, unknown>): ToolExecutionResult {
  const category = args.category as string | undefined
  const vendor = args.vendor as string | undefined
  const startDate = args.start_date as string | undefined
  const endDate = args.end_date as string | undefined

  // If vendor is specified, use the richer vendor history view
  if (vendor && !category && !startDate && !endDate) {
    const history = getVendorHistory(vendor)
    if (history.expenses.length === 0) {
      return { output: `No expenses found for vendor "${vendor}".`, source: "on-device" }
    }

    const lines = history.expenses.slice(0, 10).map(
      (e) => `${e.date} | ${e.category} | $${e.amount.toFixed(2)}${e.notes ? ` | ${e.notes}` : ""}`,
    )

    const parts = [
      `Vendor: ${vendor}`,
      `Total historical spend: $${history.totalSpend.toFixed(2)}`,
      `${history.expenses.length} transaction(s) on record`,
      "",
      ...lines,
      history.expenses.length > 10 ? `... and ${history.expenses.length - 10} more` : "",
    ]

    if (history.wiresPending.length > 0) {
      parts.push("")
      parts.push(`⚠ ${history.wiresPending.length} pending wire(s):`)
      history.wiresPending.forEach((w) => {
        parts.push(`  ${w.date} | $${w.amount.toFixed(2)} | ${w.notes ?? ""}`)
      })
    }

    return { output: parts.filter(Boolean).join("\n"), source: "on-device" }
  }

  const expenses = queryExpenses({ category, vendor, startDate, endDate })
  const total = getTotalSpend(category)

  if (expenses.length === 0) {
    const filter = category || vendor || "all categories"
    return { output: `No expenses found for ${filter}.`, source: "on-device" }
  }

  const lines = expenses.slice(0, 12).map(
    (e) => `${e.date} | ${e.category} | ${e.vendor} | $${e.amount.toFixed(2)}${e.notes ? ` | ${e.notes}` : ""}`,
  )

  const dateRange = startDate || endDate
    ? ` (${startDate ?? "..."} to ${endDate ?? "now"})`
    : ""

  const summary = [
    `Found ${expenses.length} expense(s)${category ? ` in ${category}` : ""}${vendor ? ` from ${vendor}` : ""}${dateRange}.`,
    `Total: $${total.toFixed(2)}`,
    "",
    ...lines,
    expenses.length > 12 ? `... and ${expenses.length - 12} more` : "",
  ].filter(Boolean).join("\n")

  return { output: summary, source: "on-device" }
}

// ── Budget Status ────────────────────────────────────────────────────────

function executeGetBudgetStatus(args: Record<string, unknown>): ToolExecutionResult {
  const category = args.category as string | undefined
  const statuses = getBudgetStatus(category)

  if (statuses.length === 0) {
    return {
      output: category ? `No budget found for ${category}.` : "No budgets configured.",
      source: "on-device",
    }
  }

  const lines = statuses.map((s) => {
    const pct = ((s.total_spent / s.monthly_limit) * 100).toFixed(0)
    const status = s.remaining < 0 ? "🔴 OVER BUDGET" : s.remaining < s.monthly_limit * 0.2 ? "🟡 WARNING" : "🟢 OK"
    return `${s.category}: $${s.total_spent.toFixed(2)} / $${s.monthly_limit.toFixed(2)} (${pct}%) ${status} — $${Math.abs(s.remaining).toFixed(2)} ${s.remaining < 0 ? "over" : "remaining"}`
  })

  const overBudget = statuses.filter((s) => s.remaining < 0)
  const header = overBudget.length > 0
    ? `Budget Status (${overBudget.length} category(ies) over budget):`
    : "Budget Status (all within limits):"

  return {
    output: [header, ...lines].join("\n"),
    source: "on-device",
  }
}

// ── Revenue Queries ──────────────────────────────────────────────────────

function executeQueryRevenue(args: Record<string, unknown>): ToolExecutionResult {
  const client = args.client as string | undefined
  const segment = args.segment as string | undefined
  const startDate = args.start_date as string | undefined
  const endDate = args.end_date as string | undefined

  const records = queryRevenue({ client, segment, startDate, endDate })
  const total = getTotalRevenue({ client, segment, startDate, endDate })

  if (records.length === 0) {
    const filter = client || segment || "all clients"
    return { output: `No revenue records found for ${filter}.`, source: "on-device" }
  }

  const lines = records.slice(0, 12).map(
    (r) => `${r.date} | ${r.client} | ${r.segment} | $${r.amount.toFixed(2)} (${r.type})${r.notes ? ` | ${r.notes}` : ""}`,
  )

  const dateRange = startDate || endDate
    ? ` (${startDate ?? "..."} to ${endDate ?? "now"})`
    : ""

  const summary = [
    `Found ${records.length} revenue record(s)${client ? ` from ${client}` : ""}${segment ? ` in ${segment}` : ""}${dateRange}.`,
    `Total revenue: $${total.toFixed(2)}`,
    "",
    ...lines,
    records.length > 12 ? `... and ${records.length - 12} more` : "",
  ].filter(Boolean).join("\n")

  return { output: summary, source: "on-device" }
}

// ── Wire Approvals ───────────────────────────────────────────────────────

function executeGetWireApprovals(args: Record<string, unknown>): ToolExecutionResult {
  const status = args.status as string | undefined
  const vendor = args.vendor as string | undefined

  // If vendor specified, show vendor-specific wire + history context
  if (vendor) {
    const history = getVendorHistory(vendor)
    const wires = getWireApprovals(status)
    const vendorWires = wires.filter((w) =>
      w.vendor.toLowerCase().includes(vendor.toLowerCase()),
    )

    if (vendorWires.length === 0) {
      return { output: `No wire approvals found for vendor "${vendor}".`, source: "on-device" }
    }

    const wireLines = vendorWires.map(
      (w) => `${w.date} | $${w.amount.toFixed(2)} | ${w.status.toUpperCase()} | ${w.requested_by} | ${w.notes ?? ""}`,
    )

    const parts = [
      `Wire approvals for ${vendor}:`,
      ...wireLines,
      "",
      `Historical context: $${history.totalSpend.toFixed(2)} total spend across ${history.expenses.length} transaction(s)`,
    ]

    return { output: parts.join("\n"), source: "on-device" }
  }

  const wires = getWireApprovals(status)

  if (wires.length === 0) {
    return {
      output: status ? `No ${status} wire approvals.` : "No wire approvals found.",
      source: "on-device",
    }
  }

  const lines = wires.map(
    (w) => `${w.date} | ${w.vendor} | $${w.amount.toFixed(2)} | ${w.status.toUpperCase()} | ${w.requested_by}${w.notes ? ` | ${w.notes}` : ""}`,
  )

  const pendingTotal = wires
    .filter((w) => w.status === "pending")
    .reduce((sum, w) => sum + w.amount, 0)

  const header = status === "pending"
    ? `${wires.length} pending wire approval(s) — Total: $${pendingTotal.toFixed(2)}`
    : `${wires.length} wire approval(s):`

  return {
    output: [header, "", ...lines].join("\n"),
    source: "on-device",
  }
}

// ── PII Detection ────────────────────────────────────────────────────────

function executeDetectPII(args: Record<string, unknown>): ToolExecutionResult {
  const text = (args.text as string) ?? ""
  const entities = detectPII(text)

  if (entities.length === 0) {
    return {
      output: "No PII detected in the provided text.",
      source: "on-device",
      piiDetected: 0,
    }
  }

  const lines = entities.map(
    (e) => `[${e.type}] "${e.value}" at position ${e.start}-${e.end}`,
  )

  return {
    output: [`Detected ${entities.length} PII entity(ies):`, ...lines].join("\n"),
    source: "on-device",
    piiDetected: entities.length,
  }
}

// ── Redact & Analyze (Cloud with PII protection) ────────────────────────

async function executeRedactAndAnalyze(args: Record<string, unknown>): Promise<ToolExecutionResult> {
  const text = (args.text as string) ?? ""
  const question = (args.question as string) ?? "Analyze this data."

  const entities = detectPII(text)
  const { redactedText } = redactText(text, entities)

  const prompt = `You are a financial compliance assistant. The following data has been redacted for privacy (PII replaced with placeholders). Analyze it and answer the question.\n\nRedacted data:\n${redactedText}\n\nQuestion: ${question}`

  try {
    const messages: Message[] = [{ role: "user", content: prompt }]
    const cloud = await generateCloud(messages, [])
    const cloudResponse = cloud.response || "Cloud analysis complete. The redacted data was sent securely."

    return {
      output: cloudResponse,
      source: "redacted-cloud",
      piiDetected: entities.length,
      redactedPreview: redactedText.slice(0, 200),
    }
  } catch (error) {
    return {
      output: `Cloud analysis failed: ${error instanceof Error ? error.message : "Unknown error"}. ${entities.length} PII entities were redacted locally.`,
      source: "on-device",
      piiDetected: entities.length,
      redactedPreview: redactedText.slice(0, 200),
    }
  }
}

// ── Cloud Analyze (no PII) ───────────────────────────────────────────────

async function executeCloudAnalyze(args: Record<string, unknown>): Promise<ToolExecutionResult> {
  const question = (args.question as string) ?? ""

  const entities = detectPII(question)
  const sensitivity = scoreSensitivity(question, entities)

  if (sensitivity === "HIGH") {
    return {
      output: "⚠ This question contains sensitive data. Blocked from cloud. Use redact_and_analyze instead.",
      source: "on-device",
      piiDetected: entities.length,
    }
  }

  try {
    const messages: Message[] = [{ role: "user", content: `You are a financial advisor. ${question}` }]
    const cloud = await generateCloud(messages, [])
    const cloudResponse = cloud.response || "Cloud analysis complete."

    return {
      output: cloudResponse,
      source: "cloud",
      piiDetected: entities.length,
    }
  } catch (error) {
    return {
      output: `Cloud analysis failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      source: "on-device",
    }
  }
}
