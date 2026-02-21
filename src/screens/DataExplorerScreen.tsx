import { FC, useCallback, useEffect, useState } from "react"
import { FlatList, Pressable, TextStyle, View, ViewStyle } from "react-native"

import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"
import { seedDatabase } from "@/services/database/seed"
import {
  queryExpenses,
  getBudgetStatus,
  queryRevenue,
  getWireApprovals,
  type ExpenseRow,
  type BudgetStatusRow,
  type RevenueRow,
  type WireApprovalRow,
} from "@/services/database/queries"

type TableName = "expenses" | "budgets" | "revenue" | "wire_approvals"

const TABLES: { key: TableName; label: string }[] = [
  { key: "expenses", label: "Expenses" },
  { key: "budgets", label: "Budgets" },
  { key: "revenue", label: "Revenue" },
  { key: "wire_approvals", label: "Wire Approvals" },
]

export const DataExplorerScreen: FC = function DataExplorerScreen() {
  const { themed } = useAppTheme()

  const [activeTable, setActiveTable] = useState<TableName>("expenses")
  const [expenses, setExpenses] = useState<ExpenseRow[]>([])
  const [budgets, setBudgets] = useState<BudgetStatusRow[]>([])
  const [revenue, setRevenue] = useState<RevenueRow[]>([])
  const [wires, setWires] = useState<WireApprovalRow[]>([])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    try {
      seedDatabase()
      setExpenses(queryExpenses())
      setBudgets(getBudgetStatus())
      setRevenue(queryRevenue())
      setWires(getWireApprovals())
      setReady(true)
    } catch (e) {
      console.warn("DataExplorer: DB init failed", e)
    }
  }, [])

  const formatCurrency = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2 })}`

  const renderExpenseItem = useCallback(
    ({ item }: { item: ExpenseRow }) => (
      <View style={themed($row)}>
        <View style={$rowHeader}>
          <Text style={themed($rowVendor)} text={item.vendor} />
          <Text style={themed($rowAmount)} text={formatCurrency(item.amount)} />
        </View>
        <View style={$rowDetail}>
          <Text style={themed($rowMeta)} text={item.date} />
          <Text style={themed($rowMeta)} text={` · ${item.category}`} />
        </View>
        {item.notes && <Text style={themed($rowNotes)} text={item.notes} />}
      </View>
    ),
    [themed],
  )

  const renderBudgetItem = useCallback(
    ({ item }: { item: BudgetStatusRow }) => {
      const pct = item.monthly_limit > 0 ? (item.total_spent / item.monthly_limit) * 100 : 0
      const over = item.total_spent > item.monthly_limit
      return (
        <View style={themed($row)}>
          <View style={$rowHeader}>
            <Text style={themed($rowVendor)} text={item.category} />
            <Text
              style={[themed($rowAmount), { color: over ? "#dc2626" : "#16a34a" }]}
              text={`${pct.toFixed(0)}%`}
            />
          </View>
          <View style={$rowDetail}>
            <Text style={themed($rowMeta)} text={`Spent: ${formatCurrency(item.total_spent)}`} />
            <Text style={themed($rowMeta)} text={` / Limit: ${formatCurrency(item.monthly_limit)}`} />
          </View>
          <View style={[$barBg, themed($barBgThemed)]}>
            <View
              style={[
                $barFill,
                {
                  width: `${Math.min(pct, 100)}%`,
                  backgroundColor: over ? "#dc2626" : pct > 80 ? "#f59e0b" : "#16a34a",
                },
              ]}
            />
          </View>
        </View>
      )
    },
    [themed],
  )

  const renderRevenueItem = useCallback(
    ({ item }: { item: RevenueRow }) => (
      <View style={themed($row)}>
        <View style={$rowHeader}>
          <Text style={themed($rowVendor)} text={item.client} />
          <Text style={themed($rowAmount)} text={formatCurrency(item.amount)} />
        </View>
        <View style={$rowDetail}>
          <Text style={themed($rowMeta)} text={item.date} />
          <Text style={themed($rowMeta)} text={` · ${item.segment}`} />
          <View style={[$typeBadge, { backgroundColor: item.type === "recurring" ? "#16a34a" : "#2563eb" }]}>
            <Text style={$typeBadgeText} text={item.type} />
          </View>
        </View>
        {item.notes && <Text style={themed($rowNotes)} text={item.notes} />}
      </View>
    ),
    [themed],
  )

  const renderWireItem = useCallback(
    ({ item }: { item: WireApprovalRow }) => (
      <View style={themed($row)}>
        <View style={$rowHeader}>
          <Text style={themed($rowVendor)} text={item.vendor} />
          <Text style={themed($rowAmount)} text={formatCurrency(item.amount)} />
        </View>
        <View style={$rowDetail}>
          <Text style={themed($rowMeta)} text={item.date} />
          <Text style={themed($rowMeta)} text={` · by ${item.requested_by}`} />
          <View
            style={[
              $typeBadge,
              { backgroundColor: item.status === "pending" ? "#f59e0b" : "#16a34a" },
            ]}
          >
            <Text style={$typeBadgeText} text={item.status} />
          </View>
        </View>
        {item.notes && <Text style={themed($rowNotes)} text={item.notes} />}
      </View>
    ),
    [themed],
  )

  const renderList = () => {
    switch (activeTable) {
      case "expenses":
        return (
          <FlatList
            data={expenses}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderExpenseItem}
            contentContainerStyle={themed($listContent)}
          />
        )
      case "budgets":
        return (
          <FlatList
            data={budgets}
            keyExtractor={(item) => item.category}
            renderItem={renderBudgetItem}
            contentContainerStyle={themed($listContent)}
          />
        )
      case "revenue":
        return (
          <FlatList
            data={revenue}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderRevenueItem}
            contentContainerStyle={themed($listContent)}
          />
        )
      case "wire_approvals":
        return (
          <FlatList
            data={wires}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderWireItem}
            contentContainerStyle={themed($listContent)}
          />
        )
    }
  }

  const counts: Record<TableName, number> = {
    expenses: expenses.length,
    budgets: budgets.length,
    revenue: revenue.length,
    wire_approvals: wires.length,
  }

  if (!ready) {
    return (
      <Screen preset="fixed" contentContainerStyle={themed($screen)} safeAreaEdges={["top"]}>
        <Text text="Loading database..." />
      </Screen>
    )
  }

  return (
    <Screen preset="fixed" contentContainerStyle={themed($screen)} safeAreaEdges={["top"]}>
      <View style={themed($header)}>
        <Text preset="heading" style={themed($headerTitle)} text="Local Data" />
        <Text
          style={themed($headerSubtitle)}
          text="On-device SQLite database — never leaves your phone"
        />
      </View>

      <View style={themed($tabBar)}>
        {TABLES.map((t) => (
          <Pressable
            key={t.key}
            style={[themed($tab), activeTable === t.key && themed($tabActive)]}
            onPress={() => setActiveTable(t.key)}
          >
            <Text
              style={[themed($tabText), activeTable === t.key && themed($tabTextActive)]}
              text={`${t.label} (${counts[t.key]})`}
            />
          </Pressable>
        ))}
      </View>

      {renderList()}
    </Screen>
  )
}

// ── Styles ──────────────────────────────────────────────────────────────────

const $screen: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flex: 1,
  backgroundColor: colors.background,
})

const $header: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.md,
  paddingTop: spacing.sm,
  paddingBottom: spacing.xs,
})

const $headerTitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.text,
})

const $headerSubtitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 13,
  color: colors.textDim,
  marginTop: 2,
})

const $tabBar: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  paddingHorizontal: spacing.sm,
  paddingBottom: spacing.xs,
  gap: spacing.xxs,
})

const $tab: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xxs,
  borderRadius: 16,
  backgroundColor: colors.palette.neutral200,
})

const $tabActive: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.tint,
})

const $tabText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 12,
  color: colors.textDim,
})

const $tabTextActive: ThemedStyle<TextStyle> = () => ({
  color: "#ffffff",
  fontWeight: "600",
})

const $listContent: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: spacing.sm,
  gap: spacing.xs,
})

const $row: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.palette.neutral100,
  borderRadius: 12,
  padding: spacing.sm,
})

const $rowHeader: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
}

const $rowDetail: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  marginTop: 4,
  flexWrap: "wrap",
}

const $rowVendor: ThemedStyle<TextStyle> = ({ colors, typography }) => ({
  fontSize: 14,
  fontFamily: typography.primary.bold,
  color: colors.text,
  flex: 1,
})

const $rowAmount: ThemedStyle<TextStyle> = ({ colors, typography }) => ({
  fontSize: 14,
  fontFamily: typography.primary.bold,
  color: colors.tint,
})

const $rowMeta: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 12,
  color: colors.textDim,
})

const $rowNotes: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 11,
  fontStyle: "italic",
  color: colors.textDim,
  marginTop: 4,
})

const $typeBadge: ViewStyle = {
  borderRadius: 8,
  paddingHorizontal: 6,
  paddingVertical: 1,
  marginLeft: 6,
}

const $typeBadgeText: TextStyle = {
  fontSize: 10,
  color: "#ffffff",
  fontWeight: "600",
}

const $barBg: ViewStyle = {
  height: 4,
  borderRadius: 2,
  marginTop: 6,
  overflow: "hidden",
}

const $barBgThemed: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.palette.neutral300,
})

const $barFill: ViewStyle = {
  height: 4,
  borderRadius: 2,
}
