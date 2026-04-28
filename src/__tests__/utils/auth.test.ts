import { createClient } from "@supabase/supabase-js";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import {
  getAccessToken,
  getCurrentSession,
  handleAuthRedirect,
  resetAuthClientForTests,
  signInWithGoogle,
  signOut,
} from "@/utils/auth";

jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn(),
}));

jest.mock("expo-linking", () => ({
  createURL: jest.fn(() => "aisleshopper://auth/callback"),
}));

jest.mock("expo-web-browser", () => ({
  openAuthSessionAsync: jest.fn(),
}));

const mockedCreateClient = jest.mocked(createClient);
const mockedCreateURL = jest.mocked(Linking.createURL);
const mockedOpenAuthSessionAsync = jest.mocked(WebBrowser.openAuthSessionAsync);

function setSupabaseEnv() {
  process.env.EXPO_PUBLIC_SUPABASE_URL = "https://project.supabase.co";
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
}

function mockSupabaseClient(session: { access_token: string } | null = null) {
  const client = {
    auth: {
      exchangeCodeForSession: jest.fn().mockResolvedValue({ error: null }),
      getSession: jest.fn().mockResolvedValue({ data: { session } }),
      setSession: jest.fn().mockResolvedValue({ error: null }),
      signInWithOAuth: jest.fn().mockResolvedValue({
        data: { url: "https://project.supabase.co/auth/v1/authorize" },
        error: null,
      }),
      signOut: jest.fn().mockResolvedValue({ error: null }),
    },
  };

  mockedCreateClient.mockReturnValue(client as never);

  return client;
}

describe("auth utility", () => {
  beforeEach(() => {
    resetAuthClientForTests();
    mockedCreateClient.mockReset();
    mockedCreateURL.mockClear();
    mockedOpenAuthSessionAsync.mockReset();
    delete process.env.EXPO_PUBLIC_SUPABASE_REDIRECT_URL;
    setSupabaseEnv();
  });

  it("fails clearly from auth code when Supabase env is missing", async () => {
    delete process.env.EXPO_PUBLIC_SUPABASE_URL;

    await expect(getCurrentSession()).rejects.toThrow(
      "Missing Expo Supabase configuration.",
    );
    expect(mockedCreateClient).not.toHaveBeenCalled();
  });

  it("returns the current session and access token", async () => {
    const session = { access_token: "token-1" };
    const client = mockSupabaseClient(session);

    await expect(getCurrentSession()).resolves.toBe(session);
    await expect(getAccessToken()).resolves.toBe("token-1");

    expect(client.auth.getSession).toHaveBeenCalledTimes(2);
  });

  it("returns null when there is no signed-in session", async () => {
    mockSupabaseClient(null);

    await expect(getCurrentSession()).resolves.toBeNull();
    await expect(getAccessToken()).resolves.toBeNull();
  });

  it("starts Google sign-in and handles the redirect code", async () => {
    const client = mockSupabaseClient();
    mockedOpenAuthSessionAsync.mockResolvedValue({
      type: "success",
      url: "aisleshopper://auth/callback?code=auth-code",
    });

    await signInWithGoogle();

    expect(mockedCreateURL).toHaveBeenCalledWith("auth/callback");
    expect(client.auth.signInWithOAuth).toHaveBeenCalledWith({
      options: {
        redirectTo: "aisleshopper://auth/callback",
        skipBrowserRedirect: true,
      },
      provider: "google",
    });
    expect(mockedOpenAuthSessionAsync).toHaveBeenCalledWith(
      "https://project.supabase.co/auth/v1/authorize",
      "aisleshopper://auth/callback",
    );
    expect(client.auth.exchangeCodeForSession).toHaveBeenCalledWith(
      "auth-code",
    );
  });

  it("stores implicit redirect tokens when present", async () => {
    const client = mockSupabaseClient();

    await handleAuthRedirect(
      "aisleshopper://auth/callback#access_token=access&refresh_token=refresh",
    );

    expect(client.auth.setSession).toHaveBeenCalledWith({
      access_token: "access",
      refresh_token: "refresh",
    });
  });

  it("signs out through Supabase", async () => {
    const client = mockSupabaseClient();

    await signOut();

    expect(client.auth.signOut).toHaveBeenCalled();
  });
});
