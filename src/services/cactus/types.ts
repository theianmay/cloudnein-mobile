import type { Tool, Message, CactusLMCompleteResult } from "cactus-react-native"

export type { Tool, Message, CactusLMCompleteResult }

export interface FunctionCall {
  name: string
  arguments: Record<string, unknown>
}

export interface HybridResult {
  source: "on-device" | "cloud"
  functionCalls: FunctionCall[]
  response: string
  totalTimeMs: number
  confidence?: number
  localConfidence?: number
}

export interface HybridRouterConfig {
  /** Confidence threshold below which we fall back to cloud */
  confidenceThreshold: number
  /** Maximum number of tools before preferring cloud */
  maxToolsForLocal: number
  /** Maximum message complexity (character count) for local */
  maxMessageLengthForLocal: number
}

export const DEFAULT_HYBRID_CONFIG: HybridRouterConfig = {
  confidenceThreshold: 0.5,
  maxToolsForLocal: 3,
  maxMessageLengthForLocal: 200,
}
