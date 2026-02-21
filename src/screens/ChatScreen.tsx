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

import { generateHybrid, ALL_TOOLS, initGemini } from "@/services/cactus"
import type { HybridResult, FunctionCall, Message, CactusCompletable } from "@/services/cactus"

// ── Types ──────────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string
  role: "user" | "assistant" | "system"
  text: string
  source?: "on-device" | "cloud"
  functionCalls?: FunctionCall[]
  totalTimeMs?: number
  confidence?: number
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
  const flatListRef = useRef<FlatList>(null)
  const inputRef = useRef<TextInput>(null)

  // Download model on mount
  useEffect(() => {
    if (!cactusLM.isDownloaded && !cactusLM.isDownloading) {
      cactusLM.download()
    }
  }, [])

  // Initialize Gemini — user must set their API key here
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

    try {
      const llmMessages: Message[] = [{ role: "user", content: text }]

      const result: HybridResult = await generateHybrid(
        cactusLM as CactusCompletable,
        llmMessages,
        ALL_TOOLS,
      )

      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        text: formatResult(result),
        source: result.source,
        functionCalls: result.functionCalls,
        totalTimeMs: result.totalTimeMs,
        confidence: result.confidence,
      }
      addMessage(assistantMsg)
    } catch (error) {
      addMessage({
        id: (Date.now() + 1).toString(),
        role: "system",
        text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      })
    } finally {
      setIsProcessing(false)
    }
  }, [inputText, isProcessing, cactusLM, addMessage])

  // ── Render helpers ───────────────────────────────────────────────────────

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
          <Text
            style={themed(isUser ? $userText : isSystem ? $systemText : $assistantText)}
            text={item.text}
          />
          {item.source && (
            <View style={themed($metaRow)}>
              <Text
                style={themed($metaText)}
                text={`${item.source} · ${item.totalTimeMs?.toFixed(0)}ms`}
              />
              {item.confidence !== undefined && (
                <Text
                  style={themed($metaText)}
                  text={` · conf: ${item.confidence.toFixed(2)}`}
                />
              )}
            </View>
          )}
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
    [themed],
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
        <Text preset="heading" style={themed($headerTitle)} text="Cactus Agent" />
        <Text
          style={themed($headerSubtitle)}
          text={`FunctionGemma (local) + Gemini Flash (cloud)${geminiReady ? "" : " · Gemini not configured"}`}
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
            <Text style={themed($emptyTitle)} text="Ask me anything" />
            <Text
              style={themed($emptySubtitle)}
              text="I can call tools like weather, alarms, messages, reminders, music, timers, and contacts."
            />
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
          placeholder="Type a message..."
          placeholderTextColor={theme.colors.textDim}
          editable={!isProcessing}
          onSubmitEditing={handleSend}
          returnKeyType="send"
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

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatResult(result: HybridResult): string {
  if (result.functionCalls.length === 0) {
    return result.response || "No tool calls generated."
  }
  const calls = result.functionCalls
    .map((fc) => `${fc.name}(${JSON.stringify(fc.arguments)})`)
    .join("\n")
  return `Tool calls:\n${calls}`
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
  maxWidth: "85%",
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
  fontSize: 15,
})

const $systemText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.error,
  fontSize: 13,
})

const $metaRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  marginTop: spacing.xxs,
})

const $metaText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 11,
  color: colors.textDim,
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
  alignItems: "center",
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xs,
  borderTopWidth: 1,
  borderTopColor: colors.separator,
  backgroundColor: colors.palette.neutral100,
  gap: spacing.xs,
})

const $textInput: ThemedStyle<TextStyle> = ({ colors, typography, spacing }) => ({
  flex: 1,
  height: 44,
  borderRadius: 22,
  paddingHorizontal: spacing.md,
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
  fontSize: 22,
  color: colors.text,
  marginBottom: 8,
})

const $emptySubtitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 14,
  color: colors.textDim,
  textAlign: "center",
  paddingHorizontal: 32,
})
