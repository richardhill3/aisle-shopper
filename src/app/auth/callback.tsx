import { handleAuthRedirect } from "@/utils/auth";
import { useTheme } from "@/utils/theme";
import * as WebBrowser from "expo-web-browser";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Platform, ScrollView, StyleSheet, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function AuthCallbackScreen() {
  const { colors, globalStyles } = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const styles = createStyles(colors);
  const [message, setMessage] = useState("Finishing sign-in...");

  const callbackUrl = useMemo(() => buildCallbackUrl(params), [params]);

  useEffect(() => {
    let active = true;

    async function finishSignIn() {
      try {
        if (Platform.OS === "web" && !callbackUrl) {
          WebBrowser.maybeCompleteAuthSession();
        } else if (callbackUrl) {
          await handleAuthRedirect(callbackUrl);
        }

        if (active) {
          router.replace("/settings");
        }
      } catch (error) {
        if (active) {
          setMessage(getErrorMessage(error));
        }
      }
    }

    void finishSignIn();

    return () => {
      active = false;
    };
  }, [callbackUrl]);

  return (
    <ScrollView
      contentContainerStyle={[
        globalStyles.screenContent,
        {
          paddingBottom: insets.bottom + 40,
          paddingTop: insets.top + 20,
        },
      ]}
      contentInsetAdjustmentBehavior="automatic"
      style={globalStyles.container}
    >
      <Text style={globalStyles.title}>Sign in</Text>
      <Text selectable style={styles.message}>
        {message}
      </Text>
    </ScrollView>
  );
}

function buildCallbackUrl(params: Record<string, string | string[]>) {
  const query = new URLSearchParams();
  let hash = "";

  for (const [key, value] of Object.entries(params)) {
    const firstValue = Array.isArray(value) ? value[0] : value;

    if (firstValue === undefined) {
      continue;
    }

    if (key.startsWith("#")) {
      const hashKey = key.slice(1);
      hash = hashKey
        ? `${hashKey}=${encodeURIComponent(firstValue)}`
        : firstValue;
      continue;
    }

    query.set(key, firstValue);
  }

  const queryString = query.toString();
  return `aisleshopper://auth/callback${queryString ? `?${queryString}` : ""}${
    hash ? `#${hash}` : ""
  }`;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Sign-in failed.";
}

function createStyles(colors: ReturnType<typeof useTheme>["colors"]) {
  return StyleSheet.create({
    message: {
      color: colors.textSecondary,
      fontSize: 16,
      lineHeight: 22,
    },
  });
}
