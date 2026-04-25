import { useTheme } from "@/utils/theme";
import { StyleSheet, Text, View } from "react-native";
import ListItem from "./ListItem";

export default function RecentLists() {
  const { globalStyles } = useTheme();

  return (
    <View style={styles.container}>
      <Text style={globalStyles.sectionTitle}>Recent lists</Text>
      <ListItem name="List April 12th" itemCount={24} />
      <ListItem name="Pet Value Stuff" itemCount={7} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 30,
  },
});
