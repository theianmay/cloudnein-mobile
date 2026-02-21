import type { PIIEntity } from "./piiDetector"

// ── Node Map: the local-only bidirectional mapping ──────────────────────
// This map NEVER leaves the device. It's the "secret sauce" that lets us
// send anonymized data to the cloud and re-hydrate the response locally.

export interface NodeMap {
  /** real value → node alias (e.g. "John Smith" → "Person_A") */
  toNode: Map<string, string>
  /** node alias → real value (e.g. "Person_A" → "John Smith") */
  toReal: Map<string, string>
}

export interface RedactionResult {
  redactedText: string
  nodeMap: NodeMap
  entityMap: Map<string, string> // legacy compat
}

// Counters per entity type for generating unique node names
const NODE_PREFIXES: Record<string, string> = {
  PERSON_NAME: "Person",
  SSN: "SSN",
  EMAIL: "Email",
  PHONE: "Phone",
  CREDIT_CARD: "Card",
  ACCOUNT_NUMBER: "Acct",
  VENDOR: "Vendor",
  CLIENT: "Client",
  EMPLOYEE: "Employee",
}

/**
 * Create a fresh NodeMap — call once per request.
 */
export function createNodeMap(): NodeMap {
  return {
    toNode: new Map(),
    toReal: new Map(),
  }
}

/**
 * Get or create a node alias for a real value.
 * If the same value appears twice, it gets the SAME alias (structural consistency).
 */
function getOrCreateNode(
  nodeMap: NodeMap,
  realValue: string,
  entityType: string,
  counters: Map<string, number>,
): string {
  const existing = nodeMap.toNode.get(realValue)
  if (existing) return existing

  const prefix = NODE_PREFIXES[entityType] ?? "Entity"
  const count = (counters.get(prefix) ?? 0) + 1
  counters.set(prefix, count)

  // Use letters for small counts: Person_A, Person_B, ...
  const suffix = count <= 26 ? String.fromCharCode(64 + count) : `_${count}`
  const nodeAlias = `${prefix}_${suffix}`

  nodeMap.toNode.set(realValue, nodeAlias)
  nodeMap.toReal.set(nodeAlias, realValue)

  return nodeAlias
}

/**
 * Reversible subgraph redaction.
 * Replaces PII entities with consistent node aliases (Person_A, SSN_A, etc.)
 * The nodeMap is kept locally and used to de-anonymize the cloud response.
 */
export function redactText(text: string, entities: PIIEntity[], existingMap?: NodeMap): RedactionResult {
  const nodeMap = existingMap ?? createNodeMap()
  const counters = new Map<string, number>()
  const entityMap = new Map<string, string>() // legacy compat

  // Pre-populate counters from existing map
  if (existingMap) {
    for (const alias of existingMap.toReal.keys()) {
      const parts = alias.split("_")
      const prefix = parts[0]
      const current = counters.get(prefix) ?? 0
      counters.set(prefix, Math.max(current, existingMap.toReal.size))
    }
  }

  // Sort entities by start position in reverse so replacements don't shift indices
  const sorted = [...entities].sort((a, b) => b.start - a.start)

  let redactedText = text
  for (const entity of sorted) {
    const nodeAlias = getOrCreateNode(nodeMap, entity.value, entity.type, counters)
    entityMap.set(nodeAlias, entity.value)
    redactedText =
      redactedText.slice(0, entity.start) + nodeAlias + redactedText.slice(entity.end)
  }

  return { redactedText, nodeMap, entityMap }
}

/**
 * Anonymize arbitrary text using an existing NodeMap.
 * Replaces all known real values with their node aliases.
 * Use this to scrub financial context data (vendor names, client names, etc.)
 * before sending to the cloud.
 */
export function anonymizeWithMap(text: string, nodeMap: NodeMap): string {
  let result = text
  // Sort by length descending so longer matches replace first ("Baker McKenzie" before "Baker")
  const entries = [...nodeMap.toNode.entries()].sort((a, b) => b[0].length - a[0].length)
  for (const [realValue, nodeAlias] of entries) {
    result = result.replaceAll(realValue, nodeAlias)
  }
  return result
}

/**
 * Add a financial entity (vendor, client, employee) to the node map.
 * Call this to register entities found in local database context.
 */
export function registerEntity(
  nodeMap: NodeMap,
  realValue: string,
  entityType: string,
  counters: Map<string, number>,
): string {
  return getOrCreateNode(nodeMap, realValue, entityType, counters)
}

/**
 * De-anonymize cloud response: replace all node aliases back to real values.
 * This runs ONLY on-device. The cloud never sees the real values.
 */
export function deAnonymize(text: string, nodeMap: NodeMap): string {
  let result = text
  // Sort by alias length descending for safety
  const entries = [...nodeMap.toReal.entries()].sort((a, b) => b[0].length - a[0].length)
  for (const [nodeAlias, realValue] of entries) {
    result = result.replaceAll(nodeAlias, realValue)
  }
  return result
}

/**
 * Legacy compat: demask using old entityMap format.
 */
export function demaskText(text: string, entityMap: Map<string, string>): string {
  let demasked = text
  for (const [placeholder, original] of entityMap) {
    demasked = demasked.replaceAll(placeholder, original)
  }
  return demasked
}
