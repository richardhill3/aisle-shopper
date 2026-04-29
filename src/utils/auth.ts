import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createClient,
  type Session,
  type SupabaseClient,
} from "@supabase/supabase-js";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";

let supabaseClient: SupabaseClient | null = null;
const testAuthKey = "aisle-shopper:test-auth";

type TestAuthIdentity = {
  email: string;
  userId: string;
};

export function resetAuthClientForTests() {
  supabaseClient = null;
}

export async function getCurrentSession(): Promise<Session | null> {
  const testIdentity = await getTestAuthIdentity();

  if (testIdentity) {
    return {
      access_token: "test-auth-bypass",
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      expires_in: 3600,
      refresh_token: "test-auth-bypass",
      token_type: "bearer",
      user: {
        id: testIdentity.userId,
        email: testIdentity.email,
      },
    } as Session;
  }

  if (testAuthBypassEnabled()) {
    return null;
  }

  const { data, error } = await getSupabaseClient().auth.getSession();

  if (error) {
    throw new Error(error.message);
  }

  return data.session;
}

export async function getAccessToken(): Promise<string | null> {
  if (await getTestAuthIdentity()) {
    return null;
  }

  const session = await getCurrentSession();
  return session?.access_token ?? null;
}

export async function getTestAuthHeaders(): Promise<Record<string, string>> {
  const testIdentity = await getTestAuthIdentity();

  if (!testIdentity) {
    return {};
  }

  return {
    "x-test-auth-email": testIdentity.email,
    "x-test-auth-user-id": testIdentity.userId,
  };
}

export async function isSignedIn(): Promise<boolean> {
  return (await getCurrentSession()) !== null;
}

export async function signInWithGoogle(): Promise<void> {
  if (testAuthBypassEnabled()) {
    await AsyncStorage.setItem(
      testAuthKey,
      JSON.stringify(getDefaultTestAuth()),
    );
    return;
  }

  const redirectTo = getAuthRedirectUrl();
  const { data, error } = await getSupabaseClient().auth.signInWithOAuth({
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
    provider: "google",
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data.url) {
    throw new Error("Google sign-in did not return a redirect URL.");
  }

  if (Platform.OS === "web") {
    redirectBrowserTo(data.url);
    return;
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

  if (result.type === "success") {
    await handleAuthRedirect(result.url);
  }
}

export async function handleAuthRedirect(url: string): Promise<void> {
  const parsed = new URL(url);
  const code = parsed.searchParams.get("code");

  if (code) {
    const { error } =
      await getSupabaseClient().auth.exchangeCodeForSession(code);

    if (error) {
      throw new Error(error.message);
    }

    return;
  }

  const hashParams = new URLSearchParams(parsed.hash.replace(/^#/, ""));
  const accessToken = hashParams.get("access_token");
  const refreshToken = hashParams.get("refresh_token");

  if (accessToken && refreshToken) {
    const { error } = await getSupabaseClient().auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (error) {
      throw new Error(error.message);
    }
  }
}

export async function signOut(): Promise<void> {
  if (testAuthBypassEnabled()) {
    await AsyncStorage.removeItem(testAuthKey);
    return;
  }

  const { error } = await getSupabaseClient().auth.signOut();

  if (error) {
    throw new Error(error.message);
  }
}

async function getTestAuthIdentity(): Promise<TestAuthIdentity | null> {
  if (!testAuthBypassEnabled()) {
    return null;
  }

  const value = await AsyncStorage.getItem(testAuthKey);
  return value ? (JSON.parse(value) as TestAuthIdentity) : null;
}

function getDefaultTestAuth(): TestAuthIdentity {
  return {
    email: process.env.EXPO_PUBLIC_TEST_AUTH_EMAIL ?? "e2e-owner@example.com",
    userId: process.env.EXPO_PUBLIC_TEST_AUTH_USER_ID ?? "e2e-owner",
  };
}

function testAuthBypassEnabled() {
  return process.env.EXPO_PUBLIC_ENABLE_TEST_AUTH_BYPASS === "true";
}

function getSupabaseClient() {
  if (supabaseClient) {
    return supabaseClient;
  }

  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Missing Expo Supabase configuration. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }

  supabaseClient = createClient(url, anonKey, {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: false,
      persistSession: true,
      storage: AsyncStorage,
    },
  });

  return supabaseClient;
}

function getAuthRedirectUrl() {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    return `${window.location.origin}/auth/callback`;
  }

  return (
    process.env.EXPO_PUBLIC_SUPABASE_REDIRECT_URL ??
    Linking.createURL("auth/callback")
  );
}

function redirectBrowserTo(url: string) {
  if (typeof window === "undefined") {
    throw new Error("Browser sign-in is only available in a web environment.");
  }

  window.location.assign(url);
}
