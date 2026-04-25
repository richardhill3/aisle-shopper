import HomeHeader from "@/components/HomeHeader";
import { globalStyles } from "@/styles/global";
import { ScrollView, Text } from "react-native";

export default function HomeScreen() {
  return (
    <ScrollView style={globalStyles.container}>
      <Text style={globalStyles.title}>Aisle Shopper, the App!</Text>
      <HomeHeader />
    </ScrollView>
  );
}
