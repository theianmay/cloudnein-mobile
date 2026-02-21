import { queryExpenses, getTotalSpend, getBudgetStatus } from "@/services/database/queries"
import { detectPII, redactText, scoreSensitivity } from "@/services/privacy"
import { generateCloud } from "./geminiCloud"
import type { FunctionCall, Message } from "./types"

export interface ToolExecutionResult {
  output: string
  source: "on-device" | "cloud" | "redacted-cloud"
  piiDetected?: number
  redactedPreview?: string
}

export async function executeTool(
  functionCall: FunctionCall,
): Promise<ToolExecutionResult> {
  const { name, arguments: args } = functionCall

  switch (name) {
    case "query_expenses":
      return executeQueryExpenses(args)
    case "get_budget_status":
      return executeGetBudgetStatus(args)
    case "detect_pii":
      return executeDetectPII(args)
    case "redact_and_analyze":
      return executeRedactAndAnalyze(args)
    case "cloud_analyze":
      return executeCloudAnalyze(args)
    default:
      return { output: `Unknown tool: ${name}`, source: "on-device" }
  }
}

function executeQueryExpenses(args: Record<string, unknown>): ToolExecutionResult {
  const category = args.category as string | undefined
  const vendor = args.vendor as string | undefined

  const expenses = queryExpenses({ category, vendor })
  const total = getTotalSpend(category)

  if (expenses.length === 0) {
    const filter = category || vendor || "all categories"
    return {
      output: `No expenses found for ${filter}.`,
      source: "on-device",
    }
  }

  const lines = expenses.slice(0, 10).map(
    (e) => `${e.date} | ${e.category} | ${e.vendor} | $${e.amount.toFixed(2)}${e.notes ? ` | ${e.notes}` : ""}`,
  )

  const summary = [
    `Found ${expenses.length} expense(s)${category ? ` in ${category}` : ""}${vendor ? ` from ${vendor}` : ""}.`,
    `Total: $${total.toFixed(2)}`,
    "",
    ...lines,
    expenses.length > 10 ? `... and ${expenses.length - 10} more` : "",
  ].join("\n")

  return { output: summary, source: "on-device" }
}

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
    const status = s.remaining < 0 ? "OVER BUDGET" : s.remaining < s.monthly_limit * 0.2 ? "WARNING" : "OK"
    return `${s.category}: $${s.total_spent.toFixed(2)} / $${s.monthly_limit.toFixed(2)} (${pct}%) [${status}] — $${s.remaining.toFixed(2)} remaining`
  })

  return {
    output: ["Budget Status:", ...lines].join("\n"),
    source: "on-device",
  }
}

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

async function executeRedactAndAnalyze(args: Record<string, unknown>): Promise<ToolExecutionResult> {
  const text = (args.text as string) ?? ""
  const question = (args.question as string) ?? "Analyze this data."

  // Step 1: Detect PII
  const entities = detectPII(text)

  // Step 2: Redact
  const { redactedText } = redactText(text, entities)

  // Step 3: Send redacted text + question to Gemini
  const prompt = `The following data has been redacted for privacy. Analyze it and answer the question.\n\nRedacted data:\n${redactedText}\n\nQuestion: ${question}`

  try {
    const messages: Message[] = [{ role: "user", content: prompt }]
    const cloud = await generateCloud(messages, [])
    const cloudResponse = cloud.functionCalls.length > 0
      ? cloud.functionCalls.map((fc) => `${fc.name}(${JSON.stringify(fc.arguments)})`).join(", ")
      : "Cloud analysis complete. The redacted data was sent securely."

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

async function executeCloudAnalyze(args: Record<string, unknown>): Promise<ToolExecutionResult> {
  const question = (args.question as string) ?? ""

  // Safety check: run PII detection on the question itself
  const entities = detectPII(question)
  const sensitivity = scoreSensitivity(question, entities)

  if (sensitivity === "HIGH") {
    return {
      output: "This question contains sensitive data. Use redact_and_analyze instead to protect PII before sending to cloud.",
      source: "on-device",
      piiDetected: entities.length,
    }
  }

  try {
    const messages: Message[] = [{ role: "user", content: question }]
    const cloud = await generateCloud(messages, [])
    const cloudResponse = cloud.functionCalls.length > 0
      ? cloud.functionCalls.map((fc) => `${fc.name}(${JSON.stringify(fc.arguments)})`).join(", ")
      : "Cloud analysis complete."

    return {
      output: cloudResponse,
      source: "cloud",
      piiDetected: entities.length,
    }
  } catch (error) {
    return {
      output: `Cloud analysis failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      source: "cloud",
    }
  }
}
