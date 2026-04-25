import PaletteOption from "@/components/PaletteOption";
import { paletteLabels, palettes, ColorPaletteKey } from "@/styles/global";
import { useTheme } from "@/utils/theme";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function SettingsScreen() {
  const { colors, globalStyles, selectedPaletteKey, setSelectedPaletteKey } =
    useTheme();
  const styles = createStyles(colors);

  async function handleSelectPalette(paletteKey: ColorPaletteKey) {
    await setSelectedPaletteKey(paletteKey);
  }

  return (
    <View style={globalStyles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          accessibilityLabel="Go back"
          accessibilityRole="button"
          onPress={() => router.back()}
          style={styles.iconButton}
        >
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={globalStyles.title}>Settings</Text>
      </View>

      <Text style={globalStyles.sectionTitle}>Color palette</Text>
      {Object.entries(palettes).map(([paletteKey, palette]) => (
        <PaletteOption
          key={paletteKey}
          label={paletteLabels[paletteKey as ColorPaletteKey]}
          palette={palette}
          paletteKey={paletteKey as ColorPaletteKey}
          selected={selectedPaletteKey === paletteKey}
          onPress={handleSelectPalette}
        />
      ))}
    </View>
  );
}

function createStyles(colors: (typeof palettes)[ColorPaletteKey]) {
  return StyleSheet.create({
    header: {
      alignItems: "center",
      flexDirection: "row",
      gap: 12,
    },
    iconButton: {
      alignItems: "center",
      backgroundColor: colors.surface,
      borderRadius: 8,
      height: 36,
      justifyContent: "center",
      width: 36,
    },
  });
}
