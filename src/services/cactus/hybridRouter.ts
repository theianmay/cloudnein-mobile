import type { CactusLMCompleteParams, CactusLMCompleteResult } from "cactus-react-native"

import {
  detectPII,
  scoreSensitivity,
  redactText,
  deAnonymize,
  anonymizeWithMap,
  createNodeMap,
  registerEntity,
} from "@/services/privacy"
import type { SensitivityLevel, NodeMap } from "@/services/privacy"
import {
  queryExpenses,
  getBudgetStatus,
  queryRevenue,
  getWireApprovals,
  getTotalSpend,
  getTotalRevenue,
} from "@/services/database/queries"

import { generateCloud } from "./geminiCloud"
import { executeTool } from "./toolExecutor"
import type {
  Tool,
  Message,
  FunctionCall,
  HybridResult,
  HybridRouterConfig,
  RoutingPath,
} from "./types"
import { DEFAULT_HYBRID_CONFIG } from "./types"

/**
 * A minimal interface for anything that can run cactus completions.
 * Works with both the CactusLM class and the useCactusLM hook.
 */
export interface CactusCompletable {
  complete(params: CactusLMCompleteParams): Promise<CactusLMCompleteResult>
}

// ── Stage 0: Query Complexity Classifier ────────────────────────────────

type QueryType = "data-lookup" | "analytical"

function classifyQuery(msg: string): { type: QueryType; reason: string } {
  const lower = msg.toLowerCase()

  // Analytical patterns: questions that need reasoning, not just data
  if (/should\s+(we|i)|recommend|advice|suggest|optimize|strategy/.test(lower)) {
    return { type: "analytical", reason: "advisory/strategic question" }
  }
  if (/why\s+(is|are|did|do|was)|explain|reason|cause/.test(lower)) {
    return { type: "analytical", reason: "causal reasoning question" }
  }
  if (/compare|versus|vs\.?|better|worse|difference/.test(lower)) {
    return { type: "analytical", reason: "comparison question" }
  }
  if (/trend|forecast|predict|project|next\s+(month|quarter|year)/.test(lower)) {
    return { type: "analytical", reason: "trend/forecast question" }
  }
  if (/cut|reduce|increase|grow|improve|risk|opportunity/.test(lower)) {
    return { type: "analytical", reason: "action/optimization question" }
  }
  if (/summary|summarize|overview|report|insight/.test(lower)) {
    return { type: "analytical", reason: "summary/insight request" }
  }

  return { type: "data-lookup", reason: "data retrieval question" }
}

// ── Stage 1: Context Narrowing (pre-router) ─────────────────────────────

function narrowTools(userMessage: string, tools: Tool[]): Tool[] {
  const msg = userMessage.toLowerCase()
  const toolMap = new Map(tools.map((t) => [t.name, t]))

  const pick = (names: string[]): Tool[] =>
    names.map((n) => toolMap.get(n)).filter((t): t is Tool => t !== undefined)

  if (/budget|over\s?budget|under\s?budget|remaining|limit/.test(msg)) {
    return pick(["get_budget_status", "query_expenses"])
  }
  if (/wire|approv|pending|transfer|authorize/.test(msg)) {
    return pick(["get_wire_approvals", "query_expenses"])
  }
  if (/revenue|income|sales|client|segment|arr|mrr|enterprise|mid.market|smb/.test(msg)) {
    return pick(["query_revenue", "query_expenses"])
  }
  if (/spend|expense|cost|pay|paid|vendor|total|how much/.test(msg)) {
    return pick(["query_expenses", "get_budget_status"])
  }
  if (/ssn|social security|credit card|account number|redact/.test(msg)) {
    return pick(["detect_pii", "redact_and_analyze"])
  }

  return pick(["query_expenses", "get_budget_status", "query_revenue", "get_wire_approvals"])
}

// ── Stage 2: FunctionGemma On-Device Tool Calling ───────────────────────

async function generateLocal(
  cactusLM: CactusCompletable,
  messages: Message[],
  tools: Tool[],
): Promise<{
  functionCalls: FunctionCall[]
  totalTimeMs: number
  response: string
}> {
  const systemMessage: Message = {
    role: "system",
    content: "You are a helpful assistant that can use tools.",
  }

  console.log(`[cloudNein:local] Sending ${tools.length} tools: [${tools.map((t) => t.name).join(", ")}]`)

  const result = await cactusLM.complete({
    messages: [systemMessage, ...messages],
    tools,
    options: {
      forceTools: true,
      maxTokens: 128,
      stopSequences: ["<|im_end|>", "<end_of_turn>"],
    },
    mode: "local",
  })

  console.log(`[cloudNein:local] Raw response: ${result.response.slice(0, 200)}`)
  console.log(`[cloudNein:local] Function calls: ${JSON.stringify(result.functionCalls)}`)
  console.log(`[cloudNein:local] Time: ${result.totalTimeMs}ms, Tokens: ${result.totalTokens}, TPS: ${result.tokensPerSecond?.toFixed(1)}`)

  const functionCalls: FunctionCall[] = (result.functionCalls ?? []).map((fc) => ({
    name: fc.name,
    arguments: fc.arguments as Record<string, unknown>,
  }))

  return {
    functionCalls,
    totalTimeMs: result.totalTimeMs,
    response: result.response,
  }
}

// ── Fuzzy Tool Name Matching ────────────────────────────────────────────

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

// ── Confidence Estimation ───────────────────────────────────────────────

function estimateConfidence(
  localResult: { functionCalls: FunctionCall[]; response: string },
  tools: Tool[],
): number {
  if (localResult.functionCalls.length === 0) return 0.1

  let confidence = 0.7
  const toolNames = new Set(tools.map((t) => t.name))

  const allValid = localResult.functionCalls.every((fc) => {
    const resolved = TOOL_ALIASES[fc.name] ?? fc.name
    return toolNames.has(fc.name) || toolNames.has(resolved)
  })
  if (!allValid) return 0.15

  for (const fc of localResult.functionCalls) {
    const resolved = TOOL_ALIASES[fc.name] ?? fc.name
    const tool = tools.find((t) => t.name === fc.name || t.name === resolved)
    if (!tool) continue
    const required = tool.parameters.required ?? []
    if (!required.every((key) => key in fc.arguments)) confidence -= 0.3
  }

  if (localResult.functionCalls.length === 1) confidence += 0.15
  return Math.max(0, Math.min(1, confidence))
}

// ── Keyword Fallback (when FunctionGemma produces no tool call) ─────────

function fallbackToolCall(userMessage: string, tools: Tool[]): FunctionCall | null {
  const msg = userMessage.toLowerCase()
  const toolNames = new Set(tools.map((t) => t.name))

  const payMatch = msg.match(/(?:pay|paid|spend|spent)\s+(?:on\s+|to\s+|with\s+|for\s+)?(.+?)(?:\?|$|\.|last|this)/)
  if (payMatch && toolNames.has("query_expenses")) {
    const vendor = payMatch[1].trim().replace(/[?"]/g, "")
    if (vendor.length > 1) {
      console.log(`[cloudNein:fallback] Extracted vendor "${vendor}" from pay/spend pattern`)
      return { name: "query_expenses", arguments: { vendor } }
    }
  }

  const catMatch = msg.match(/(?:show|list|get)\s+(?:me\s+)?(?:all\s+)?(\w+)\s+expense/)
  if (catMatch && toolNames.has("query_expenses")) {
    const category = catMatch[1].charAt(0).toUpperCase() + catMatch[1].slice(1)
    console.log(`[cloudNein:fallback] Extracted category "${category}" from expense pattern`)
    return { name: "query_expenses", arguments: { category } }
  }

  const revMatch = msg.match(/(?:revenue|income|sales|arr|mrr)\s+(?:from|for|of|with)\s+(.+?)(?:\?|$|\.|last|this)/)
  if (revMatch && toolNames.has("query_revenue")) {
    const client = revMatch[1].trim().replace(/[?"]/g, "")
    if (client.length > 1) {
      console.log(`[cloudNein:fallback] Extracted client "${client}" from revenue pattern`)
      return { name: "query_revenue", arguments: { client } }
    }
  }

  const revMatch2 = msg.match(/(?:how much|what)\s+(?:did\s+)?(?:we\s+)?(?:make|earn|get|receive)\s+(?:from|for|with)\s+(.+?)(?:\?|$|\.|last|this)/)
  if (revMatch2 && toolNames.has("query_revenue")) {
    const client = revMatch2[1].trim().replace(/[?"]/g, "")
    if (client.length > 1) {
      console.log(`[cloudNein:fallback] Extracted client "${client}" from earnings pattern`)
      return { name: "query_revenue", arguments: { client } }
    }
  }

  return null
}

// ── Sensitivity Filter ──────────────────────────────────────────────────

function filterToolsBySensitivity(tools: Tool[], level: SensitivityLevel): Tool[] {
  if (level === "HIGH" || level === "MEDIUM") {
    return tools.filter((t) => t.name !== "cloud_analyze")
  }
  return tools
}

// ── Local Context Gathering + Reversible Subgraph ───────────────────────
//
// For analytical queries sent to the cloud, we:
//   1. Gather local financial data (vendors, clients, employees, amounts)
//   2. Register all named entities in a NodeMap (Vendor_A, Client_B, etc.)
//   3. Anonymize the context using the NodeMap before sending to Gemini
//   4. Gemini reasons over the anonymized structural/financial relationships
//   5. De-anonymize the response locally using the NodeMap
//
// The NodeMap NEVER leaves the device. This is the "reversible subgraph."

function gatherLocalContext(userMessage: string): { context: string; nodeMap: NodeMap } {
  const msg = userMessage.toLowerCase()
  const parts: string[] = []
  const nodeMap = createNodeMap()
  const counters = new Map<string, number>()

  try {
    // Always include budget status
    const budgets = getBudgetStatus()
    if (budgets.length > 0) {
      const budgetLines = budgets.map((s) => {
        const pct = ((s.total_spent / s.monthly_limit) * 100).toFixed(0)
        return `${s.category}: $${s.total_spent.toFixed(0)} / $${s.monthly_limit.toFixed(0)} (${pct}%)`
      })
      parts.push(`BUDGET STATUS:\n${budgetLines.join("\n")}`)
    }

    // Include expense data + register vendors
    const totalSpend = getTotalSpend()
    parts.push(`TOTAL EXPENSES (all time): $${totalSpend.toFixed(0)}`)

    const expenses = queryExpenses()
    const vendors = new Set(expenses.map((e) => e.vendor))
    for (const vendor of vendors) {
      registerEntity(nodeMap, vendor, "VENDOR", counters)
    }

    if (/marketing|spend|expense|cost|cut|reduce|burn/.test(msg)) {
      const topExpenses = expenses.slice(0, 10).map(
        (e) => `${e.date}: ${e.vendor} — $${e.amount.toFixed(0)} (${e.category})`,
      )
      parts.push(`RECENT EXPENSES:\n${topExpenses.join("\n")}`)
    }

    // Include revenue + register clients
    const totalRev = getTotalRevenue()
    parts.push(`TOTAL REVENUE (all time): $${totalRev.toFixed(0)}`)

    const recentRev = queryRevenue({})
    if (recentRev.length > 0) {
      for (const r of recentRev) {
        registerEntity(nodeMap, r.client, "CLIENT", counters)
      }
      const topClients = recentRev.slice(0, 5).map(
        (r) => `${r.client} (${r.segment}): $${r.amount.toFixed(0)} - ${r.type}`,
      )
      parts.push(`RECENT REVENUE:\n${topClients.join("\n")}`)
    }

    // Include wire approvals + register requesters
    const allWires = getWireApprovals()
    if (allWires.length > 0) {
      for (const w of allWires) {
        registerEntity(nodeMap, w.vendor, "VENDOR", counters)
        registerEntity(nodeMap, w.requested_by, "EMPLOYEE", counters)
      }
      const pending = allWires.filter((w) => w.status === "pending")
      if (pending.length > 0) {
        const pendingLines = pending.map(
          (w) => `${w.vendor}: $${w.amount.toFixed(0)} — requested by ${w.requested_by}`,
        )
        const pendingTotal = pending.reduce((s, w) => s + w.amount, 0)
        parts.push(`PENDING WIRE APPROVALS (${pending.length}, totaling $${pendingTotal.toFixed(0)}):\n${pendingLines.join("\n")}`)
      }
    }
  } catch (e) {
    console.warn("[cloudNein:context] Error gathering local context:", e)
  }

  const context = parts.join("\n\n")
  console.log(`[cloudNein:subgraph] NodeMap: ${nodeMap.toNode.size} entities registered`)
  for (const [real, node] of nodeMap.toNode) {
    console.log(`[cloudNein:subgraph]   ${node} = "${real}"`)
  }

  return { context, nodeMap }
}

// ══════════════════════════════════════════════════════════════════════════
// MAIN PIPELINE: generateHybrid
//
// 5-stage pipeline:
//   Stage 0: PII detection + sensitivity scoring (instant, always)
//   Stage 1: Complexity classification (data-lookup vs analytical)
//   Stage 2: Context narrowing (keyword pre-router, narrows 7→2-3 tools)
//   Stage 3: FunctionGemma tool calling (on-device, ~3s)
//   Stage 4: Execution (local SQL) or Cloud reasoning (Gemini)
//
// Routing paths:
//   privacy-redact   → PII found → redact → cloud analysis
//   cloud-analysis   → Analytical question → gather local data → Gemini reasons
//   local-tool       → FunctionGemma picks tool → execute locally
//   cloud-tool       → FunctionGemma fails → Gemini picks tool → execute locally
//   local-fallback   → All models fail → keyword extraction → execute locally
// ══════════════════════════════════════════════════════════════════════════

export async function generateHybrid(
  cactusLM: CactusCompletable,
  messages: Message[],
  tools: Tool[],
  config: HybridRouterConfig = DEFAULT_HYBRID_CONFIG,
): Promise<HybridResult> {
  const startTime = Date.now()
  const userMessage = messages.find((m) => m.role === "user")?.content ?? ""

  // ── Stage 0: PII Detection (always, instant, <1ms) ───────────────────
  const piiEntities = detectPII(userMessage)
  const sensitivityLevel = scoreSensitivity(userMessage, piiEntities)
  console.log(`[cloudNein:pipeline] Stage 0 — PII: ${piiEntities.length}, Sensitivity: ${sensitivityLevel}`)

  // ── Privacy path: HIGH sensitivity → force redaction ──────────────────
  if (sensitivityLevel === "HIGH") {
    console.log(`[cloudNein:pipeline] → PRIVACY-REDACT path (${piiEntities.length} PII entities)`)
    const { redactedText } = redactText(userMessage, piiEntities)
    const forceCall: FunctionCall = {
      name: "redact_and_analyze",
      arguments: { text: userMessage, question: userMessage },
    }
    const execResult = await executeTool(forceCall)

    return {
      source: "redacted-cloud",
      routingPath: "privacy-redact",
      routingReason: `${piiEntities.length} PII entities detected → auto-redacted before cloud`,
      functionCalls: [forceCall],
      response: execResult.output,
      totalTimeMs: Date.now() - startTime,
      sensitivityLevel,
      piiDetected: piiEntities.length,
      redactedPreview: redactedText.slice(0, 200),
      toolExecutionResult: execResult.output,
    }
  }

  // ── Stage 1: Complexity Classification ────────────────────────────────
  const classification = classifyQuery(userMessage)
  console.log(`[cloudNein:pipeline] Stage 1 — Type: ${classification.type}, Reason: ${classification.reason}`)

  // ── Analytical path: gather local data → anonymize → Gemini → de-anonymize
  if (classification.type === "analytical") {
    console.log(`[cloudNein:pipeline] → CLOUD-ANALYSIS path (reversible subgraph)`)

    // Step A: Gather local financial data + build NodeMap of all entities
    const { context: rawContext, nodeMap } = gatherLocalContext(userMessage)

    // Step B: Also redact any PII in the user's question into the same NodeMap
    const { redactedText: anonymizedQuestion } = redactText(userMessage, piiEntities, nodeMap)

    // Step C: Anonymize the entire context using the NodeMap
    const anonymizedContext = anonymizeWithMap(rawContext, nodeMap)

    console.log(`[cloudNein:subgraph] Raw context (${rawContext.length} chars)`)
    console.log(`[cloudNein:subgraph] Anonymized context (${anonymizedContext.length} chars): ${anonymizedContext.slice(0, 200)}...`)
    console.log(`[cloudNein:subgraph] Anonymized question: "${anonymizedQuestion}"`)

    // Step D: Send anonymized data to Gemini — no real names leave the device
    const prompt = `You are a CFO's financial advisor. Answer the question using ONLY the financial data provided below. Be specific with numbers. Use the entity names exactly as given (e.g. Vendor_A, Client_B).\n\n=== COMPANY FINANCIAL DATA ===\n${anonymizedContext}\n\n=== QUESTION ===\n${anonymizedQuestion}`

    try {
      const cloud = await generateCloud(
        [{ role: "user", content: prompt }],
        [],
      )

      // Step E: De-anonymize the cloud response locally — swap nodes back to real names
      const rawCloudResponse = cloud.response || "Cloud analysis complete."
      const deAnonymizedResponse = deAnonymize(rawCloudResponse, nodeMap)

      console.log(`[cloudNein:subgraph] Cloud response (anonymized): ${rawCloudResponse.slice(0, 200)}...`)
      console.log(`[cloudNein:subgraph] De-anonymized response: ${deAnonymizedResponse.slice(0, 200)}...`)

      return {
        source: "cloud",
        routingPath: "cloud-analysis",
        routingReason: `${classification.reason} → ${nodeMap.toNode.size} entities anonymized → Gemini reasoning → de-anonymized locally`,
        functionCalls: [],
        response: deAnonymizedResponse,
        totalTimeMs: Date.now() - startTime,
        sensitivityLevel,
        piiDetected: piiEntities.length,
        toolExecutionResult: deAnonymizedResponse,
        localContext: anonymizedContext.slice(0, 300),
      }
    } catch (error) {
      console.warn(`[cloudNein:pipeline] Cloud analysis failed, falling through to tool path:`, error)
      // Fall through to tool-calling path if cloud fails
    }
  }

  // ── Stage 2: Context Narrowing (keyword pre-router) ───────────────────
  const sensitivityFiltered = filterToolsBySensitivity(tools, sensitivityLevel)
  const availableTools = narrowTools(userMessage, sensitivityFiltered)
  console.log(`[cloudNein:pipeline] Stage 2 — Narrowed to ${availableTools.length} tools: [${availableTools.map((t) => t.name).join(", ")}]`)

  // ── Stage 3: FunctionGemma Tool Calling (on-device, ~3s) ──────────────
  console.log(`[cloudNein:pipeline] Stage 3 — FunctionGemma tool calling...`)
  const local = await generateLocal(cactusLM, messages, availableTools)
  const confidence = estimateConfidence(local, availableTools)
  console.log(`[cloudNein:pipeline] FunctionGemma confidence: ${confidence.toFixed(2)}`)

  // ── Stage 4a: High confidence → execute locally ───────────────────────
  if (confidence >= config.confidenceThreshold && local.functionCalls.length > 0) {
    console.log(`[cloudNein:pipeline] → LOCAL-TOOL path (confidence ${confidence.toFixed(2)} ≥ ${config.confidenceThreshold})`)
    const execResult = await executeTool(local.functionCalls[0])
    return {
      source: "on-device",
      routingPath: "local-tool",
      routingReason: `FunctionGemma selected ${local.functionCalls[0].name} (confidence ${confidence.toFixed(2)})`,
      functionCalls: local.functionCalls,
      response: execResult.output,
      totalTimeMs: Date.now() - startTime,
      confidence,
      sensitivityLevel,
      piiDetected: piiEntities.length,
      redactedPreview: execResult.redactedPreview,
      toolExecutionResult: execResult.output,
    }
  }

  // ── Stage 4b: Low confidence → Gemini picks tool → execute locally ────
  if (confidence < config.confidenceThreshold) {
    console.log(`[cloudNein:pipeline] → CLOUD-TOOL path (confidence ${confidence.toFixed(2)} < ${config.confidenceThreshold})`)
    try {
      const cloud = await generateCloud(messages, availableTools)
      if (cloud.functionCalls.length > 0) {
        const execResult = await executeTool(cloud.functionCalls[0])
        return {
          source: "on-device",
          routingPath: "cloud-tool",
          routingReason: `FunctionGemma uncertain (${confidence.toFixed(2)}) → Gemini selected ${cloud.functionCalls[0].name}`,
          functionCalls: cloud.functionCalls,
          response: execResult.output,
          totalTimeMs: Date.now() - startTime,
          localConfidence: confidence,
          sensitivityLevel,
          piiDetected: piiEntities.length,
          toolExecutionResult: execResult.output,
        }
      }
    } catch {
      console.warn(`[cloudNein:pipeline] Cloud tool selection failed, trying fallback`)
    }
  }

  // ── Stage 4c: All models failed → keyword extraction fallback ─────────
  const fallback = fallbackToolCall(userMessage, availableTools)
  if (fallback) {
    console.log(`[cloudNein:pipeline] → LOCAL-FALLBACK path: ${fallback.name}(${JSON.stringify(fallback.arguments)})`)
    const execResult = await executeTool(fallback)
    return {
      source: "on-device",
      routingPath: "local-fallback",
      routingReason: `Models failed → keyword extraction: ${fallback.name}`,
      functionCalls: [fallback],
      response: execResult.output,
      totalTimeMs: Date.now() - startTime,
      confidence: 0.6,
      sensitivityLevel,
      piiDetected: piiEntities.length,
      redactedPreview: execResult.redactedPreview,
      toolExecutionResult: execResult.output,
    }
  }

  // ── Final: nothing worked ─────────────────────────────────────────────
  return {
    source: "on-device",
    routingPath: "local-fallback",
    routingReason: "No tool matched — try rephrasing",
    functionCalls: [],
    response: local.response || "I couldn't determine which tool to use. Try rephrasing your question.",
    totalTimeMs: Date.now() - startTime,
    confidence,
    sensitivityLevel,
    piiDetected: piiEntities.length,
  }
}
