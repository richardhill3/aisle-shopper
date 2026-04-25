import { useTheme } from "@/utils/theme";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function HomeHeader() {
  const { colors, globalStyles } = useTheme();
  const styles = createStyles(colors);
  const currentDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <View style={globalStyles.headerRow}>
      <Text style={globalStyles.date}>{currentDate}</Text>
      <TouchableOpacity
        accessibilityLabel="Open settings"
        accessibilityRole="button"
        onPress={() => router.push("/settings")}
        style={styles.iconButton}
      >
        <Ionicons
          name="settings-outline"
          size={17}
          color={colors.textSecondary}
        />
      </TouchableOpacity>
    </View>
  );
}

function createStyles(colors: { surface: string }) {
  return StyleSheet.create({
    iconButton: {
      alignItems: "center",
      backgroundColor: colors.surface,
      borderRadius: 8,
      height: 28,
      justifyContent: "center",
      width: 28,
    },
  });
}
