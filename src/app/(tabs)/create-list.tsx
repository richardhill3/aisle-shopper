import { useTheme } from "@/utils/theme";
import { Text, View } from "react-native";

export default function CreateListScreen() {
  const { globalStyles } = useTheme();

  return (
    <View style={globalStyles.container}>
      <Text style={globalStyles.title}>Create List</Text>
    </View>
  );
}
