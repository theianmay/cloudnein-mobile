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
): Promise<{ functionCalls: FunctionCall[]; totalTimeMs: number }> {
  if (!geminiClient) {
    throw new Error("Gemini client not initialized. Call initGemini(apiKey) first.")
  }

  const model = geminiClient.getGenerativeModel({
    model: "gemini-2.0-flash",
    tools: convertToolsToGemini(tools),
  })

  const contents = messages
    .filter((m) => m.role === "user")
    .map((m) => m.content ?? "")
    .join("\n")

  const startTime = Date.now()
  const result = await model.generateContent(contents)
  const totalTimeMs = Date.now() - startTime

  const functionCalls: FunctionCall[] = []
  const response = result.response

  if (response.candidates) {
    for (const candidate of response.candidates) {
      if (candidate.content?.parts) {
        for (const part of candidate.content.parts) {
          if (part.functionCall) {
            functionCalls.push({
              name: part.functionCall.name,
              arguments: (part.functionCall.args as Record<string, unknown>) ?? {},
            })
          }
        }
      }
    }
  }

  return { functionCalls, totalTimeMs }
}
