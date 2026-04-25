import HomeHeader from "@/components/HomeHeader";
import RecentLists from "@/components/RecentLists";
import { getRecentLists, ShoppingList } from "@/storage/lists";
import { useTheme } from "@/utils/theme";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { ScrollView, Text } from "react-native";

export default function HomeScreen() {
  const { globalStyles } = useTheme();
  const [recentLists, setRecentLists] = useState<ShoppingList[]>([]);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      async function loadLists() {
        const lists = await getRecentLists();

        if (isActive) {
          setRecentLists(lists);
        }
      }

      loadLists();

      return () => {
        isActive = false;
      };
    }, []),
  );

  return (
    <ScrollView
      contentContainerStyle={globalStyles.screenContent}
      style={globalStyles.container}
    >
      <Text style={globalStyles.title}>Aisle Shopper, the App!</Text>
      <HomeHeader />
      <RecentLists lists={recentLists} />
    </ScrollView>
  );
}
