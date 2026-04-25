import { globalStyles } from "@/styles/global";
import { Text, View } from "react-native";
import ListItem from "./ListItem";

export default function RecentLists() {
  return (
    <View style={{ marginTop: 30 }}>
      <Text style={globalStyles.sectionTitle}>Recent lists</Text>
      <ListItem name="List April 12th" itemCount={24} />
      <ListItem name="Pet Value Stuff" itemCount={7} />
    </View>
  );
}
