import { createList } from "@/storage/lists";
import { ColorPalette } from "@/styles/global";
import { useTheme } from "@/utils/theme";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useState } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function CreateListScreen() {
  const { colors, globalStyles } = useTheme();
  const styles = createStyles(colors);
  const [name, setName] = useState("");

  async function handleCreateList() {
    const trimmedName = name.trim();

    if (!trimmedName) {
      Alert.alert(
        "List name required",
        "Enter a list name before creating it.",
      );
      return;
    }

    const list = await createList(trimmedName);
    setName("");
    router.push({ pathname: "/lists/[id]", params: { id: list.id } });
  }

  return (
    <View style={[globalStyles.container, globalStyles.screenContent]}>
      <Text style={globalStyles.title}>Create List</Text>
      <View style={styles.form}>
        <TextInput
          onChangeText={setName}
          placeholder="List name"
          placeholderTextColor={colors.textSecondary}
          style={styles.input}
          value={name}
        />
        <TouchableOpacity
          accessibilityRole="button"
          onPress={handleCreateList}
          style={styles.button}
        >
          <Ionicons
            name="add-circle-outline"
            size={20}
            color={colors.background}
          />
          <Text style={styles.buttonText}>Create list</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    form: {
      gap: 14,
    },
    input: {
      backgroundColor: colors.surface,
      borderRadius: 8,
      color: colors.text,
      fontSize: 16,
      padding: 16,
    },
    button: {
      alignItems: "center",
      backgroundColor: colors.primary,
      borderRadius: 8,
      flexDirection: "row",
      gap: 8,
      justifyContent: "center",
      padding: 14,
    },
    buttonText: {
      color: colors.background,
      fontSize: 16,
      fontWeight: "700",
    },
  });
}
