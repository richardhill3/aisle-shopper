import { ColorPalette } from "@/styles/global";
import { useTheme } from "@/utils/theme";
import Ionicons from "@expo/vector-icons/Ionicons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export type ListMode = "edit" | "shop";

type ListModeToggleProps = {
  mode: ListMode;
  onChangeMode: (mode: ListMode) => void;
};

export default function ListModeToggle({
  mode,
  onChangeMode,
}: ListModeToggleProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        accessibilityRole="button"
        onPress={() => onChangeMode("edit")}
        style={[styles.option, mode === "edit" && styles.selectedOption]}
      >
        <Ionicons
          name="create-outline"
          size={16}
          color={mode === "edit" ? colors.background : colors.textSecondary}
        />
        <Text
          style={[
            styles.optionText,
            mode === "edit" && styles.selectedOptionText,
          ]}
        >
          Edit
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        accessibilityRole="button"
        onPress={() => onChangeMode("shop")}
        style={[styles.option, mode === "shop" && styles.selectedOption]}
      >
        <Ionicons
          name="cart-outline"
          size={16}
          color={mode === "shop" ? colors.background : colors.textSecondary}
        />
        <Text
          style={[
            styles.optionText,
            mode === "shop" && styles.selectedOptionText,
          ]}
        >
          Shop
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    container: {
      backgroundColor: colors.surface,
      borderRadius: 8,
      flexDirection: "row",
      gap: 6,
      padding: 6,
    },
    option: {
      alignItems: "center",
      borderRadius: 6,
      flex: 1,
      flexDirection: "row",
      gap: 6,
      justifyContent: "center",
      paddingVertical: 10,
    },
    selectedOption: {
      backgroundColor: colors.primary,
    },
    optionText: {
      color: colors.textSecondary,
      fontSize: 14,
      fontWeight: "700",
    },
    selectedOptionText: {
      color: colors.background,
    },
  });
}
