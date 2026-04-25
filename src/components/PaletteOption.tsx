import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { ColorPalette, ColorPaletteKey } from "@/styles/global";
import { useTheme } from "@/utils/theme";

type PaletteOptionProps = {
  label: string;
  palette: ColorPalette;
  paletteKey: ColorPaletteKey;
  selected: boolean;
  onPress: (paletteKey: ColorPaletteKey) => void;
};

export default function PaletteOption({
  label,
  palette,
  paletteKey,
  selected,
  onPress,
}: PaletteOptionProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={() => onPress(paletteKey)}
      style={[styles.container, selected && { borderColor: colors.primary }]}
    >
      <View style={styles.details}>
        <View style={styles.swatches}>
          <View
            style={[styles.swatch, { backgroundColor: palette.background }]}
          />
          <View style={[styles.swatch, { backgroundColor: palette.surface }]} />
          <View style={[styles.swatch, { backgroundColor: palette.primary }]} />
        </View>
        <Text style={styles.label}>{label}</Text>
      </View>
      {selected ? (
        <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
      ) : null}
    </TouchableOpacity>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    container: {
      alignItems: "center",
      backgroundColor: colors.surface,
      borderColor: colors.header,
      borderRadius: 8,
      borderWidth: 1,
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 12,
      padding: 16,
    },
    details: {
      flex: 1,
    },
    swatches: {
      flexDirection: "row",
      gap: 8,
      marginBottom: 10,
    },
    swatch: {
      borderColor: colors.header,
      borderRadius: 12,
      borderWidth: 1,
      height: 24,
      width: 24,
    },
    label: {
      color: colors.text,
      fontSize: 16,
      fontWeight: "600",
    },
  });
}
