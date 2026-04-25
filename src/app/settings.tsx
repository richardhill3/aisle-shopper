import PaletteOption from "@/components/PaletteOption";
import { ColorPaletteKey, paletteLabels, palettes } from "@/styles/global";
import { useTheme } from "@/utils/theme";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function SettingsScreen() {
  const { colors, globalStyles, selectedPaletteKey, setSelectedPaletteKey } =
    useTheme();
  const insets = useSafeAreaInsets();
  const styles = createStyles(colors);

  async function handleSelectPalette(paletteKey: ColorPaletteKey) {
    await setSelectedPaletteKey(paletteKey);
  }

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
      <View style={globalStyles.headerRow}>
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
      <View style={globalStyles.listStack}>
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
    </ScrollView>
  );
}

function createStyles(colors: (typeof palettes)[ColorPaletteKey]) {
  return StyleSheet.create({
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
