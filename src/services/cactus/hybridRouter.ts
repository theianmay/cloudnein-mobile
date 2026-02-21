import type { CactusLMCompleteParams, CactusLMCompleteResult } from "cactus-react-native"

import { generateCloud } from "./geminiCloud"
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
 * Estimate query complexity to decide whether local inference is likely sufficient.
 * Returns true if the query should be handled locally.
 */
function shouldTryLocal(
  messages: Message[],
  tools: Tool[],
  config: HybridRouterConfig,
): boolean {
  const userMessage = messages.find((m) => m.role === "user")?.content ?? ""

  // If too many tools, the small model may struggle to pick the right one
  if (tools.length > config.maxToolsForLocal) {
    return false
  }

  // If the message is very long/complex, prefer cloud
  if (userMessage.length > config.maxMessageLengthForLocal) {
    return false
  }

  // Count conjunctions that suggest multi-tool requests ("and", "then", "also")
  const multiActionWords = /\b(and|then|also|plus|additionally)\b/gi
  const matches = userMessage.match(multiActionWords)
  if (matches && matches.length >= 2) {
    // Likely a multi-tool request — harder for small models
    return false
  }

  return true
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
  confidence: number
  response: string
}> {
  const systemMessage: Message = {
    role: "system",
    content: "You are a helpful assistant that can use tools.",
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
    confidence: 0, // Will be estimated below
    response: result.response,
  }
}

/**
 * Estimate confidence from the local result.
 * Uses heuristics since the React Native SDK may not expose raw confidence scores.
 */
function estimateConfidence(
  localResult: { functionCalls: FunctionCall[]; response: string },
  tools: Tool[],
): number {
  // No function calls produced — low confidence
  if (localResult.functionCalls.length === 0) {
    return 0.1
  }

  let confidence = 0.7

  // Check that all returned function names are valid tool names
  const toolNames = new Set(tools.map((t) => t.name))
  const allValid = localResult.functionCalls.every((fc) => toolNames.has(fc.name))
  if (!allValid) {
    return 0.15
  }

  // Check that required arguments are present
  for (const fc of localResult.functionCalls) {
    const tool = tools.find((t) => t.name === fc.name)
    if (!tool) continue
    const required = tool.parameters.required ?? []
    const hasAll = required.every((key) => key in fc.arguments)
    if (!hasAll) {
      confidence -= 0.3
    }
  }

  // Bonus for single clean call
  if (localResult.functionCalls.length === 1) {
    confidence += 0.15
  }

  return Math.max(0, Math.min(1, confidence))
}

/**
 * Hybrid inference: try local FunctionGemma first, fall back to Gemini cloud
 * based on confidence and complexity heuristics.
 */
export async function generateHybrid(
  cactusLM: CactusCompletable,
  messages: Message[],
  tools: Tool[],
  config: HybridRouterConfig = DEFAULT_HYBRID_CONFIG,
): Promise<HybridResult> {
  const tryLocal = shouldTryLocal(messages, tools, config)

  if (!tryLocal) {
    // Skip local entirely for complex queries
    const startTime = Date.now()
    try {
      const cloud = await generateCloud(messages, tools)
      return {
        source: "cloud",
        functionCalls: cloud.functionCalls,
        response: cloud.functionCalls.map((fc) => `${fc.name}(${JSON.stringify(fc.arguments)})`).join(", "),
        totalTimeMs: cloud.totalTimeMs,
      }
    } catch (error) {
      // Cloud failed — try local as last resort
      const local = await generateLocal(cactusLM, messages, tools)
      return {
        source: "on-device",
        functionCalls: local.functionCalls,
        response: local.response,
        totalTimeMs: local.totalTimeMs + (Date.now() - startTime),
        confidence: estimateConfidence(local, tools),
      }
    }
  }

  // Try local first
  const local = await generateLocal(cactusLM, messages, tools)
  const confidence = estimateConfidence(local, tools)

  if (confidence >= config.confidenceThreshold) {
    return {
      source: "on-device",
      functionCalls: local.functionCalls,
      response: local.response,
      totalTimeMs: local.totalTimeMs,
      confidence,
    }
  }

  // Confidence too low — fall back to cloud
  try {
    const cloud = await generateCloud(messages, tools)
    return {
      source: "cloud",
      functionCalls: cloud.functionCalls,
      response: cloud.functionCalls.map((fc) => `${fc.name}(${JSON.stringify(fc.arguments)})`).join(", "),
      totalTimeMs: local.totalTimeMs + cloud.totalTimeMs,
      localConfidence: confidence,
    }
  } catch {
    // Cloud failed — return local result anyway
    return {
      source: "on-device",
      functionCalls: local.functionCalls,
      response: local.response,
      totalTimeMs: local.totalTimeMs,
      confidence,
    }
  }
}
