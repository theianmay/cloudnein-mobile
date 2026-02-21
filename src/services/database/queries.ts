import { getDB } from "./index"

export interface ExpenseRow {
  id: number
  date: string
  category: string
  vendor: string
  amount: number
  notes: string | null
}

export interface BudgetRow {
  category: string
  monthly_limit: number
}

export interface BudgetStatusRow {
  category: string
  monthly_limit: number
  total_spent: number
  remaining: number
}

export function queryExpenses(filters?: {
  category?: string
  startDate?: string
  endDate?: string
  vendor?: string
}): ExpenseRow[] {
  const db = getDB()
  const conditions: string[] = []
  const params: (string | number)[] = []

  if (filters?.category) {
    conditions.push("LOWER(category) = LOWER(?)")
    params.push(filters.category)
  }
  if (filters?.startDate) {
    conditions.push("date >= ?")
    params.push(filters.startDate)
  }
  if (filters?.endDate) {
    conditions.push("date <= ?")
    params.push(filters.endDate)
  }
  if (filters?.vendor) {
    conditions.push("LOWER(vendor) LIKE LOWER(?)")
    params.push(`%${filters.vendor}%`)
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : ""
  return db.getAllSync<ExpenseRow>(
    `SELECT id, date, category, vendor, amount, notes FROM expenses ${where} ORDER BY date DESC`,
    params,
  )
}

export function getTotalSpend(category?: string): number {
  const db = getDB()

  if (category) {
    const result = db.getFirstSync<{ total: number }>(
      "SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE LOWER(category) = LOWER(?)",
      [category],
    )
    return result?.total ?? 0
  }

  const result = db.getFirstSync<{ total: number }>(
    "SELECT COALESCE(SUM(amount), 0) as total FROM expenses",
  )
  return result?.total ?? 0
}

export function getBudgetStatus(category?: string): BudgetStatusRow[] {
  const db = getDB()

  if (category) {
    return db.getAllSync<BudgetStatusRow>(
      `SELECT
        b.category,
        b.monthly_limit,
        COALESCE(SUM(e.amount), 0) as total_spent,
        b.monthly_limit - COALESCE(SUM(e.amount), 0) as remaining
      FROM budgets b
      LEFT JOIN expenses e ON LOWER(b.category) = LOWER(e.category)
      WHERE LOWER(b.category) = LOWER(?)
      GROUP BY b.category, b.monthly_limit`,
      [category],
    )
  }

  return db.getAllSync<BudgetStatusRow>(
    `SELECT
      b.category,
      b.monthly_limit,
      COALESCE(SUM(e.amount), 0) as total_spent,
      b.monthly_limit - COALESCE(SUM(e.amount), 0) as remaining
    FROM budgets b
    LEFT JOIN expenses e ON LOWER(b.category) = LOWER(e.category)
    GROUP BY b.category, b.monthly_limit
    ORDER BY remaining ASC`,
  )
}

export function getCategories(): string[] {
  const db = getDB()
  const rows = db.getAllSync<{ category: string }>(
    "SELECT DISTINCT category FROM expenses ORDER BY category",
  )
  return rows.map((r) => r.category)
}

// ── Revenue Queries ──────────────────────────────────────────────────────

export interface RevenueRow {
  id: number
  date: string
  client: string
  segment: string
  amount: number
  type: string
  notes: string | null
}

export function queryRevenue(filters?: {
  client?: string
  segment?: string
  startDate?: string
  endDate?: string
}): RevenueRow[] {
  const db = getDB()
  const conditions: string[] = []
  const params: (string | number)[] = []

  if (filters?.client) {
    conditions.push("LOWER(client) LIKE LOWER(?)")
    params.push(`%${filters.client}%`)
  }
  if (filters?.segment) {
    conditions.push("LOWER(segment) = LOWER(?)")
    params.push(filters.segment)
  }
  if (filters?.startDate) {
    conditions.push("date >= ?")
    params.push(filters.startDate)
  }
  if (filters?.endDate) {
    conditions.push("date <= ?")
    params.push(filters.endDate)
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : ""
  return db.getAllSync<RevenueRow>(
    `SELECT id, date, client, segment, amount, type, notes FROM revenue ${where} ORDER BY date DESC`,
    params,
  )
}

export function getTotalRevenue(filters?: {
  client?: string
  segment?: string
  startDate?: string
  endDate?: string
}): number {
  const db = getDB()
  const conditions: string[] = []
  const params: (string | number)[] = []

  if (filters?.client) {
    conditions.push("LOWER(client) LIKE LOWER(?)")
    params.push(`%${filters.client}%`)
  }
  if (filters?.segment) {
    conditions.push("LOWER(segment) = LOWER(?)")
    params.push(filters.segment)
  }
  if (filters?.startDate) {
    conditions.push("date >= ?")
    params.push(filters.startDate)
  }
  if (filters?.endDate) {
    conditions.push("date <= ?")
    params.push(filters.endDate)
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : ""
  const result = db.getFirstSync<{ total: number }>(
    `SELECT COALESCE(SUM(amount), 0) as total FROM revenue ${where}`,
    params,
  )
  return result?.total ?? 0
}

// ── Wire Approval Queries ────────────────────────────────────────────────

export interface WireApprovalRow {
  id: number
  date: string
  vendor: string
  amount: number
  requested_by: string
  status: string
  notes: string | null
}

export function getWireApprovals(status?: string): WireApprovalRow[] {
  const db = getDB()
  if (status) {
    return db.getAllSync<WireApprovalRow>(
      "SELECT * FROM wire_approvals WHERE LOWER(status) = LOWER(?) ORDER BY date DESC",
      [status],
    )
  }
  return db.getAllSync<WireApprovalRow>(
    "SELECT * FROM wire_approvals ORDER BY date DESC",
  )
}

export function getVendorHistory(vendor: string): { expenses: ExpenseRow[]; totalSpend: number; wiresPending: WireApprovalRow[] } {
  const db = getDB()
  const expenses = db.getAllSync<ExpenseRow>(
    "SELECT id, date, category, vendor, amount, notes FROM expenses WHERE LOWER(vendor) LIKE LOWER(?) ORDER BY date DESC",
    [`%${vendor}%`],
  )
  const totalResult = db.getFirstSync<{ total: number }>(
    "SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE LOWER(vendor) LIKE LOWER(?)",
    [`%${vendor}%`],
  )
  const wiresPending = db.getAllSync<WireApprovalRow>(
    "SELECT * FROM wire_approvals WHERE LOWER(vendor) LIKE LOWER(?) AND status = 'pending' ORDER BY date DESC",
    [`%${vendor}%`],
  )
  return {
    expenses,
    totalSpend: totalResult?.total ?? 0,
    wiresPending,
  }
}
