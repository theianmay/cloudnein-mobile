import type { Tool } from "./types"

export const TOOL_QUERY_EXPENSES: Tool = {
  name: "query_expenses",
  description:
    "Query expense records from the local financial database. Use this for questions about spending, costs, totals, transactions, purchases, or payments. Can filter by category, date range, or vendor name.",
  parameters: {
    type: "object",
    properties: {
      category: {
        type: "string",
        description:
          "Expense category to filter by (e.g. Engineering, Marketing, Payroll, Legal, Office, Travel, Meals, Software, Insurance)",
      },
      vendor: {
        type: "string",
        description: "Vendor or company name to search for",
      },
    },
    required: [],
  },
}

export const TOOL_GET_BUDGET_STATUS: Tool = {
  name: "get_budget_status",
  description:
    "Get budget status showing budget limit versus actual spending for a category or all categories. Use this for questions about budget, overspending, remaining balance, or whether we are over or under budget.",
  parameters: {
    type: "object",
    properties: {
      category: {
        type: "string",
        description:
          "Budget category to check (e.g. Engineering, Marketing, Payroll, Legal). Leave empty for all categories.",
      },
    },
    required: [],
  },
}

export const TOOL_DETECT_PII: Tool = {
  name: "detect_pii",
  description:
    "Detect personally identifiable information (PII) in text. Use when the user pastes or references text that may contain sensitive personal or financial data like names, SSNs, account numbers, emails, phone numbers, or credit card numbers.",
  parameters: {
    type: "object",
    properties: {
      text: {
        type: "string",
        description: "The text to scan for PII",
      },
    },
    required: ["text"],
  },
}

export const TOOL_REDACT_AND_ANALYZE: Tool = {
  name: "redact_and_analyze",
  description:
    "Redact sensitive information from text and send the sanitized version to cloud AI for deep analysis, market comparison, trend analysis, or strategic advice. Use when the question requires complex reasoning AND the text contains sensitive data that must be protected.",
  parameters: {
    type: "object",
    properties: {
      text: {
        type: "string",
        description: "The text containing sensitive data to redact before cloud analysis",
      },
      question: {
        type: "string",
        description: "The analytical question to ask the cloud AI about the redacted data",
      },
    },
    required: ["text", "question"],
  },
}

export const TOOL_CLOUD_ANALYZE: Tool = {
  name: "cloud_analyze",
  description:
    "Send a question to cloud AI for complex analysis, comparisons, trend analysis, market insights, or strategic advice. Only use when the question requires deep reasoning and the text does NOT contain sensitive personal or financial information.",
  parameters: {
    type: "object",
    properties: {
      question: {
        type: "string",
        description: "The analytical question to send to cloud AI",
      },
    },
    required: ["question"],
  },
}

export const ALL_TOOLS: Tool[] = [
  TOOL_QUERY_EXPENSES,
  TOOL_GET_BUDGET_STATUS,
  TOOL_DETECT_PII,
  TOOL_REDACT_AND_ANALYZE,
  TOOL_CLOUD_ANALYZE,
]
