export interface PIIEntity {
  type: PIIType
  value: string
  start: number
  end: number
}

export type PIIType =
  | "SSN"
  | "EMAIL"
  | "PHONE"
  | "CREDIT_CARD"
  | "PERSON_NAME"
  | "ACCOUNT_NUMBER"

const PII_PATTERNS: { type: PIIType; pattern: RegExp }[] = [
  { type: "SSN", pattern: /\b\d{3}-\d{2}-\d{4}\b/g },
  { type: "EMAIL", pattern: /\b[\w.+-]+@[\w.-]+\.\w{2,}\b/g },
  { type: "PHONE", pattern: /\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g },
  { type: "CREDIT_CARD", pattern: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g },
  { type: "ACCOUNT_NUMBER", pattern: /\b(?:acct?\.?|account)\s*#?\s*\d{6,12}\b/gi },
]

// Common first names for basic name detection
const COMMON_NAMES = new Set([
  "james", "john", "robert", "michael", "david", "william", "richard", "joseph",
  "thomas", "charles", "mary", "patricia", "jennifer", "linda", "elizabeth",
  "barbara", "susan", "jessica", "sarah", "karen", "alice", "bob", "tom",
  "jake", "emma", "lisa", "dave", "smith", "johnson", "williams", "brown",
  "jones", "garcia", "miller", "davis", "rodriguez", "martinez",
])

export function detectPII(text: string): PIIEntity[] {
  const entities: PIIEntity[] = []

  // Regex-based detection
  for (const { type, pattern } of PII_PATTERNS) {
    // Reset lastIndex for global patterns
    pattern.lastIndex = 0
    let match: RegExpExecArray | null
    while ((match = pattern.exec(text)) !== null) {
      entities.push({
        type,
        value: match[0],
        start: match.index,
        end: match.index + match[0].length,
      })
    }
  }

  // Simple name detection: look for capitalized words that match common names
  const namePattern = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/g
  let nameMatch: RegExpExecArray | null
  while ((nameMatch = namePattern.exec(text)) !== null) {
    const parts = nameMatch[1].toLowerCase().split(/\s+/)
    if (parts.some((p) => COMMON_NAMES.has(p))) {
      entities.push({
        type: "PERSON_NAME",
        value: nameMatch[1],
        start: nameMatch.index,
        end: nameMatch.index + nameMatch[1].length,
      })
    }
  }

  // Deduplicate overlapping entities (prefer longer matches)
  return deduplicateEntities(entities)
}

function deduplicateEntities(entities: PIIEntity[]): PIIEntity[] {
  if (entities.length <= 1) return entities

  // Sort by start position, then by length (longer first)
  const sorted = [...entities].sort((a, b) => {
    if (a.start !== b.start) return a.start - b.start
    return (b.end - b.start) - (a.end - a.start)
  })

  const result: PIIEntity[] = [sorted[0]]
  for (let i = 1; i < sorted.length; i++) {
    const prev = result[result.length - 1]
    const curr = sorted[i]
    // Skip if current entity overlaps with previous
    if (curr.start < prev.end) continue
    result.push(curr)
  }

  return result
}
