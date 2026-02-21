import { getDB } from "./index"

export interface ExpenseRow {
  [key: string]: string | number | null
  id: number
  date: string
  category: string
  vendor: string
  amount: number
  notes: string | null
}

export interface BudgetRow {
  [key: string]: string | number | null
  category: string
  monthly_limit: number
}

export interface BudgetStatusRow {
  [key: string]: string | number | null
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
  const result = db.execute<ExpenseRow>(
    `SELECT id, date, category, vendor, amount, notes FROM expenses ${where} ORDER BY date DESC`,
    params,
  )

  return result.rows._array
}

export function getTotalSpend(category?: string): number {
  const db = getDB()

  if (category) {
    const result = db.execute<{ total: number }>(
      "SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE LOWER(category) = LOWER(?)",
      [category],
    )
    return result.rows._array[0]?.total ?? 0
  }

  const result = db.execute<{ total: number }>(
    "SELECT COALESCE(SUM(amount), 0) as total FROM expenses",
  )
  return result.rows._array[0]?.total ?? 0
}

export function getBudgetStatus(category?: string): BudgetStatusRow[] {
  const db = getDB()

  if (category) {
    const result = db.execute<BudgetStatusRow>(
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
    return result.rows._array
  }

  const result = db.execute<BudgetStatusRow>(
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
  return result.rows._array
}

export function getCategories(): string[] {
  const db = getDB()
  const result = db.execute<{ category: string }>(
    "SELECT DISTINCT category FROM expenses ORDER BY category",
  )
  return result.rows._array.map((r) => r.category)
}
