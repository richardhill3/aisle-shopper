import { useTheme } from "@/utils/theme";
import { ScrollView, Text } from "react-native";

export default function ListsScreen() {
  const { globalStyles } = useTheme();

  return (
    <ScrollView style={globalStyles.container}>
      <Text style={globalStyles.title}>All Lists</Text>
    </ScrollView>
  );
}
