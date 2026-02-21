import { useEffect, useState } from "react"
import { SplashScreen, Tabs } from "expo-router"
import { useFonts } from "@expo-google-fonts/space-grotesk"
import { KeyboardProvider } from "react-native-keyboard-controller"
import { initialWindowMetrics, SafeAreaProvider } from "react-native-safe-area-context"
import { Text } from "react-native"

import { initI18n } from "@/i18n"
import { ThemeProvider } from "@/theme/context"
import { customFontsToLoad } from "@/theme/typography"
import { loadDateFnsLocale } from "@/utils/formatDate"

SplashScreen.preventAutoHideAsync()

if (__DEV__) {
  // Load Reactotron configuration in development. We don't want to
  // include this in our production bundle, so we are using `if (__DEV__)`
  // to only execute this in development.
  require("@/devtools/ReactotronConfig")
}

export default function Root() {
  const [fontsLoaded, fontError] = useFonts(customFontsToLoad)
  const [isI18nInitialized, setIsI18nInitialized] = useState(false)

  useEffect(() => {
    initI18n()
      .then(() => setIsI18nInitialized(true))
      .then(() => loadDateFnsLocale())
  }, [])

  const loaded = fontsLoaded && isI18nInitialized

  useEffect(() => {
    if (fontError) throw fontError
  }, [fontError])

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync()
    }
  }, [loaded])

  if (!loaded) {
    return null
  }

  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <ThemeProvider>
        <KeyboardProvider>
          <Tabs
            screenOptions={{
              headerShown: false,
              tabBarStyle: {
                backgroundColor: "#1a1a2e",
                borderTopColor: "#2a2a4a",
              },
              tabBarActiveTintColor: "#6366f1",
              tabBarInactiveTintColor: "#888",
              tabBarLabelStyle: { fontSize: 12, fontWeight: "600" },
            }}
          >
            <Tabs.Screen
              name="index"
              options={{
                title: "Chat",
                tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>{"💬"}</Text>,
              }}
            />
            <Tabs.Screen
              name="data"
              options={{
                title: "Local Data",
                tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>{"🗄️"}</Text>,
              }}
            />
          </Tabs>
        </KeyboardProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  )
}
