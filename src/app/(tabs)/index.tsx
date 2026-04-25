import HomeHeader from "@/components/HomeHeader";
import RecentLists from "@/components/RecentLists";
import { useTheme } from "@/utils/theme";
import { ScrollView, Text } from "react-native";

export default function HomeScreen() {
  const { globalStyles } = useTheme();

  return (
    <ScrollView style={globalStyles.container}>
      <Text style={globalStyles.title}>Aisle Shopper, the App!</Text>
      <HomeHeader />
      <RecentLists />
    </ScrollView>
  );
}
