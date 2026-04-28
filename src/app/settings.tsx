import AccountSettingsSection from "@/components/AccountSettingsSection";
import PaletteOption from "@/components/PaletteOption";
import { ColorPaletteKey, paletteLabels, palettes } from "@/styles/global";
import { getCurrentSession, signInWithGoogle, signOut } from "@/utils/auth";
import { fetchCurrentProfile, updateCurrentProfile } from "@/utils/profile";
import { useTheme } from "@/utils/theme";
import type { Profile } from "@shared";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function SettingsScreen() {
  const { colors, globalStyles, selectedPaletteKey, setSelectedPaletteKey } =
    useTheme();
  const insets = useSafeAreaInsets();
  const styles = createStyles(colors);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [loadingAccount, setLoadingAccount] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const loadAccount = useCallback(async (showErrors = true) => {
    setLoadingAccount(true);

    try {
      const session = await getCurrentSession();

      if (!session) {
        setProfile(null);
        setDisplayName("");
        return;
      }

      const currentProfile = await fetchCurrentProfile();
      setProfile(currentProfile);
      setDisplayName(currentProfile.displayName ?? "");
    } catch (error) {
      setProfile(null);
      setDisplayName("");

      if (
        showErrors ||
        !getErrorMessage(error).startsWith(
          "Missing Expo Supabase configuration.",
        )
      ) {
        Alert.alert("Account unavailable", getErrorMessage(error));
      }
    } finally {
      setLoadingAccount(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadAccount(false);
    }, [loadAccount]),
  );

  async function handleSelectPalette(paletteKey: ColorPaletteKey) {
    await setSelectedPaletteKey(paletteKey);
  }

  async function handleSignIn() {
    setSigningIn(true);

    try {
      await signInWithGoogle();
      await loadAccount();
    } catch (error) {
      Alert.alert("Sign-in failed", getErrorMessage(error));
    } finally {
      setSigningIn(false);
    }
  }

  async function handleSaveDisplayName() {
    const trimmedDisplayName = displayName.trim();
    setSavingProfile(true);

    try {
      const updatedProfile = await updateCurrentProfile(
        trimmedDisplayName ? trimmedDisplayName : null,
      );
      setProfile(updatedProfile);
      setDisplayName(updatedProfile.displayName ?? "");
      Alert.alert("Profile saved", "Your display name was updated.");
    } catch (error) {
      Alert.alert("Profile not saved", getErrorMessage(error));
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleSignOut() {
    setSigningOut(true);

    try {
      await signOut();
      setProfile(null);
      setDisplayName("");
    } catch (error) {
      Alert.alert("Sign-out failed", getErrorMessage(error));
    } finally {
      setSigningOut(false);
    }
  }

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
      <View style={globalStyles.headerRow}>
        <TouchableOpacity
          accessibilityLabel="Go back"
          accessibilityRole="button"
          onPress={() => router.back()}
          style={styles.iconButton}
        >
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={globalStyles.title}>Settings</Text>
      </View>

      <AccountSettingsSection
        displayName={displayName}
        loading={loadingAccount}
        profile={profile}
        savingProfile={savingProfile}
        signingIn={signingIn}
        signingOut={signingOut}
        onChangeDisplayName={setDisplayName}
        onSaveDisplayName={handleSaveDisplayName}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
      />

      <Text style={globalStyles.sectionTitle}>Color palette</Text>
      <View style={globalStyles.listStack}>
        {Object.entries(palettes).map(([paletteKey, palette]) => (
          <PaletteOption
            key={paletteKey}
            label={paletteLabels[paletteKey as ColorPaletteKey]}
            palette={palette}
            paletteKey={paletteKey as ColorPaletteKey}
            selected={selectedPaletteKey === paletteKey}
            onPress={handleSelectPalette}
          />
        ))}
      </View>
    </ScrollView>
  );
}

function createStyles(colors: (typeof palettes)[ColorPaletteKey]) {
  return StyleSheet.create({
    iconButton: {
      alignItems: "center",
      backgroundColor: colors.surface,
      borderRadius: 8,
      height: 36,
      justifyContent: "center",
      width: 36,
    },
  });
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong.";
}
