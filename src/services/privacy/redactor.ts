import type { PIIEntity } from "./piiDetector"

export interface RedactionResult {
  redactedText: string
  entityMap: Map<string, string>
}

export function redactText(text: string, entities: PIIEntity[]): RedactionResult {
  const entityMap = new Map<string, string>()

  // Sort entities by start position in reverse so we can replace from end to start
  // without messing up indices
  const sorted = [...entities].sort((a, b) => b.start - a.start)

  let redactedText = text
  for (const entity of sorted) {
    const placeholder = `[${entity.type}]`
    entityMap.set(placeholder, entity.value)
    redactedText =
      redactedText.slice(0, entity.start) + placeholder + redactedText.slice(entity.end)
  }

  return { redactedText, entityMap }
}

export function demaskText(text: string, entityMap: Map<string, string>): string {
  let demasked = text
  for (const [placeholder, original] of entityMap) {
    demasked = demasked.replaceAll(placeholder, original)
  }
  return demasked
}
