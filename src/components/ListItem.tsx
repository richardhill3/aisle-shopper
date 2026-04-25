import { ColorPalette } from "@/styles/global";
import { useTheme } from "@/utils/theme";
import { StyleSheet, Text, TouchableOpacity } from "react-native";

type ListItemProps = {
  name: string;
  itemCount: number;
  sectionCount?: number;
  onPress: () => void;
};

export default function ListItem({
  name,
  itemCount,
  sectionCount = 0,
  onPress,
}: ListItemProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const itemLabel = itemCount === 1 ? "item" : "items";
  const sectionLabel = sectionCount === 1 ? "aisle" : "aisles";

  return (
    <TouchableOpacity
      accessibilityRole="button"
      onPress={onPress}
      style={styles.container}
    >
      <Text style={styles.name}>{name}</Text>
      <Text style={styles.details}>
        {itemCount} {itemLabel} · {sectionCount} {sectionLabel}
      </Text>
    </TouchableOpacity>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    container: {
      backgroundColor: colors.surface,
      borderRadius: 8,
      padding: 16,
    },
    name: {
      color: colors.text,
      fontSize: 16,
      fontWeight: "600",
    },
    details: {
      color: colors.textSecondary,
      fontSize: 13,
      marginTop: 4,
    },
  });
}
