import type { Profile } from "@shared";
import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import type { ColorPalette } from "@/styles/global";
import { useTheme } from "@/utils/theme";

type AccountSettingsSectionProps = {
  displayName: string;
  loading: boolean;
  profile: Profile | null;
  savingProfile: boolean;
  signingIn: boolean;
  signingOut: boolean;
  onChangeDisplayName: (displayName: string) => void;
  onSaveDisplayName: () => void;
  onSignIn: () => void;
  onSignOut: () => void;
};

export default function AccountSettingsSection({
  displayName,
  loading,
  profile,
  savingProfile,
  signingIn,
  signingOut,
  onChangeDisplayName,
  onSaveDisplayName,
  onSignIn,
  onSignOut,
}: AccountSettingsSectionProps) {
  const { colors, globalStyles } = useTheme();
  const styles = createStyles(colors);
  const displayNameChanged =
    displayName.trim() !== (profile?.displayName ?? "");
  const canSave = Boolean(profile) && displayNameChanged && !savingProfile;

  return (
    <View style={styles.section}>
      <Text style={globalStyles.sectionTitle}>Account</Text>
      <View style={styles.card}>
        {loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.secondaryText}>Checking account status</Text>
          </View>
        ) : profile ? (
          <View style={styles.contentStack}>
            <View style={styles.identityRow}>
              <View style={styles.identityIcon}>
                <Ionicons
                  name="person-circle-outline"
                  size={24}
                  color={colors.primary}
                />
              </View>
              <View style={styles.identityText}>
                <Text style={styles.label}>Signed in as</Text>
                <Text selectable style={styles.email}>
                  {profile.email}
                </Text>
              </View>
            </View>

            <View style={styles.fieldStack}>
              <Text style={styles.label}>Display name</Text>
              <TextInput
                autoCapitalize="words"
                editable={!savingProfile}
                onChangeText={onChangeDisplayName}
                placeholder="Display name"
                placeholderTextColor={colors.textSecondary}
                style={styles.input}
                value={displayName}
              />
            </View>

            <View style={styles.actionRow}>
              <TouchableOpacity
                accessibilityRole="button"
                disabled={!canSave}
                onPress={onSaveDisplayName}
                style={[
                  styles.secondaryButton,
                  !canSave && styles.disabledButton,
                ]}
              >
                {savingProfile ? (
                  <ActivityIndicator color={colors.primary} />
                ) : (
                  <Text style={styles.secondaryButtonText}>Save name</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                accessibilityRole="button"
                disabled={signingOut}
                onPress={onSignOut}
                style={[
                  styles.dangerButton,
                  signingOut && styles.disabledButton,
                ]}
              >
                {signingOut ? (
                  <ActivityIndicator color={colors.alert} />
                ) : (
                  <Text style={styles.dangerButtonText}>Sign out</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.contentStack}>
            <Text style={styles.bodyText}>
              Sign in to sync shopping lists to your account.
            </Text>
            <TouchableOpacity
              accessibilityRole="button"
              disabled={signingIn}
              onPress={onSignIn}
              style={[styles.primaryButton, signingIn && styles.disabledButton]}
            >
              {signingIn ? (
                <ActivityIndicator color={colors.background} />
              ) : (
                <>
                  <Ionicons
                    name="logo-google"
                    size={18}
                    color={colors.background}
                  />
                  <Text style={styles.primaryButtonText}>
                    Sign in with Google
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
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
      padding: 16,
    },
    loadingRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: 10,
    },
    contentStack: {
      gap: 14,
    },
    identityRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: 12,
    },
    identityIcon: {
      alignItems: "center",
      backgroundColor: colors.header,
      borderRadius: 8,
      height: 42,
      justifyContent: "center",
      width: 42,
    },
    identityText: {
      flex: 1,
      gap: 3,
    },
    fieldStack: {
      gap: 8,
    },
    label: {
      color: colors.textSecondary,
      fontSize: 13,
      fontWeight: "600",
    },
    email: {
      color: colors.text,
      fontSize: 16,
      fontWeight: "600",
    },
    bodyText: {
      color: colors.text,
      fontSize: 15,
      lineHeight: 21,
    },
    secondaryText: {
      color: colors.textSecondary,
      fontSize: 14,
    },
    input: {
      backgroundColor: colors.background,
      borderColor: colors.header,
      borderRadius: 8,
      borderWidth: 1,
      color: colors.text,
      fontSize: 16,
      minHeight: 44,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    actionRow: {
      flexDirection: "row",
      gap: 10,
    },
    primaryButton: {
      alignItems: "center",
      backgroundColor: colors.primary,
      borderRadius: 8,
      flexDirection: "row",
      gap: 8,
      justifyContent: "center",
      minHeight: 46,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    secondaryButton: {
      alignItems: "center",
      borderColor: colors.primary,
      borderRadius: 8,
      borderWidth: 1,
      flex: 1,
      justifyContent: "center",
      minHeight: 44,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    dangerButton: {
      alignItems: "center",
      borderColor: colors.alert,
      borderRadius: 8,
      borderWidth: 1,
      flex: 1,
      justifyContent: "center",
      minHeight: 44,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    disabledButton: {
      opacity: 0.5,
    },
    primaryButtonText: {
      color: colors.background,
      fontSize: 16,
      fontWeight: "700",
    },
    secondaryButtonText: {
      color: colors.primary,
      fontSize: 15,
      fontWeight: "700",
    },
    dangerButtonText: {
      color: colors.alert,
      fontSize: 15,
      fontWeight: "700",
    },
  });
}
