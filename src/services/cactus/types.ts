import type { Tool, Message, CactusLMCompleteResult } from "cactus-react-native"

export type { Tool, Message, CactusLMCompleteResult }

export interface FunctionCall {
  name: string
  arguments: Record<string, unknown>
}

export interface HybridResult {
  source: "on-device" | "cloud" | "redacted-cloud"
  functionCalls: FunctionCall[]
  response: string
  totalTimeMs: number
  confidence?: number
  localConfidence?: number
  sensitivityLevel?: "LOW" | "MEDIUM" | "HIGH"
  piiDetected?: number
  redactedPreview?: string
  toolExecutionResult?: string
}

export interface HybridRouterConfig {
  /** Confidence threshold below which we fall back to cloud */
  confidenceThreshold: number
}

export const DEFAULT_HYBRID_CONFIG: HybridRouterConfig = {
  confidenceThreshold: 0.5,
}
