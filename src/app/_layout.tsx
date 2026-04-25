import { Stack } from "expo-router";

import { ThemeProvider } from "@/utils/theme";

export default function RootLayout() {
  return (
    <ThemeProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="lists/[id]" />
      </Stack>
    </ThemeProvider>
  );
}
