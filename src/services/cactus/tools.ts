import type { Tool } from "./types"

export const TOOL_QUERY_EXPENSES: Tool = {
  name: "query_expenses",
  description:
    "Query expense records from the local financial database. Use this for questions about spending, costs, totals, transactions, purchases, payments, or vendor history. Can filter by category, date range, or vendor name. Supports historical queries like 'last quarter' or 'last month'.",
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
        description: "Vendor or company name to search for (e.g. AWS, Baker McKenzie, ADP)",
      },
      start_date: {
        type: "string",
        description: "Start date filter in YYYY-MM-DD format (e.g. 2025-10-01 for Q4 start)",
      },
      end_date: {
        type: "string",
        description: "End date filter in YYYY-MM-DD format (e.g. 2025-12-31 for Q4 end)",
      },
    },
    required: [],
  },
}

export const TOOL_GET_BUDGET_STATUS: Tool = {
  name: "get_budget_status",
  description:
    "Get budget status showing monthly budget limit versus actual spending for a category or all categories. Use this for questions about budget, overspending, remaining balance, budget approval, or whether a department is over or under budget.",
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

export const TOOL_QUERY_REVENUE: Tool = {
  name: "query_revenue",
  description:
    "Query revenue records from the local financial database. Use this for questions about revenue, income, sales, client payments, ARR, MRR, or segment performance. Can filter by client name, segment (Enterprise, Mid-Market, SMB), or date range.",
  parameters: {
    type: "object",
    properties: {
      client: {
        type: "string",
        description: "Client name to search for (e.g. Acme Corp, GlobalBank, TechFlow)",
      },
      segment: {
        type: "string",
        description: "Revenue segment to filter by (Enterprise, Mid-Market, SMB)",
      },
      start_date: {
        type: "string",
        description: "Start date filter in YYYY-MM-DD format",
      },
      end_date: {
        type: "string",
        description: "End date filter in YYYY-MM-DD format",
      },
    },
    required: [],
  },
}

export const TOOL_GET_WIRE_APPROVALS: Tool = {
  name: "get_wire_approvals",
  description:
    "Get pending or recent wire transfer approval requests. Use this for questions about wire approvals, pending payments, outgoing transfers, or payment authorization queue. A CFO typically reviews and approves these.",
  parameters: {
    type: "object",
    properties: {
      status: {
        type: "string",
        description: "Filter by approval status: 'pending', 'approved', or leave empty for all",
      },
      vendor: {
        type: "string",
        description: "Filter by vendor name to see wire history for a specific vendor",
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
    "Redact sensitive information from text and send the sanitized version to cloud AI for deep analysis, compliance review, or strategic advice. Use when the question requires complex reasoning AND the text contains sensitive data that must be protected before cloud processing.",
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
    "Send a question to cloud AI (Gemini) for complex analysis, comparisons, trend analysis, market insights, benchmarking, or strategic financial advice. Only use when the question requires deep reasoning and does NOT contain sensitive personal or financial information like SSNs, salaries, or account numbers.",
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
  TOOL_QUERY_REVENUE,
  TOOL_GET_WIRE_APPROVALS,
  TOOL_DETECT_PII,
  TOOL_REDACT_AND_ANALYZE,
  TOOL_CLOUD_ANALYZE,
]
