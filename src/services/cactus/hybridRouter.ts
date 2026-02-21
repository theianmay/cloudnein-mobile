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
    content:
      "You are a privacy-aware financial assistant. You have access to a local expense database and can detect/redact PII. Choose the most appropriate tool for the user's request.",
  }

  const result = await cactusLM.complete({
    messages: [systemMessage, ...messages],
    tools,
    options: {
      forceTools: true,
      maxTokens: 256,
      stopSequences: ["<|im_end|>", "<end_of_turn>"],
    },
    mode: "local",
  })

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
  const allValid = localResult.functionCalls.every((fc) => toolNames.has(fc.name))
  if (!allValid) {
    return 0.15
  }

  for (const fc of localResult.functionCalls) {
    const tool = tools.find((t) => t.name === fc.name)
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

  // ── Step 3: Filter tools by sensitivity ──────────────────────────────
  const availableTools = filterToolsBySensitivity(tools, sensitivityLevel)

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

  // ── Fallback: no tool selected ───────────────────────────────────────
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
