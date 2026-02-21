import type { PIIEntity } from "./piiDetector"

export type SensitivityLevel = "LOW" | "MEDIUM" | "HIGH"

const HIGH_SENSITIVITY_TYPES = new Set(["SSN", "CREDIT_CARD", "ACCOUNT_NUMBER"])
const FINANCIAL_KEYWORDS = /\b(salary|payroll|ssn|social security|bank|account|routing|confidential|secret|acquisition|compensation)\b/gi

export function scoreSensitivity(
  text: string,
  piiEntities: PIIEntity[],
): SensitivityLevel {
  // Any high-sensitivity PII type → HIGH
  if (piiEntities.some((e) => HIGH_SENSITIVITY_TYPES.has(e.type))) {
    return "HIGH"
  }

  // 3+ PII entities of any type → HIGH
  if (piiEntities.length >= 3) {
    return "HIGH"
  }

  // Financial keywords in text → at least MEDIUM
  const financialMatches = text.match(FINANCIAL_KEYWORDS)
  if (financialMatches && financialMatches.length >= 2) {
    return "HIGH"
  }

  // Any PII present → MEDIUM
  if (piiEntities.length > 0) {
    return "MEDIUM"
  }

  // Financial keyword present but no PII → MEDIUM
  if (financialMatches && financialMatches.length > 0) {
    return "MEDIUM"
  }

  return "LOW"
}
