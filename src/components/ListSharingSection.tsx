import type { ListMember } from "@shared";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import type { ColorPalette } from "@/styles/global";
import { ApiClientError } from "@/utils/api";
import { useTheme } from "@/utils/theme";

type ListSharingSectionProps = {
  members: ListMember[];
  onAddMember: (email: string) => Promise<void>;
  onRemoveMember: (profileId: string) => Promise<void>;
};

export default function ListSharingSection({
  members,
  onAddMember,
  onRemoveMember,
}: ListSharingSectionProps) {
  const { colors, globalStyles } = useTheme();
  const styles = createStyles(colors);
  const [email, setEmail] = useState("");
  const [adding, setAdding] = useState(false);
  const [removingProfileId, setRemovingProfileId] = useState<string | null>(
    null,
  );

  async function handleAddMember() {
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      Alert.alert(
        "Email required",
        "Enter an existing user's email before sharing.",
      );
      return;
    }

    setAdding(true);

    try {
      await onAddMember(trimmedEmail);
      setEmail("");
    } catch (error) {
      Alert.alert("Unable to share list", errorMessage(error));
    } finally {
      setAdding(false);
    }
  }

  function confirmRemoveMember(member: ListMember) {
    const label = member.displayName ?? member.email;
    const message = `${label} will lose access to this list.`;

    if (Platform.OS === "web") {
      const confirm = (
        globalThis as typeof globalThis & {
          confirm?: (message?: string) => boolean;
        }
      ).confirm;

      if (typeof confirm === "function" && confirm(message)) {
        void removeMember(member.id);
      }

      return;
    }

    Alert.alert("Remove collaborator?", message, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => {
          void removeMember(member.id);
        },
      },
    ]);
  }

  async function removeMember(profileId: string) {
    setRemovingProfileId(profileId);

    try {
      await onRemoveMember(profileId);
    } catch (error) {
      Alert.alert("Unable to remove collaborator", errorMessage(error));
    } finally {
      setRemovingProfileId(null);
    }
  }

  return (
    <View style={styles.section}>
      <Text style={globalStyles.sectionTitle}>Sharing</Text>
      <View style={styles.card}>
        <View style={styles.addRow}>
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            editable={!adding}
            inputMode="email"
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder="Collaborator email"
            placeholderTextColor={colors.textSecondary}
            style={styles.input}
            value={email}
          />
          <TouchableOpacity
            accessibilityLabel="Add collaborator"
            accessibilityRole="button"
            disabled={adding}
            onPress={handleAddMember}
            style={[styles.iconButton, adding && styles.disabledButton]}
          >
            {adding ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <Ionicons
                name="person-add-outline"
                size={20}
                color={colors.primary}
              />
            )}
          </TouchableOpacity>
        </View>

        {members.length === 0 ? (
          <Text style={styles.emptyText}>No collaborators yet.</Text>
        ) : (
          <View style={styles.memberStack}>
            {members.map((member) => {
              const removing = removingProfileId === member.id;

              return (
                <View key={member.id} style={styles.memberRow}>
                  <View style={styles.memberText}>
                    {member.displayName ? (
                      <Text style={styles.memberName}>
                        {member.displayName}
                      </Text>
                    ) : null}
                    <Text selectable style={styles.memberEmail}>
                      {member.email}
                    </Text>
                  </View>
                  <TouchableOpacity
                    accessibilityLabel={`Remove ${member.email}`}
                    accessibilityRole="button"
                    disabled={removing}
                    onPress={() => confirmRemoveMember(member)}
                    style={[
                      styles.removeButton,
                      removing && styles.disabledButton,
                    ]}
                  >
                    {removing ? (
                      <ActivityIndicator color={colors.alert} />
                    ) : (
                      <Ionicons
                        name="close-outline"
                        size={20}
                        color={colors.alert}
                      />
                    )}
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}
      </View>
    </View>
  );
}

function errorMessage(error: unknown) {
  if (error instanceof ApiClientError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Try again in a moment.";
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    section: {
      gap: 10,
    },
    card: {
      backgroundColor: colors.surface,
      borderColor: colors.header,
      borderRadius: 8,
      borderWidth: 1,
      gap: 12,
      padding: 14,
    },
    addRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: 10,
    },
    input: {
      backgroundColor: colors.background,
      borderColor: colors.header,
      borderRadius: 8,
      borderWidth: 1,
      color: colors.text,
      flex: 1,
      fontSize: 16,
      minHeight: 44,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    iconButton: {
      alignItems: "center",
      backgroundColor: colors.background,
      borderRadius: 8,
      height: 44,
      justifyContent: "center",
      width: 44,
    },
    disabledButton: {
      opacity: 0.5,
    },
    emptyText: {
      color: colors.textSecondary,
      fontSize: 14,
    },
    memberStack: {
      gap: 8,
    },
    memberRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: 10,
    },
    memberText: {
      flex: 1,
      gap: 2,
    },
    memberName: {
      color: colors.text,
      fontSize: 15,
      fontWeight: "700",
    },
    memberEmail: {
      color: colors.textSecondary,
      fontSize: 14,
    },
    removeButton: {
      alignItems: "center",
      borderColor: colors.alert,
      borderRadius: 8,
      borderWidth: 1,
      height: 38,
      justifyContent: "center",
      width: 38,
    },
  });
}
