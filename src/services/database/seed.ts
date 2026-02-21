import { getDB } from "./index"

export function seedDatabase() {
  const db = getDB()

  // Check if already seeded
  const result = db.getFirstSync<{ count: number }>("SELECT COUNT(*) as count FROM expenses")
  if (result && result.count > 0) {
    return // Already seeded
  }

  const iE = `INSERT INTO expenses (date, category, vendor, amount, notes) VALUES (?, ?, ?, ?, ?)`
  const iB = `INSERT INTO budgets (category, monthly_limit) VALUES (?, ?)`
  const iR = `INSERT INTO revenue (date, client, segment, amount, type, notes) VALUES (?, ?, ?, ?, ?, ?)`
  const iW = `INSERT INTO wire_approvals (date, vendor, amount, requested_by, status, notes) VALUES (?, ?, ?, ?, ?, ?)`

  db.withTransactionSync(() => {
    // ── Q4 2025 Expenses (historical context for "last quarter" queries) ──
    db.runSync(iE, ["2025-10-01", "Engineering", "AWS", 2200.0, "Cloud hosting - October"])
    db.runSync(iE, ["2025-10-15", "Legal", "Baker McKenzie", 4500.0, "M&A due diligence - Project Falcon"])
    db.runSync(iE, ["2025-10-20", "Marketing", "Google Ads", 1800.0, "Q4 brand campaign"])
    db.runSync(iE, ["2025-11-01", "Engineering", "AWS", 2350.0, "Cloud hosting - November"])
    db.runSync(iE, ["2025-11-05", "Payroll", "ADP", 23000.0, "November salaries - all teams"])
    db.runSync(iE, ["2025-11-10", "Legal", "Baker McKenzie", 3800.0, "M&A due diligence - Project Falcon"])
    db.runSync(iE, ["2025-11-15", "Travel", "Delta Airlines", 920.0, "Board meeting - NYC"])
    db.runSync(iE, ["2025-12-01", "Engineering", "AWS", 2500.0, "Cloud hosting - December"])
    db.runSync(iE, ["2025-12-05", "Payroll", "ADP", 24500.0, "December salaries + year-end bonuses"])
    db.runSync(iE, ["2025-12-10", "Legal", "Wilson Sonsini", 2800.0, "Patent filing - ML inference engine"])
    db.runSync(iE, ["2025-12-15", "Insurance", "Hartford", 1200.0, "D&O insurance - Q4"])
    db.runSync(iE, ["2025-12-20", "Marketing", "HubSpot", 1200.0, "Annual CRM license"])

    // ── January 2026 Expenses ──
    db.runSync(iE, ["2026-01-02", "Engineering", "AWS", 2600.0, "Cloud hosting - January"])
    db.runSync(iE, ["2026-01-03", "Engineering", "GitHub", 450.0, "Enterprise plan - 15 seats"])
    db.runSync(iE, ["2026-01-05", "Payroll", "ADP", 24000.0, "January salaries - all teams"])
    db.runSync(iE, ["2026-01-08", "Marketing", "Google Ads", 2100.0, "Q1 campaign launch"])
    db.runSync(iE, ["2026-01-10", "Office", "WeWork", 2200.0, "January coworking space"])
    db.runSync(iE, ["2026-01-12", "Legal", "Baker McKenzie", 5200.0, "Acquisition close - Project Falcon"])
    db.runSync(iE, ["2026-01-15", "Software", "Salesforce", 3500.0, "CRM annual renewal"])
    db.runSync(iE, ["2026-01-18", "Travel", "United Airlines", 1450.0, "CES Las Vegas - 3 team members"])
    db.runSync(iE, ["2026-01-20", "Insurance", "Hartford", 1200.0, "D&O insurance - Q1"])

    // ── February 2026 Expenses (current month) ──
    db.runSync(iE, ["2026-02-01", "Engineering", "AWS", 2800.0, "Cloud hosting - production + staging"])
    db.runSync(iE, ["2026-02-02", "Engineering", "GitHub", 450.0, "Enterprise plan - 15 seats"])
    db.runSync(iE, ["2026-02-03", "Marketing", "Google Ads", 1500.0, "Series A launch campaign"])
    db.runSync(iE, ["2026-02-04", "Marketing", "Figma", 300.0, "Design team licenses"])
    db.runSync(iE, ["2026-02-05", "Payroll", "ADP", 15000.0, "February salaries - Project Alpha team"])
    db.runSync(iE, ["2026-02-06", "Payroll", "ADP", 8500.0, "February salaries - Engineering"])
    db.runSync(iE, ["2026-02-07", "Legal", "Baker McKenzie", 3200.0, "Post-acquisition integration review"])
    db.runSync(iE, ["2026-02-08", "Legal", "Wilson Sonsini", 1800.0, "Patent filing - edge inference"])
    db.runSync(iE, ["2026-02-10", "Office", "WeWork", 2200.0, "February coworking space"])
    db.runSync(iE, ["2026-02-10", "Office", "Amazon", 350.0, "Office supplies and equipment"])
    db.runSync(iE, ["2026-02-11", "Engineering", "Vercel", 200.0, "Pro plan hosting"])
    db.runSync(iE, ["2026-02-12", "Travel", "United Airlines", 680.0, "SFO to NYC - investor meeting"])
    db.runSync(iE, ["2026-02-13", "Travel", "Marriott", 450.0, "NYC hotel - 2 nights"])
    db.runSync(iE, ["2026-02-14", "Marketing", "Mailchimp", 250.0, "Email campaign platform"])
    db.runSync(iE, ["2026-02-15", "Engineering", "Datadog", 600.0, "Monitoring and observability"])
    db.runSync(iE, ["2026-02-16", "Meals", "DoorDash", 180.0, "Team lunch - sprint review"])
    db.runSync(iE, ["2026-02-17", "Meals", "Uber Eats", 95.0, "Client dinner"])
    db.runSync(iE, ["2026-02-18", "Software", "Notion", 150.0, "Team workspace - annual"])
    db.runSync(iE, ["2026-02-19", "Software", "Slack", 200.0, "Business+ plan"])
    db.runSync(iE, ["2026-02-20", "Insurance", "Hartford", 1200.0, "D&O insurance - quarterly"])

    // ── Budgets (monthly limits) ──
    db.runSync(iB, ["Engineering", 5000.0])
    db.runSync(iB, ["Marketing", 3000.0])
    db.runSync(iB, ["Payroll", 25000.0])
    db.runSync(iB, ["Legal", 6000.0])
    db.runSync(iB, ["Office", 3000.0])
    db.runSync(iB, ["Travel", 2500.0])
    db.runSync(iB, ["Meals", 500.0])
    db.runSync(iB, ["Software", 4000.0])
    db.runSync(iB, ["Insurance", 1500.0])

    // ── Revenue (Q4 2025 + Q1 2026) ──
    db.runSync(iR, ["2025-10-01", "Acme Corp", "Enterprise", 45000.0, "recurring", "Annual contract - ML platform"])
    db.runSync(iR, ["2025-10-15", "TechFlow Inc", "Mid-Market", 12000.0, "recurring", "Monthly SaaS"])
    db.runSync(iR, ["2025-11-01", "Acme Corp", "Enterprise", 45000.0, "recurring", "Annual contract - ML platform"])
    db.runSync(iR, ["2025-11-10", "GlobalBank", "Enterprise", 85000.0, "one-time", "Custom deployment"])
    db.runSync(iR, ["2025-11-15", "TechFlow Inc", "Mid-Market", 12000.0, "recurring", "Monthly SaaS"])
    db.runSync(iR, ["2025-11-20", "StartupXYZ", "SMB", 2500.0, "recurring", "Starter plan"])
    db.runSync(iR, ["2025-12-01", "Acme Corp", "Enterprise", 45000.0, "recurring", "Annual contract - ML platform"])
    db.runSync(iR, ["2025-12-05", "MegaRetail", "Enterprise", 62000.0, "one-time", "Holiday analytics project"])
    db.runSync(iR, ["2025-12-15", "TechFlow Inc", "Mid-Market", 12000.0, "recurring", "Monthly SaaS"])
    db.runSync(iR, ["2025-12-20", "StartupXYZ", "SMB", 2500.0, "recurring", "Starter plan"])
    db.runSync(iR, ["2026-01-01", "Acme Corp", "Enterprise", 45000.0, "recurring", "Annual contract - ML platform"])
    db.runSync(iR, ["2026-01-10", "TechFlow Inc", "Mid-Market", 15000.0, "recurring", "Upgraded to Pro plan"])
    db.runSync(iR, ["2026-01-15", "NovaPharma", "Enterprise", 38000.0, "recurring", "New contract - data pipeline"])
    db.runSync(iR, ["2026-01-20", "StartupXYZ", "SMB", 2500.0, "recurring", "Starter plan"])
    db.runSync(iR, ["2026-02-01", "Acme Corp", "Enterprise", 45000.0, "recurring", "Annual contract - ML platform"])
    db.runSync(iR, ["2026-02-05", "TechFlow Inc", "Mid-Market", 15000.0, "recurring", "Pro plan"])
    db.runSync(iR, ["2026-02-10", "NovaPharma", "Enterprise", 38000.0, "recurring", "Data pipeline"])
    db.runSync(iR, ["2026-02-12", "GlobalBank", "Enterprise", 120000.0, "one-time", "Phase 2 deployment"])
    db.runSync(iR, ["2026-02-15", "StartupXYZ", "SMB", 2500.0, "recurring", "Starter plan"])

    // ── Wire Approvals (pending + recent) ──
    db.runSync(iW, ["2026-02-20", "Baker McKenzie", 47000.0, "Sarah Chen", "pending", "Final M&A advisory fee - Project Falcon"])
    db.runSync(iW, ["2026-02-19", "AWS", 28000.0, "DevOps Team", "pending", "Annual reserved instance commitment"])
    db.runSync(iW, ["2026-02-18", "ADP", 24500.0, "HR", "approved", "February payroll - all employees"])
    db.runSync(iW, ["2026-02-15", "WeWork", 6600.0, "Operations", "approved", "Q1 office lease - 3 months prepaid"])
    db.runSync(iW, ["2026-02-10", "Salesforce", 3500.0, "Sales Team", "approved", "CRM renewal"])
    db.runSync(iW, ["2026-02-08", "Wilson Sonsini", 12000.0, "Legal", "pending", "IP portfolio review + new filings"])
  })
}
