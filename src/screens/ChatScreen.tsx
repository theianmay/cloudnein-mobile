import { FC, useCallback, useEffect, useRef, useState } from "react"
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  TextInput,
  TextStyle,
  View,
  ViewStyle,
} from "react-native"
import { useCactusLM } from "cactus-react-native"

import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"
import { useSafeAreaInsetsStyle } from "@/utils/useSafeAreaInsetsStyle"

import { seedDatabase } from "@/services/database/seed"
import { generateHybrid, ALL_TOOLS, initGemini } from "@/services/cactus"
import type { HybridResult, FunctionCall, Message, CactusCompletable } from "@/services/cactus"

// ── Badge colors ───────────────────────────────────────────────────────────

const SOURCE_BADGE_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  "on-device": { bg: "#16a34a", text: "#ffffff", label: "Local" },
  cloud: { bg: "#2563eb", text: "#ffffff", label: "Cloud" },
  "redacted-cloud": { bg: "#ea580c", text: "#ffffff", label: "Redacted \u2192 Cloud" },
}

// ── Types ──────────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string
  role: "user" | "assistant" | "system"
  text: string
  source?: "on-device" | "cloud" | "redacted-cloud"
  routingPath?: string
  routingReason?: string
  functionCalls?: FunctionCall[]
  totalTimeMs?: number
  confidence?: number
  sensitivityLevel?: "LOW" | "MEDIUM" | "HIGH"
  piiDetected?: number
  redactedPreview?: string
}

// ── Screen ─────────────────────────────────────────────────────────────────

export const ChatScreen: FC = function ChatScreen() {
  const { themed, theme } = useAppTheme()
  const $bottomInsets = useSafeAreaInsetsStyle(["bottom"])

  const cactusLM = useCactusLM({ model: "functiongemma-270m-it" })

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputText, setInputText] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [geminiReady, setGeminiReady] = useState(false)
  const [dbReady, setDbReady] = useState(false)
  const flatListRef = useRef<FlatList>(null)
  const inputRef = useRef<TextInput>(null)

  // Initialize database on mount
  useEffect(() => {
    try {
      seedDatabase()
      setDbReady(true)
    } catch (e) {
      console.warn("Database init failed:", e)
    }
  }, [])

  // Download model on mount
  useEffect(() => {
    if (!cactusLM.isDownloaded && !cactusLM.isDownloading) {
      cactusLM.download()
    }
  }, [])

  // Initialize Gemini
  useEffect(() => {
    const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? ""
    if (apiKey) {
      initGemini(apiKey)
      setGeminiReady(true)
    }
  }, [])

  const addMessage = useCallback((msg: ChatMessage) => {
    setMessages((prev) => [...prev, msg])
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100)
  }, [])

  const handleSend = useCallback(async () => {
    const text = inputText.trim()
    if (!text || isProcessing) return

    setInputText("")
    setIsProcessing(true)

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      text,
    }
    addMessage(userMsg)
    console.log(`\n[cloudNein] ──── USER INPUT ────`)
    console.log(`[cloudNein] "${text}"`)

    try {
      const llmMessages: Message[] = [{ role: "user", content: text }]

      console.log(`[cloudNein] Calling generateHybrid with ${ALL_TOOLS.length} tools...`)
      const result: HybridResult = await generateHybrid(
        cactusLM as CactusCompletable,
        llmMessages,
        ALL_TOOLS,
      )

      console.log(`[cloudNein] ──── RESULT ────`)
      console.log(`[cloudNein] Routing: ${result.routingPath} — ${result.routingReason}`)
      console.log(`[cloudNein] Source: ${result.source}`)
      console.log(`[cloudNein] Sensitivity: ${result.sensitivityLevel}`)
      console.log(`[cloudNein] PII detected: ${result.piiDetected ?? 0}`)
      console.log(`[cloudNein] Confidence: ${result.confidence ?? "N/A"}`)
      console.log(`[cloudNein] Time: ${result.totalTimeMs}ms`)
      console.log(`[cloudNein] Function calls: ${JSON.stringify(result.functionCalls)}`)
      if (result.redactedPreview) {
        console.log(`[cloudNein] Redacted preview: ${result.redactedPreview}`)
      }
      if (result.localContext) {
        console.log(`[cloudNein] Local context sent to cloud: ${result.localContext.slice(0, 200)}`)
      }
      console.log(`[cloudNein] Tool result: ${(result.toolExecutionResult || result.response || "No response.").slice(0, 500)}`)
      console.log(`[cloudNein] ────────────────`)

      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        text: result.toolExecutionResult || result.response || "No response.",
        source: result.source,
        routingPath: result.routingPath,
        routingReason: result.routingReason,
        functionCalls: result.functionCalls,
        totalTimeMs: result.totalTimeMs,
        confidence: result.confidence,
        sensitivityLevel: result.sensitivityLevel,
        piiDetected: result.piiDetected,
        redactedPreview: result.redactedPreview,
      }
      addMessage(assistantMsg)
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : "Unknown error"
      console.error(`[cloudNein] ERROR: ${errMsg}`)
      if (error instanceof Error && error.stack) {
        console.error(`[cloudNein] Stack: ${error.stack}`)
      }
      addMessage({
        id: (Date.now() + 1).toString(),
        role: "system",
        text: `Error: ${errMsg}`,
      })
    } finally {
      setIsProcessing(false)
    }
  }, [inputText, isProcessing, cactusLM, addMessage])

  // ── Render helpers ───────────────────────────────────────────────────────

  const renderSourceBadge = useCallback((source: string) => {
    const badge = SOURCE_BADGE_COLORS[source] ?? SOURCE_BADGE_COLORS["on-device"]
    return (
      <View style={[$sourceBadge, { backgroundColor: badge.bg }]}>
        <Text
          style={[$sourceBadgeText, { color: badge.text }]}
          text={badge.label}
        />
      </View>
    )
  }, [])

  const renderMessage = useCallback(
    ({ item }: { item: ChatMessage }) => {
      const isUser = item.role === "user"
      const isSystem = item.role === "system"

      return (
        <View
          style={themed(
            isUser ? $userBubble : isSystem ? $systemBubble : $assistantBubble,
          )}
        >
          {/* Source badge for assistant messages */}
          {!isUser && !isSystem && item.source && (
            <View style={$badgeRow}>
              {renderSourceBadge(item.source)}
              {item.sensitivityLevel && (
                <View
                  style={[
                    $sensitivityBadge,
                    {
                      backgroundColor:
                        item.sensitivityLevel === "HIGH"
                          ? "#dc2626"
                          : item.sensitivityLevel === "MEDIUM"
                            ? "#f59e0b"
                            : "#22c55e",
                    },
                  ]}
                >
                  <Text
                    style={$sensitivityBadgeText}
                    text={item.sensitivityLevel}
                  />
                </View>
              )}
              {(item.piiDetected ?? 0) > 0 && (
                <View style={$piiBadge}>
                  <Text
                    style={$piiBadgeText}
                    text={`${item.piiDetected} PII`}
                  />
                </View>
              )}
            </View>
          )}

          <Text
            style={themed(isUser ? $userText : isSystem ? $systemText : $assistantText)}
            text={item.text}
          />

          {/* Redacted preview */}
          {item.redactedPreview && (
            <View style={themed($redactedPreviewContainer)}>
              <Text style={themed($redactedPreviewLabel)} text="Sent to cloud (redacted):" />
              <Text style={themed($redactedPreviewText)} text={item.redactedPreview} />
            </View>
          )}

          {/* Routing reason */}
          {item.routingReason && (
            <Text
              style={themed($routingReasonText)}
              text={`⟶ ${item.routingReason}`}
            />
          )}

          {/* Metadata row */}
          {item.source && (
            <View style={themed($metaRow)}>
              <Text
                style={themed($metaText)}
                text={`${item.totalTimeMs?.toFixed(0)}ms`}
              />
              {item.confidence !== undefined && (
                <Text
                  style={themed($metaText)}
                  text={` · conf: ${item.confidence.toFixed(2)}`}
                />
              )}
              {item.routingPath && (
                <Text
                  style={themed($metaText)}
                  text={` · ${item.routingPath}`}
                />
              )}
            </View>
          )}

          {/* Tool call chips */}
          {item.functionCalls && item.functionCalls.length > 0 && (
            <View style={themed($toolCallsContainer)}>
              {item.functionCalls.map((fc, i) => (
                <View key={i} style={themed($toolCallChip)}>
                  <Text style={themed($toolCallName)} text={fc.name} />
                  <Text
                    style={themed($toolCallArgs)}
                    text={JSON.stringify(fc.arguments)}
                  />
                </View>
              ))}
            </View>
          )}
        </View>
      )
    },
    [themed, renderSourceBadge],
  )

  // ── Download state ───────────────────────────────────────────────────────

  if (cactusLM.isDownloading) {
    return (
      <Screen preset="fixed" contentContainerStyle={themed($screenCenter)}>
        <ActivityIndicator size="large" color={theme.colors.tint} />
        <Text
          style={themed($downloadText)}
          text={`Downloading FunctionGemma... ${Math.round(cactusLM.downloadProgress * 100)}%`}
        />
        <View style={themed($progressBarOuter)}>
          <View
            style={[
              themed($progressBarInner),
              { width: `${Math.round(cactusLM.downloadProgress * 100)}%` } as ViewStyle,
            ]}
          />
        </View>
      </Screen>
    )
  }

  // ── Main chat UI ─────────────────────────────────────────────────────────

  return (
    <Screen preset="fixed" contentContainerStyle={themed($screen)} safeAreaEdges={["top"]}>
      {/* Header */}
      <View style={themed($header)}>
        <Text preset="heading" style={themed($headerTitle)} text="cloudNein" />
        <Text
          style={themed($headerSubtitle)}
          text={`FunctionGemma (local) + Gemini Flash (cloud)${geminiReady ? "" : " \u00B7 Gemini not configured"}${dbReady ? "" : " \u00B7 DB loading..."}`}
        />
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={themed($messageList)}
        style={themed($messageListContainer)}
        ListEmptyComponent={
          <View style={themed($emptyState)}>
            <Text style={themed($emptyTitle)} text="cloudNein" />
            <Text
              style={themed($emptySubtitle)}
              text="Your private financial assistant. Sensitive data never leaves your device."
            />
            <View style={themed($emptyHints)}>
              <Text style={themed($emptyHint)} text={'Try: "Show me pending wire approvals"'} />
              <Text style={themed($emptyHint)} text={'Try: "Am I over budget on marketing?"'} />
              <Text style={themed($emptyHint)} text={'Try: "How much revenue from enterprise clients?"'} />
              <Text style={themed($emptyHint)} text={'Try: "How much did we pay Baker McKenzie?"'} />
              <Text style={themed($emptyHint)} text={'Try: "John Smith SSN 123-45-6789 approved $50K"'} />
            </View>
          </View>
        }
      />

      {/* Input bar */}
      <View style={[themed($inputBar), $bottomInsets]}>
        <TextInput
          ref={inputRef}
          style={themed($textInput)}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Ask about expenses, budgets, or paste sensitive text..."
          placeholderTextColor={theme.colors.textDim}
          editable={!isProcessing}
          onSubmitEditing={handleSend}
          returnKeyType="send"
          multiline
        />
        <Pressable
          style={({ pressed }) => [
            themed($sendButton),
            pressed && themed($sendButtonPressed),
            (isProcessing || !inputText.trim()) && themed($sendButtonDisabled),
          ]}
          onPress={handleSend}
          disabled={isProcessing || !inputText.trim()}
        >
          {isProcessing ? (
            <ActivityIndicator size="small" color={theme.colors.palette.neutral100} />
          ) : (
            <Text style={themed($sendButtonText)} text="Send" />
          )}
        </Pressable>
      </View>
    </Screen>
  )
}

// ── Styles ──────────────────────────────────────────────────────────────────

const $screen: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flex: 1,
  backgroundColor: colors.background,
})

const $screenCenter: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flex: 1,
  backgroundColor: colors.background,
  justifyContent: "center",
  alignItems: "center",
  paddingHorizontal: spacing.lg,
})

const $header: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  paddingHorizontal: spacing.lg,
  paddingVertical: spacing.sm,
  borderBottomWidth: 1,
  borderBottomColor: colors.separator,
  backgroundColor: colors.palette.neutral100,
})

const $headerTitle: ThemedStyle<TextStyle> = () => ({
  fontSize: 20,
})

const $headerSubtitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 12,
  color: colors.textDim,
  marginTop: 2,
})

const $messageListContainer: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
})

const $messageList: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
})

const $userBubble: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  alignSelf: "flex-end",
  backgroundColor: colors.tint,
  borderRadius: 16,
  borderBottomRightRadius: 4,
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
  marginBottom: spacing.xs,
  maxWidth: "80%",
})

const $assistantBubble: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  alignSelf: "flex-start",
  backgroundColor: colors.palette.neutral100,
  borderRadius: 16,
  borderBottomLeftRadius: 4,
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
  marginBottom: spacing.xs,
  maxWidth: "90%",
  borderWidth: 1,
  borderColor: colors.separator,
})

const $systemBubble: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  alignSelf: "center",
  backgroundColor: colors.errorBackground,
  borderRadius: 12,
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.xs,
  marginBottom: spacing.xs,
  maxWidth: "90%",
})

const $userText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.palette.neutral100,
  fontSize: 15,
})

const $assistantText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.text,
  fontSize: 14,
  lineHeight: 20,
})

const $systemText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.error,
  fontSize: 13,
})

const $badgeRow: ViewStyle = {
  flexDirection: "row",
  gap: 6,
  marginBottom: 6,
  flexWrap: "wrap",
}

const $sourceBadge: ViewStyle = {
  paddingHorizontal: 8,
  paddingVertical: 2,
  borderRadius: 10,
}

const $sourceBadgeText: TextStyle = {
  fontSize: 10,
  fontWeight: "700",
  letterSpacing: 0.5,
}

const $sensitivityBadge: ViewStyle = {
  paddingHorizontal: 6,
  paddingVertical: 2,
  borderRadius: 10,
}

const $sensitivityBadgeText: TextStyle = {
  fontSize: 9,
  fontWeight: "700",
  color: "#ffffff",
  letterSpacing: 0.5,
}

const $piiBadge: ViewStyle = {
  paddingHorizontal: 6,
  paddingVertical: 2,
  borderRadius: 10,
  backgroundColor: "#7c3aed",
}

const $piiBadgeText: TextStyle = {
  fontSize: 9,
  fontWeight: "700",
  color: "#ffffff",
  letterSpacing: 0.5,
}

const $redactedPreviewContainer: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  marginTop: spacing.xs,
  padding: spacing.xs,
  backgroundColor: colors.palette.neutral200,
  borderRadius: 8,
  borderLeftWidth: 3,
  borderLeftColor: "#ea580c",
})

const $redactedPreviewLabel: ThemedStyle<TextStyle> = () => ({
  fontSize: 10,
  fontWeight: "700",
  color: "#ea580c",
  marginBottom: 2,
})

const $redactedPreviewText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 11,
  color: colors.textDim,
  fontStyle: "italic",
})

const $metaRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  marginTop: spacing.xxs,
})

const $metaText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 11,
  color: colors.textDim,
})

const $routingReasonText: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 11,
  fontStyle: "italic",
  color: colors.textDim,
  marginTop: spacing.xxs,
})

const $toolCallsContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginTop: spacing.xs,
  gap: spacing.xxs,
})

const $toolCallChip: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.palette.neutral200,
  borderRadius: 8,
  paddingHorizontal: spacing.xs,
  paddingVertical: spacing.xxs,
})

const $toolCallName: ThemedStyle<TextStyle> = ({ colors, typography }) => ({
  fontSize: 12,
  fontFamily: typography.primary.bold,
  color: colors.tint,
})

const $toolCallArgs: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 11,
  color: colors.textDim,
})

const $inputBar: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "flex-end",
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xs,
  borderTopWidth: 1,
  borderTopColor: colors.separator,
  backgroundColor: colors.palette.neutral100,
  gap: spacing.xs,
})

const $textInput: ThemedStyle<TextStyle> = ({ colors, typography, spacing }) => ({
  flex: 1,
  minHeight: 44,
  maxHeight: 100,
  borderRadius: 22,
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
  backgroundColor: colors.palette.neutral200,
  fontFamily: typography.primary.normal,
  fontSize: 15,
  color: colors.text,
})

const $sendButton: ThemedStyle<ViewStyle> = ({ colors }) => ({
  height: 44,
  paddingHorizontal: 20,
  borderRadius: 22,
  backgroundColor: colors.tint,
  justifyContent: "center",
  alignItems: "center",
})

const $sendButtonPressed: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.palette.primary600,
})

const $sendButtonDisabled: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.tintInactive,
})

const $sendButtonText: ThemedStyle<TextStyle> = ({ colors, typography }) => ({
  color: colors.palette.neutral100,
  fontFamily: typography.primary.medium,
  fontSize: 15,
})

const $downloadText: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  marginTop: spacing.md,
  color: colors.text,
  fontSize: 16,
  textAlign: "center",
})

const $progressBarOuter: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  width: "80%",
  height: 8,
  borderRadius: 4,
  backgroundColor: colors.palette.neutral300,
  marginTop: spacing.md,
  overflow: "hidden",
})

const $progressBarInner: ThemedStyle<ViewStyle> = ({ colors }) => ({
  height: "100%",
  borderRadius: 4,
  backgroundColor: colors.tint,
})

const $emptyState: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  paddingTop: spacing.xxxl,
})

const $emptyTitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 24,
  fontWeight: "700",
  color: colors.text,
  marginBottom: 8,
})

const $emptySubtitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 14,
  color: colors.textDim,
  textAlign: "center",
  paddingHorizontal: 32,
  marginBottom: 24,
})

const $emptyHints: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  gap: spacing.xs,
  alignItems: "center",
})

const $emptyHint: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 13,
  color: colors.tint,
  fontStyle: "italic",
})
