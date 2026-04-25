import { globalStyles } from "@/styles/global";
import { ScrollView, Text } from "react-native";

export default function MealsScreen() {
  return (
    <ScrollView style={globalStyles.container}>
      <Text style={globalStyles.title}>All Lists</Text>
    </ScrollView>
  );
}
