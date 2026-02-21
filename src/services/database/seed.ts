import { getDB } from "./index"

export function seedDatabase() {
  const db = getDB()

  // Check if already seeded
  const result = db.execute<{ count: number }>("SELECT COUNT(*) as count FROM expenses")
  if (result.rows._array[0]?.count && result.rows._array[0].count > 0) {
    return // Already seeded
  }

  db.executeBatch([
    // Expenses
    {
      query: `INSERT INTO expenses (date, category, vendor, amount, notes) VALUES (?, ?, ?, ?, ?)`,
      params: [
        ["2026-02-01", "Engineering", "AWS", 2400.0, "Cloud hosting - production servers"],
        ["2026-02-02", "Engineering", "GitHub", 450.0, "Enterprise plan - 15 seats"],
        ["2026-02-03", "Marketing", "Google Ads", 1500.0, "Q1 campaign - Series A launch"],
        ["2026-02-04", "Marketing", "Figma", 300.0, "Design team licenses"],
        ["2026-02-05", "Payroll", "ADP", 15000.0, "February salaries - Project Alpha team"],
        ["2026-02-06", "Payroll", "ADP", 8500.0, "February salaries - Engineering"],
        ["2026-02-07", "Legal", "Baker McKenzie", 3200.0, "Acquisition review - confidential"],
        ["2026-02-08", "Legal", "Wilson Sonsini", 1800.0, "Patent filing - ML inference engine"],
        ["2026-02-10", "Office", "WeWork", 2200.0, "February coworking space"],
        ["2026-02-10", "Office", "Amazon", 350.0, "Office supplies and equipment"],
        ["2026-02-11", "Engineering", "Vercel", 200.0, "Pro plan hosting"],
        ["2026-02-12", "Travel", "United Airlines", 680.0, "SFO to NYC - investor meeting"],
        ["2026-02-13", "Travel", "Marriott", 450.0, "NYC hotel - 2 nights"],
        ["2026-02-14", "Marketing", "Mailchimp", 250.0, "Email campaign platform"],
        ["2026-02-15", "Engineering", "Datadog", 600.0, "Monitoring and observability"],
        ["2026-02-16", "Meals", "DoorDash", 180.0, "Team lunch - sprint review"],
        ["2026-02-17", "Meals", "Uber Eats", 95.0, "Client dinner - John Smith"],
        ["2026-02-18", "Software", "Notion", 150.0, "Team workspace - annual"],
        ["2026-02-19", "Software", "Slack", 200.0, "Business+ plan"],
        ["2026-02-20", "Insurance", "Hartford", 1200.0, "D&O insurance - quarterly"],
      ],
    },

    // Budgets
    {
      query: `INSERT INTO budgets (category, monthly_limit) VALUES (?, ?)`,
      params: [
        ["Engineering", 5000.0],
        ["Marketing", 3000.0],
        ["Payroll", 25000.0],
        ["Legal", 4000.0],
        ["Office", 3000.0],
        ["Travel", 2000.0],
        ["Meals", 500.0],
        ["Software", 500.0],
        ["Insurance", 1500.0],
      ],
    },
  ])
}
