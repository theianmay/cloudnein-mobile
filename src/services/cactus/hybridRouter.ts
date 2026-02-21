import type { CactusLMCompleteParams, CactusLMCompleteResult } from "cactus-react-native"

import { detectPII, scoreSensitivity, redactText } from "@/services/privacy"
import type { SensitivityLevel } from "@/services/privacy"

import { generateCloud } from "./geminiCloud"
import { executeTool } from "./toolExecutor"
import type {
  Tool,
  Message,
  FunctionCall,
  HybridResult,
  HybridRouterConfig,
} from "./types"
import { DEFAULT_HYBRID_CONFIG } from "./types"

/**
 * A minimal interface for anything that can run cactus completions.
 * Works with both the CactusLM class and the useCactusLM hook.
 */
export interface CactusCompletable {
  complete(params: CactusLMCompleteParams): Promise<CactusLMCompleteResult>
}

/**
 * Keyword-based pre-router: narrows 7 tools down to 2-3 relevant ones
 * so FunctionGemma 270M doesn't get overwhelmed.
 */
function preRouteTools(userMessage: string, tools: Tool[]): Tool[] {
  const msg = userMessage.toLowerCase()
  const toolMap = new Map(tools.map((t) => [t.name, t]))

  const pick = (names: string[]): Tool[] =>
    names.map((n) => toolMap.get(n)).filter((t): t is Tool => t !== undefined)

  // Budget keywords
  if (/budget|over\s?budget|under\s?budget|remaining|limit/.test(msg)) {
    return pick(["get_budget_status", "query_expenses"])
  }

  // Wire / approval keywords
  if (/wire|approv|pending|transfer|authorize/.test(msg)) {
    return pick(["get_wire_approvals", "query_expenses"])
  }

  // Revenue keywords
  if (/revenue|income|sales|client|segment|arr|mrr|enterprise|mid.market|smb/.test(msg)) {
    return pick(["query_revenue", "query_expenses"])
  }

  // Expense / spend / vendor / pay keywords
  if (/spend|expense|cost|pay|paid|vendor|total|how much/.test(msg)) {
    return pick(["query_expenses", "get_budget_status"])
  }

  // PII / sensitive data keywords (handled by sensitivity router, but just in case)
  if (/ssn|social security|credit card|account number|redact/.test(msg)) {
    return pick(["detect_pii", "redact_and_analyze"])
  }

  // Cloud / analyze / advice keywords
  if (/analyze|advice|compare|trend|benchmark|strategy/.test(msg)) {
    return pick(["cloud_analyze", "query_expenses"])
  }

  // Default: give the 4 most common local tools
  return pick(["query_expenses", "get_budget_status", "query_revenue", "get_wire_approvals"])
}

/**
 * Run tool calling on-device via FunctionGemma + Cactus.
 */
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

/**
 * Resolve fuzzy tool names for confidence checking too.
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

/**
 * Estimate confidence from the local result.
 */
function estimateConfidence(
  localResult: { functionCalls: FunctionCall[]; response: string },
  tools: Tool[],
): number {
  if (localResult.functionCalls.length === 0) {
    return 0.1
  }

  let confidence = 0.7

  const toolNames = new Set(tools.map((t) => t.name))
  const allValid = localResult.functionCalls.every((fc) => {
    const resolved = TOOL_ALIASES[fc.name] ?? fc.name
    return toolNames.has(fc.name) || toolNames.has(resolved)
  })
  if (!allValid) {
    return 0.15
  }

  for (const fc of localResult.functionCalls) {
    const resolved = TOOL_ALIASES[fc.name] ?? fc.name
    const tool = tools.find((t) => t.name === fc.name || t.name === resolved)
    if (!tool) continue
    const required = tool.parameters.required ?? []
    const hasAll = required.every((key) => key in fc.arguments)
    if (!hasAll) {
      confidence -= 0.3
    }
  }

  if (localResult.functionCalls.length === 1) {
    confidence += 0.15
  }

  return Math.max(0, Math.min(1, confidence))
}

/**
 * Keyword-based fallback: when FunctionGemma fails to produce a tool call,
 * try to extract intent from the user message and call the right tool directly.
 */
function fallbackToolCall(userMessage: string, tools: Tool[]): FunctionCall | null {
  const msg = userMessage.toLowerCase()
  const toolNames = new Set(tools.map((t) => t.name))

  // "how much did we pay [vendor]" → query_expenses with vendor
  const payMatch = msg.match(/(?:pay|paid|spend|spent)\s+(?:on\s+|to\s+|with\s+|for\s+)?(.+?)(?:\?|$|\.|last|this)/)
  if (payMatch && toolNames.has("query_expenses")) {
    const vendor = payMatch[1].trim().replace(/[?"]/g, "")
    if (vendor.length > 1) {
      console.log(`[cloudNein:fallback] Extracted vendor "${vendor}" from pay/spend pattern`)
      return { name: "query_expenses", arguments: { vendor } }
    }
  }

  // "show [category] expenses" → query_expenses with category
  const catMatch = msg.match(/(?:show|list|get)\s+(?:me\s+)?(?:all\s+)?(\w+)\s+expense/)
  if (catMatch && toolNames.has("query_expenses")) {
    const category = catMatch[1].charAt(0).toUpperCase() + catMatch[1].slice(1)
    console.log(`[cloudNein:fallback] Extracted category "${category}" from expense pattern`)
    return { name: "query_expenses", arguments: { category } }
  }

  return null
}

/**
 * Filter tools based on sensitivity level.
 * HIGH: only allow redact_and_analyze (force redaction before cloud)
 * MEDIUM: block cloud_analyze, allow everything else
 * LOW: allow all tools
 */
function filterToolsBySensitivity(tools: Tool[], level: SensitivityLevel): Tool[] {
  switch (level) {
    case "HIGH":
      return tools.filter((t) => t.name !== "cloud_analyze")
    case "MEDIUM":
      return tools.filter((t) => t.name !== "cloud_analyze")
    case "LOW":
    default:
      return tools
  }
}

/**
 * Privacy-aware hybrid inference pipeline.
 *
 * 1. Always detect PII in user message first (instant, regex-based)
 * 2. Score sensitivity (rule-based)
 * 3. Route based on sensitivity:
 *    - HIGH: force redact_and_analyze (skip FunctionGemma decision)
 *    - MEDIUM: FunctionGemma picks tool, but cloud_analyze is blocked
 *    - LOW: FunctionGemma picks from all tools
 * 4. Execute the selected tool
 * 5. Return result with full transparency metadata
 */
export async function generateHybrid(
  cactusLM: CactusCompletable,
  messages: Message[],
  tools: Tool[],
  config: HybridRouterConfig = DEFAULT_HYBRID_CONFIG,
): Promise<HybridResult> {
  const startTime = Date.now()
  const userMessage = messages.find((m) => m.role === "user")?.content ?? ""

  // ── Step 1: PII Detection (always, instant) ──────────────────────────
  const piiEntities = detectPII(userMessage)
  const sensitivityLevel = scoreSensitivity(userMessage, piiEntities)

  // ── Step 2: HIGH sensitivity → force redaction pipeline ──────────────
  if (sensitivityLevel === "HIGH") {
    const { redactedText } = redactText(userMessage, piiEntities)

    const forceCall: FunctionCall = {
      name: "redact_and_analyze",
      arguments: { text: userMessage, question: userMessage },
    }

    const execResult = await executeTool(forceCall)

    return {
      source: "redacted-cloud",
      functionCalls: [forceCall],
      response: execResult.output,
      totalTimeMs: Date.now() - startTime,
      sensitivityLevel,
      piiDetected: piiEntities.length,
      redactedPreview: redactedText.slice(0, 200),
      toolExecutionResult: execResult.output,
    }
  }

  // ── Step 3: Filter tools by sensitivity, then pre-route by keywords ──
  const sensitivityFiltered = filterToolsBySensitivity(tools, sensitivityLevel)
  const availableTools = preRouteTools(userMessage, sensitivityFiltered)
  console.log(`[cloudNein:router] Sensitivity: ${sensitivityLevel}, PII: ${piiEntities.length}, Tools: [${availableTools.map((t) => t.name).join(", ")}]`)

  // ── Step 4: FunctionGemma picks a tool ───────────────────────────────
  const local = await generateLocal(cactusLM, messages, availableTools)
  const confidence = estimateConfidence(local, availableTools)

  // ── Step 5: If confidence too low, fall back to cloud ────────────────
  if (confidence < config.confidenceThreshold) {
    try {
      const cloud = await generateCloud(messages, availableTools)
      if (cloud.functionCalls.length > 0) {
        // Execute the cloud-selected tool
        const execResult = await executeTool(cloud.functionCalls[0])
        return {
          source: execResult.source === "on-device" ? "on-device" : "cloud",
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
      // Cloud failed — fall through to execute local result
    }
  }

  // ── Step 6: Execute the locally-selected tool ────────────────────────
  if (local.functionCalls.length > 0) {
    const execResult = await executeTool(local.functionCalls[0])
    return {
      source: execResult.source,
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

  // ── Fallback: keyword-based intent extraction ──────────────────────
  const fallback = fallbackToolCall(userMessage, availableTools)
  if (fallback) {
    console.log(`[cloudNein:fallback] Using keyword fallback: ${fallback.name}(${JSON.stringify(fallback.arguments)})`)
    const execResult = await executeTool(fallback)
    return {
      source: execResult.source,
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

  // ── Final fallback: no tool selected ──────────────────────────────
  return {
    source: "on-device",
    functionCalls: [],
    response: local.response || "I couldn't determine which tool to use. Try rephrasing your question.",
    totalTimeMs: Date.now() - startTime,
    confidence,
    sensitivityLevel,
    piiDetected: piiEntities.length,
  }
}
