import ListModeToggle, { ListMode } from "@/components/ListModeToggle";
import ShoppingListSection from "@/components/ShoppingListSection";
import {
  addItem,
  addSection,
  deleteItem,
  deleteList,
  deleteSection,
  getList,
  moveSection,
  renameItem,
  renameSection,
  resetCheckedItems,
  ShoppingList,
  ShoppingSection,
  toggleItemChecked,
  updateList,
} from "@/storage/lists";
import { ColorPalette } from "@/styles/global";
import { useTheme } from "@/utils/theme";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  LayoutChangeEvent,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function ListDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, globalStyles } = useTheme();
  const styles = createStyles(colors);
  const scrollRef = useRef<ScrollView>(null);
  const sectionPositions = useRef<Record<string, number>>({});
  const [list, setList] = useState<ShoppingList | null>(null);
  const [mode, setMode] = useState<ListMode>("edit");
  const [listName, setListName] = useState("");
  const [newSectionName, setNewSectionName] = useState("");
  const [collapsedSections, setCollapsedSections] = useState<
    Record<string, boolean>
  >({});

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      async function loadList() {
        const savedList = await getList(id);

        if (isActive) {
          setList(savedList);
          setListName(savedList?.name ?? "");
        }
      }

      loadList();

      return () => {
        isActive = false;
      };
    }, [id]),
  );

  const visibleSections =
    list?.sections.filter(
      (section) => mode === "edit" || section.items.length > 0,
    ) ?? [];

  function isSectionComplete(section: ShoppingSection) {
    return (
      section.items.length > 0 && section.items.every((item) => item.checked)
    );
  }

  function handleSectionLayout(sectionId: string, event: LayoutChangeEvent) {
    sectionPositions.current[sectionId] = event.nativeEvent.layout.y;
  }

  async function handleRenameList() {
    if (!list) {
      return;
    }

    const trimmedName = listName.trim();

    if (!trimmedName) {
      setListName(list.name);
      return;
    }

    if (trimmedName !== list.name) {
      const updatedList = await updateList(list.id, { name: trimmedName });
      setList(updatedList);
    }
  }

  async function handleAddSection() {
    if (!list) {
      return;
    }

    const trimmedName = newSectionName.trim();

    if (!trimmedName) {
      Alert.alert("Aisle required", "Enter an aisle name before adding it.");
      return;
    }

    const updatedList = await addSection(list.id, trimmedName);
    setList(updatedList);
    setNewSectionName("");
  }

  async function handleToggleItem(sectionId: string, itemId: string) {
    if (!list) {
      return;
    }

    const updatedList = await toggleItemChecked(list.id, sectionId, itemId);

    if (!updatedList) {
      return;
    }

    setList(updatedList);
    const sectionIndex = updatedList.sections.findIndex(
      (section) => section.id === sectionId,
    );
    const section = updatedList.sections[sectionIndex];

    if (!section) {
      return;
    }

    if (!isSectionComplete(section)) {
      setCollapsedSections((current) => ({
        ...current,
        [sectionId]: false,
      }));
      return;
    }

    setCollapsedSections((current) => ({
      ...current,
      [sectionId]: true,
    }));

    const nextSection = updatedList.sections
      .slice(sectionIndex + 1)
      .find(
        (candidate) =>
          candidate.items.length > 0 && !isSectionComplete(candidate),
      );

    if (nextSection) {
      setTimeout(() => {
        scrollRef.current?.scrollTo({
          y: sectionPositions.current[nextSection.id] ?? 0,
          animated: true,
        });
      }, 100);
    }
  }

  async function handleResetCheckedItems() {
    if (!list) {
      return;
    }

    const updatedList = await resetCheckedItems(list.id);
    setList(updatedList);
    setCollapsedSections({});
  }

  function confirmDeleteList() {
    if (!list) {
      return;
    }

    Alert.alert("Delete list?", "This removes the list and every item in it.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteList(list.id);
          router.replace("/");
        },
      },
    ]);
  }

  const addSectionRow = (
    <View style={styles.addSectionRow}>
      <TextInput
        onChangeText={setNewSectionName}
        placeholder="Add aisle"
        placeholderTextColor={colors.textSecondary}
        style={styles.sectionInput}
        value={newSectionName}
      />
      <TouchableOpacity
        accessibilityLabel="Add aisle"
        accessibilityRole="button"
        onPress={handleAddSection}
        style={styles.iconButton}
      >
        <Ionicons name="add-outline" size={22} color={colors.primary} />
      </TouchableOpacity>
    </View>
  );

  if (!list) {
    return (
      <View style={globalStyles.container}>
        <Text style={globalStyles.title}>List not found</Text>
        <TouchableOpacity
          accessibilityRole="button"
          onPress={() => router.replace("/")}
          style={styles.primaryButton}
        >
          <Ionicons name="home-outline" size={20} color={colors.background} />
          <Text style={styles.primaryButtonText}>Go home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView behavior="padding" style={styles.container}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.detailContent}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        ref={scrollRef}
        style={styles.scroller}
      >
        <View style={styles.header}>
          <TouchableOpacity
            accessibilityLabel="Go back"
            accessibilityRole="button"
            onPress={() => router.back()}
            style={styles.iconButton}
          >
            <Ionicons
              name="chevron-back-outline"
              size={22}
              color={colors.text}
            />
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityLabel="Delete list"
            accessibilityRole="button"
            onPress={confirmDeleteList}
            style={styles.iconButton}
          >
            <Ionicons name="trash-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {mode === "edit" ? (
          <TextInput
            onBlur={handleRenameList}
            onChangeText={setListName}
            placeholder="List name"
            placeholderTextColor={colors.textSecondary}
            style={styles.titleInput}
            value={listName}
          />
        ) : (
          <Text style={globalStyles.title}>{list.name}</Text>
        )}

        <ListModeToggle mode={mode} onChangeMode={setMode} />

        {mode === "shop" && (
          <TouchableOpacity
            accessibilityRole="button"
            onPress={handleResetCheckedItems}
            style={styles.secondaryButton}
          >
            <Ionicons name="refresh-outline" size={18} color={colors.primary} />
            <Text style={styles.secondaryButtonText}>Reset checked items</Text>
          </TouchableOpacity>
        )}

        {visibleSections.length === 0 ? (
          <>
            {mode === "edit" && addSectionRow}
            <Text style={globalStyles.empty}>
              {mode === "edit"
                ? "Add an aisle to start building this list."
                : "No items to shop yet."}
            </Text>
          </>
        ) : (
          <>
            {visibleSections.map((section, index) => {
              const sectionComplete = isSectionComplete(section);
              const collapsed =
                mode === "shop"
                  ? (collapsedSections[section.id] ?? sectionComplete)
                  : false;

              return (
                <View
                  key={section.id}
                  onLayout={(event) => handleSectionLayout(section.id, event)}
                >
                  <ShoppingListSection
                    collapsed={collapsed}
                    mode={mode}
                    onAddItem={async (name) => {
                      const updatedList = await addItem(
                        list.id,
                        section.id,
                        name,
                      );
                      setList(updatedList);
                    }}
                    onDeleteItem={async (itemId) => {
                      const updatedList = await deleteItem(
                        list.id,
                        section.id,
                        itemId,
                      );
                      setList(updatedList);
                    }}
                    onDeleteSection={async () => {
                      const updatedList = await deleteSection(
                        list.id,
                        section.id,
                      );
                      setList(updatedList);
                    }}
                    onMoveSection={async (direction) => {
                      const updatedList = await moveSection(
                        list.id,
                        section.id,
                        direction,
                      );
                      setList(updatedList);
                    }}
                    onRenameItem={async (itemId, name) => {
                      const updatedList = await renameItem(
                        list.id,
                        section.id,
                        itemId,
                        name,
                      );
                      setList(updatedList);
                    }}
                    onRenameSection={async (name) => {
                      const updatedList = await renameSection(
                        list.id,
                        section.id,
                        name,
                      );
                      setList(updatedList);
                    }}
                    onToggleCollapsed={() =>
                      setCollapsedSections((current) => ({
                        ...current,
                        [section.id]: !collapsed,
                      }))
                    }
                    onToggleItem={(itemId) =>
                      handleToggleItem(section.id, itemId)
                    }
                    section={section}
                    sectionCount={visibleSections.length}
                    sectionIndex={index}
                  />
                </View>
              );
            })}
            {mode === "edit" && addSectionRow}
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    container: {
      backgroundColor: colors.background,
      flex: 1,
    },
    scroller: {
      flex: 1,
    },
    detailContent: {
      gap: 16,
      paddingHorizontal: 20,
      paddingBottom: 180,
      paddingTop: 60,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    iconButton: {
      alignItems: "center",
      backgroundColor: colors.surface,
      borderRadius: 8,
      height: 38,
      justifyContent: "center",
      width: 38,
    },
    titleInput: {
      color: colors.text,
      fontSize: 28,
      fontWeight: "bold",
      padding: 0,
    },
    addSectionRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: 10,
    },
    sectionInput: {
      backgroundColor: colors.surface,
      borderRadius: 8,
      color: colors.text,
      flex: 1,
      fontSize: 16,
      padding: 14,
    },
    primaryButton: {
      alignItems: "center",
      backgroundColor: colors.primary,
      borderRadius: 8,
      flexDirection: "row",
      gap: 8,
      justifyContent: "center",
      marginTop: 30,
      padding: 14,
    },
    primaryButtonText: {
      color: colors.background,
      fontSize: 16,
      fontWeight: "700",
    },
    secondaryButton: {
      alignItems: "center",
      alignSelf: "flex-start",
      backgroundColor: colors.surface,
      borderRadius: 8,
      flexDirection: "row",
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    secondaryButtonText: {
      color: colors.primary,
      fontSize: 14,
      fontWeight: "700",
    },
  });
}
