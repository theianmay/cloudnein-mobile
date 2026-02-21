import type { Tool, Message, CactusLMCompleteResult } from "cactus-react-native"

export type { Tool, Message, CactusLMCompleteResult }

export interface FunctionCall {
  name: string
  arguments: Record<string, unknown>
}

export type RoutingPath =
  | "local-tool"         // FunctionGemma picked tool → local SQL execution
  | "cloud-tool"         // FunctionGemma failed → Gemini picked tool → local SQL execution
  | "cloud-analysis"     // Analytical query → local data gathered → Gemini reasoning
  | "privacy-redact"     // PII detected → redact → cloud analysis
  | "local-fallback"     // Keyword extraction fallback → local SQL execution

export interface HybridResult {
  source: "on-device" | "cloud" | "redacted-cloud"
  routingPath: RoutingPath
  routingReason: string
  functionCalls: FunctionCall[]
  response: string
  totalTimeMs: number
  confidence?: number
  localConfidence?: number
  sensitivityLevel?: "LOW" | "MEDIUM" | "HIGH"
  piiDetected?: number
  redactedPreview?: string
  toolExecutionResult?: string
  localContext?: string
}

export interface HybridRouterConfig {
  /** Confidence threshold below which we fall back to cloud */
  confidenceThreshold: number
}

export const DEFAULT_HYBRID_CONFIG: HybridRouterConfig = {
  confidenceThreshold: 0.5,
}
