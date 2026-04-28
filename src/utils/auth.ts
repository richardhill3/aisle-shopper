import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createClient,
  type Session,
  type SupabaseClient,
} from "@supabase/supabase-js";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";

let supabaseClient: SupabaseClient | null = null;

export function resetAuthClientForTests() {
  supabaseClient = null;
}

export async function getCurrentSession(): Promise<Session | null> {
  const { data, error } = await getSupabaseClient().auth.getSession();

  if (error) {
    throw new Error(error.message);
  }

  return data.session;
}

export async function getAccessToken(): Promise<string | null> {
  const session = await getCurrentSession();
  return session?.access_token ?? null;
}

export async function isSignedIn(): Promise<boolean> {
  return (await getCurrentSession()) !== null;
}

export async function signInWithGoogle(): Promise<void> {
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
  const { error } = await getSupabaseClient().auth.signOut();

  if (error) {
    throw new Error(error.message);
  }
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
  return (
    process.env.EXPO_PUBLIC_SUPABASE_REDIRECT_URL ??
    Linking.createURL("auth/callback")
  );
}
