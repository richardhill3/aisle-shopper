import ListItem from "@/components/ListItem";
import { getLists, ShoppingList } from "@/storage/lists";
import { useTheme } from "@/utils/theme";
import { router } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ListsScreen() {
  const { globalStyles } = useTheme();
  const insets = useSafeAreaInsets();
  const [lists, setLists] = useState<ShoppingList[]>([]);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      async function loadLists() {
        const savedLists = await getLists();

        if (isActive) {
          setLists(savedLists);
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
      contentContainerStyle={[
        globalStyles.screenContent,
        {
          paddingBottom: insets.bottom + 40,
          paddingTop: insets.top + 20,
        },
      ]}
      contentInsetAdjustmentBehavior="automatic"
      style={globalStyles.container}
    >
      <Text style={globalStyles.title}>All Lists</Text>
      {lists.length === 0 ? (
        <Text style={globalStyles.empty}>No lists yet.</Text>
      ) : (
        <View style={globalStyles.listStack}>
          {lists.map((list) => (
            <ListItem
              key={list.id}
              name={list.name}
              itemCount={list.sections.reduce(
                (count, section) => count + section.items.length,
                0,
              )}
              sectionCount={list.sections.length}
              onPress={() =>
                router.push({
                  pathname: "/lists/[id]",
                  params: { id: list.id },
                })
              }
            />
          ))}
        </View>
      )}
    </ScrollView>
  );
}
