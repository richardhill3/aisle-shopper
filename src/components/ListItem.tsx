import { ColorPalette } from "@/styles/global";
import { useTheme } from "@/utils/theme";
import { StyleSheet, Text, View } from "react-native";

type ListItemProps = {
  name: string;
  itemCount: number;
};

export default function ListItem({ name, itemCount }: ListItemProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <View style={styles.container}>
      <Text style={styles.name}>{name}</Text>
      <Text style={styles.details}>• {itemCount} Items •</Text>
    </View>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    container: {
      backgroundColor: colors.surface,
      borderRadius: 8,
      padding: 16,
      marginBottom: 10,
    },
    name: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
    },
    details: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 4,
    },
  });
}
