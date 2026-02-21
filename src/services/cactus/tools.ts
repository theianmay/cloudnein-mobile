import type { Tool } from "./types"

export const TOOL_QUERY_EXPENSES: Tool = {
  name: "query_expenses",
  description: "Get expense records, spending totals, or vendor payment history",
  parameters: {
    type: "object",
    properties: {
      category: {
        type: "string",
        description: "Category: Engineering, Marketing, Payroll, Legal, Office, Travel, Meals, Software, Insurance",
      },
      vendor: {
        type: "string",
        description: "Vendor name",
      },
    },
    required: [],
  },
}

export const TOOL_GET_BUDGET_STATUS: Tool = {
  name: "get_budget_status",
  description: "Get budget vs actual spending for a category or all categories",
  parameters: {
    type: "object",
    properties: {
      category: {
        type: "string",
        description: "Budget category to check",
      },
    },
    required: [],
  },
}

export const TOOL_QUERY_REVENUE: Tool = {
  name: "query_revenue",
  description: "Get revenue records by client or segment",
  parameters: {
    type: "object",
    properties: {
      client: {
        type: "string",
        description: "Client name",
      },
      segment: {
        type: "string",
        description: "Segment: Enterprise, Mid-Market, SMB",
      },
    },
    required: [],
  },
}

export const TOOL_GET_WIRE_APPROVALS: Tool = {
  name: "get_wire_approvals",
  description: "Get pending or recent wire transfer approvals",
  parameters: {
    type: "object",
    properties: {
      status: {
        type: "string",
        description: "Status: pending, approved",
      },
      vendor: {
        type: "string",
        description: "Vendor name",
      },
    },
    required: [],
  },
}

export const TOOL_DETECT_PII: Tool = {
  name: "detect_pii",
  description: "Detect sensitive personal data like SSNs, emails, or phone numbers in text",
  parameters: {
    type: "object",
    properties: {
      text: {
        type: "string",
        description: "Text to scan",
      },
    },
    required: ["text"],
  },
}

export const TOOL_REDACT_AND_ANALYZE: Tool = {
  name: "redact_and_analyze",
  description: "Redact sensitive data from text then send to cloud AI for analysis",
  parameters: {
    type: "object",
    properties: {
      text: {
        type: "string",
        description: "Text with sensitive data to redact",
      },
      question: {
        type: "string",
        description: "Question for cloud AI",
      },
    },
    required: ["text", "question"],
  },
}

export const TOOL_CLOUD_ANALYZE: Tool = {
  name: "cloud_analyze",
  description: "Send a question to cloud AI for complex analysis or advice",
  parameters: {
    type: "object",
    properties: {
      question: {
        type: "string",
        description: "Question for cloud AI",
      },
    },
    required: ["question"],
  },
}

export const ALL_TOOLS: Tool[] = [
  TOOL_QUERY_EXPENSES,
  TOOL_GET_BUDGET_STATUS,
  TOOL_QUERY_REVENUE,
  TOOL_GET_WIRE_APPROVALS,
  TOOL_DETECT_PII,
  TOOL_REDACT_AND_ANALYZE,
  TOOL_CLOUD_ANALYZE,
]
