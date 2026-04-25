import ListItem from "@/components/ListItem";
import { ShoppingList } from "@/storage/lists";
import { useTheme } from "@/utils/theme";
import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

type RecentListsProps = {
  lists: ShoppingList[];
};

export default function RecentLists({ lists }: RecentListsProps) {
  const { globalStyles } = useTheme();

  return (
    <View style={styles.container}>
      <Text style={globalStyles.sectionTitle}>Recent lists</Text>
      {lists.length === 0 ? (
        <Text style={globalStyles.empty}>No lists yet.</Text>
      ) : (
        lists.map((list) => (
          <ListItem
            key={list.id}
            name={list.name}
            itemCount={list.sections.reduce(
              (count, section) => count + section.items.length,
              0,
            )}
            sectionCount={list.sections.length}
            onPress={() =>
              router.push({ pathname: "/lists/[id]", params: { id: list.id } })
            }
          />
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 30,
  },
});
