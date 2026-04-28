import { ShoppingItem, ShoppingSection } from "@/storage/lists";
import { ColorPalette } from "@/styles/global";
import { useTheme } from "@/utils/theme";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type ShoppingListSectionProps = {
  section: ShoppingSection;
  sectionIndex: number;
  sectionCount: number;
  mode: "edit" | "shop";
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onRenameSection: (name: string) => void;
  onDeleteSection: () => void;
  onMoveSection: (direction: "up" | "down") => void;
  onAddItem: (name: string) => void;
  onRenameItem: (itemId: string, name: string) => void;
  onDeleteItem: (itemId: string) => void;
  onToggleItem: (itemId: string) => void;
};

export default function ShoppingListSection({
  section,
  sectionIndex,
  sectionCount,
  mode,
  collapsed,
  onToggleCollapsed,
  onRenameSection,
  onDeleteSection,
  onMoveSection,
  onAddItem,
  onRenameItem,
  onDeleteItem,
  onToggleItem,
}: ShoppingListSectionProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [sectionName, setSectionName] = useState(section.name);
  const [newItemName, setNewItemName] = useState("");
  const pendingAddItemName = useRef<string | null>(null);
  const completedCount = section.items.filter((item) => item.checked).length;
  const isComplete =
    section.items.length > 0 && completedCount === section.items.length;

  useEffect(() => {
    setSectionName(section.name);
  }, [section.name]);

  function handleSectionBlur() {
    const trimmedName = sectionName.trim();

    if (!trimmedName) {
      setSectionName(section.name);
      return;
    }

    if (trimmedName !== section.name) {
      onRenameSection(trimmedName);
    }
  }

  function handleAddItem() {
    const trimmedName = newItemName.trim();

    if (!trimmedName) {
      return;
    }

    if (pendingAddItemName.current === trimmedName) {
      return;
    }

    pendingAddItemName.current = trimmedName;
    onAddItem(trimmedName);
    setNewItemName("");
    setTimeout(() => {
      if (pendingAddItemName.current === trimmedName) {
        pendingAddItemName.current = null;
      }
    }, 0);
  }

  function confirmDeleteSection() {
    Alert.alert(
      "Delete aisle?",
      "This removes the aisle and every item in it.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: onDeleteSection },
      ],
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        accessibilityRole={mode === "shop" ? "button" : undefined}
        activeOpacity={mode === "shop" ? 0.7 : 1}
        onPress={mode === "shop" ? onToggleCollapsed : undefined}
        style={styles.header}
      >
        <View style={styles.titleArea}>
          {mode === "edit" ? (
            <TextInput
              onBlur={handleSectionBlur}
              onChangeText={setSectionName}
              placeholder="Aisle name"
              placeholderTextColor={colors.textSecondary}
              style={styles.sectionInput}
              value={sectionName}
            />
          ) : (
            <Text style={styles.sectionTitle}>{section.name}</Text>
          )}
          <Text style={styles.sectionMeta}>
            {completedCount}/{section.items.length} items
          </Text>
        </View>
        {mode === "edit" ? (
          <View style={styles.actions}>
            <IconButton
              disabled={sectionIndex === 0}
              icon="arrow-up-outline"
              label="Move aisle up"
              onPress={() => onMoveSection("up")}
            />
            <IconButton
              disabled={sectionIndex === sectionCount - 1}
              icon="arrow-down-outline"
              label="Move aisle down"
              onPress={() => onMoveSection("down")}
            />
            <IconButton
              destructive
              icon="trash-outline"
              label="Delete aisle"
              onPress={confirmDeleteSection}
            />
          </View>
        ) : (
          <Ionicons
            name={
              collapsed ? "chevron-forward-outline" : "chevron-down-outline"
            }
            size={20}
            color={isComplete ? colors.primary : colors.textSecondary}
          />
        )}
      </TouchableOpacity>

      {!collapsed && (
        <View style={styles.items}>
          {section.items.map((item) => (
            <ShoppingListItemRow
              key={item.id}
              item={item}
              mode={mode}
              onDelete={() => onDeleteItem(item.id)}
              onRename={(name) => onRenameItem(item.id, name)}
              onToggle={() => onToggleItem(item.id)}
            />
          ))}
          {mode === "edit" && (
            <View style={styles.addItemRow}>
              <TextInput
                onBlur={handleAddItem}
                onChangeText={setNewItemName}
                onSubmitEditing={handleAddItem}
                placeholder="Add item"
                placeholderTextColor={colors.textSecondary}
                style={styles.itemInput}
                value={newItemName}
              />
            </View>
          )}
        </View>
      )}
    </View>
  );
}

type ShoppingListItemRowProps = {
  item: ShoppingItem;
  mode: "edit" | "shop";
  onRename: (name: string) => void;
  onDelete: () => void;
  onToggle: () => void;
};

function ShoppingListItemRow({
  item,
  mode,
  onRename,
  onDelete,
  onToggle,
}: ShoppingListItemRowProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [itemName, setItemName] = useState(item.name);

  useEffect(() => {
    setItemName(item.name);
  }, [item.name]);

  function handleItemBlur() {
    const trimmedName = itemName.trim();

    if (!trimmedName) {
      setItemName(item.name);
      return;
    }

    if (trimmedName !== item.name) {
      onRename(trimmedName);
    }
  }

  function confirmDeleteItem() {
    Alert.alert("Delete item?", "This removes the item from the list.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: onDelete },
    ]);
  }

  if (mode === "shop") {
    return (
      <TouchableOpacity
        accessibilityRole="checkbox"
        accessibilityState={{ checked: item.checked }}
        onPress={onToggle}
        style={[styles.itemRow, item.checked && styles.checkedItemRow]}
      >
        <Ionicons
          name={item.checked ? "checkmark-circle-outline" : "ellipse-outline"}
          size={22}
          color={item.checked ? colors.primary : colors.textSecondary}
        />
        <Text style={[styles.itemText, item.checked && styles.checkedItemText]}>
          {item.name}
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.itemRow}>
      <TextInput
        onBlur={handleItemBlur}
        onChangeText={setItemName}
        style={styles.itemInput}
        value={itemName}
      />
      <IconButton
        destructive
        icon="trash-outline"
        label="Delete item"
        onPress={confirmDeleteItem}
      />
    </View>
  );
}

type IconButtonProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  destructive?: boolean;
  disabled?: boolean;
};

function IconButton({
  icon,
  label,
  onPress,
  destructive = false,
  disabled = false,
}: IconButtonProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const color = destructive ? colors.primary : colors.textSecondary;

  return (
    <TouchableOpacity
      accessibilityLabel={label}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[styles.iconButton, disabled && styles.disabledButton]}
    >
      <Ionicons
        name={icon}
        size={18}
        color={disabled ? colors.header : color}
      />
    </TouchableOpacity>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    container: {
      backgroundColor: colors.surface,
      borderRadius: 8,
      gap: 12,
      padding: 14,
    },
    header: {
      alignItems: "center",
      flexDirection: "row",
      gap: 12,
      justifyContent: "space-between",
    },
    titleArea: {
      flex: 1,
      gap: 4,
    },
    sectionInput: {
      color: colors.text,
      fontSize: 18,
      fontWeight: "700",
      padding: 0,
    },
    sectionTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: "700",
    },
    sectionMeta: {
      color: colors.textSecondary,
      fontSize: 12,
      fontVariant: ["tabular-nums"],
    },
    actions: {
      flexDirection: "row",
      gap: 6,
    },
    iconButton: {
      alignItems: "center",
      backgroundColor: colors.background,
      borderRadius: 8,
      height: 34,
      justifyContent: "center",
      width: 34,
    },
    disabledButton: {
      opacity: 0.45,
    },
    items: {
      gap: 8,
    },
    itemRow: {
      alignItems: "center",
      backgroundColor: colors.background,
      borderRadius: 8,
      flexDirection: "row",
      gap: 10,
      minHeight: 46,
      paddingHorizontal: 12,
    },
    checkedItemRow: {
      opacity: 0.7,
    },
    itemInput: {
      color: colors.text,
      flex: 1,
      fontSize: 15,
      paddingVertical: 10,
    },
    itemText: {
      color: colors.text,
      flex: 1,
      fontSize: 15,
    },
    checkedItemText: {
      color: colors.textSecondary,
      textDecorationLine: "line-through",
    },
    addItemRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: 8,
    },
  });
}
