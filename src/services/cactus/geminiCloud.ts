import {
  GoogleGenerativeAI,
  type FunctionDeclarationSchemaProperty,
  SchemaType,
} from "@google/generative-ai"

import type { Tool, Message, FunctionCall } from "./types"

let geminiClient: GoogleGenerativeAI | null = null

export function initGemini(apiKey: string) {
  geminiClient = new GoogleGenerativeAI(apiKey)
}

function mapParamType(type: string): SchemaType {
  switch (type.toLowerCase()) {
    case "string":
      return SchemaType.STRING
    case "integer":
    case "number":
      return SchemaType.NUMBER
    case "boolean":
      return SchemaType.BOOLEAN
    case "array":
      return SchemaType.ARRAY
    case "object":
      return SchemaType.OBJECT
    default:
      return SchemaType.STRING
  }
}

function convertToolsToGemini(tools: Tool[]) {
  return [
    {
      functionDeclarations: tools.map((t) => ({
        name: t.name,
        description: t.description,
        parameters: {
          type: SchemaType.OBJECT,
          properties: Object.fromEntries(
            Object.entries(t.parameters.properties).map(([key, val]) => [
              key,
              {
                type: mapParamType(val.type),
                description: val.description || "",
              } as FunctionDeclarationSchemaProperty,
            ]),
          ),
          required: t.parameters.required,
        },
      })),
    },
  ]
}

export async function generateCloud(
  messages: Message[],
  tools: Tool[],
): Promise<{ functionCalls: FunctionCall[]; totalTimeMs: number; response: string }> {
  if (!geminiClient) {
    throw new Error("Gemini client not initialized. Call initGemini(apiKey) first.")
  }

  const hasTools = tools.length > 0
  const contents = messages
    .filter((m) => m.role === "user")
    .map((m) => m.content ?? "")
    .join("\n")

  // Try multiple models in case one hits quota
  const modelCandidates = ["gemini-2.5-flash", "gemini-2.5-flash-lite"]
  let lastError: unknown = null

  for (const modelName of modelCandidates) {
    const model = geminiClient.getGenerativeModel({
      model: modelName,
      ...(hasTools ? { tools: convertToolsToGemini(tools) } : {}),
    })

    try {
      const startTime = Date.now()
      const result = await model.generateContent(contents)
      const totalTimeMs = Date.now() - startTime
      console.log(`[cloudNein:gemini] Success with ${modelName} in ${totalTimeMs}ms`)
      return parseGeminiResponse(result, totalTimeMs)
    } catch (e) {
      console.warn(`[cloudNein:gemini] ${modelName} failed, trying next...`, (e as Error).message?.slice(0, 120))
      lastError = e
    }
  }

  throw lastError ?? new Error("All Gemini models failed")
}

function parseGeminiResponse(
  result: { response: { candidates?: Array<{ content?: { parts?: Array<{ functionCall?: { name: string; args?: unknown }; text?: string }> } }> } },
  totalTimeMs: number,
): { functionCalls: FunctionCall[]; totalTimeMs: number; response: string } {

  const functionCalls: FunctionCall[] = []
  let textResponse = ""
  const geminiResponse = result.response

  if (geminiResponse.candidates) {
    for (const candidate of geminiResponse.candidates) {
      if (candidate.content?.parts) {
        for (const part of candidate.content.parts) {
          if (part.functionCall) {
            functionCalls.push({
              name: part.functionCall.name,
              arguments: (part.functionCall.args as Record<string, unknown>) ?? {},
            })
          }
          if (part.text) {
            textResponse += part.text
          }
        }
      }
    }
  }

  return { functionCalls, totalTimeMs, response: textResponse }
}
