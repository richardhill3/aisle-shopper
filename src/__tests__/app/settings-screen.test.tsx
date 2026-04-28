import { getCurrentSession, signInWithGoogle, signOut } from "@/utils/auth";
import { fetchCurrentProfile, updateCurrentProfile } from "@/utils/profile";
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import { router, useFocusEffect } from "expo-router";
import { useEffect } from "react";
import { Alert } from "react-native";
import SettingsScreen from "../../app/settings";

jest.mock("expo-router", () => ({
  router: {
    back: jest.fn(),
  },
  useFocusEffect: jest.fn(),
}));

jest.mock("@/utils/auth", () => ({
  getCurrentSession: jest.fn(),
  signInWithGoogle: jest.fn(),
  signOut: jest.fn(),
}));

jest.mock("@/utils/profile", () => ({
  fetchCurrentProfile: jest.fn(),
  updateCurrentProfile: jest.fn(),
}));

const mockedGetCurrentSession = jest.mocked(getCurrentSession);
const mockedSignInWithGoogle = jest.mocked(signInWithGoogle);
const mockedSignOut = jest.mocked(signOut);
const mockedFetchCurrentProfile = jest.mocked(fetchCurrentProfile);
const mockedUpdateCurrentProfile = jest.mocked(updateCurrentProfile);
const mockedUseFocusEffect = jest.mocked(useFocusEffect);

const signedInSession = {
  access_token: "token-1",
  expires_at: 1,
  expires_in: 3600,
  refresh_token: "refresh-token",
  token_type: "bearer",
  user: { id: "user-1" },
};

const profile = {
  createdAt: "2026-01-01T00:00:00.000Z",
  displayName: "Ralph",
  email: "ralph@example.com",
  id: "profile-1",
  supabaseUserId: "user-1",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("SettingsScreen account section", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseFocusEffect.mockImplementation((callback: () => void) => {
      useEffect(callback, [callback]);
    });
  });

  it("shows Google sign-in controls for guests", async () => {
    mockedGetCurrentSession.mockResolvedValue(null);

    render(<SettingsScreen />);

    await waitFor(() => {
      expect(screen.getByText("Sign in with Google")).toBeTruthy();
    });
    expect(screen.getByText("Color palette")).toBeTruthy();
    expect(mockedFetchCurrentProfile).not.toHaveBeenCalled();
  });

  it("signs in and refreshes the signed-in profile", async () => {
    mockedGetCurrentSession
      .mockResolvedValueOnce(null)
      .mockResolvedValue(signedInSession as never);
    mockedSignInWithGoogle.mockResolvedValue();
    mockedFetchCurrentProfile.mockResolvedValue(profile);

    render(<SettingsScreen />);

    await waitFor(() => {
      expect(screen.getByText("Sign in with Google")).toBeTruthy();
    });

    mockedGetCurrentSession.mockResolvedValue(signedInSession as never);
    fireEvent.press(screen.getByText("Sign in with Google"));

    await waitFor(() => {
      expect(mockedSignInWithGoogle).toHaveBeenCalled();
      expect(screen.getByText("ralph@example.com")).toBeTruthy();
    });
  }, 10000);

  it("shows signed-in account identity", async () => {
    mockedGetCurrentSession.mockResolvedValue(signedInSession as never);
    mockedFetchCurrentProfile.mockResolvedValue(profile);

    render(<SettingsScreen />);

    await waitFor(() => {
      expect(screen.getByText("ralph@example.com")).toBeTruthy();
      expect(screen.getByDisplayValue("Ralph")).toBeTruthy();
    });
  });

  it("saves display-name changes", async () => {
    const updatedProfile = { ...profile, displayName: "Ralph H" };
    const alertSpy = jest.spyOn(Alert, "alert");
    mockedGetCurrentSession.mockResolvedValue(signedInSession as never);
    mockedFetchCurrentProfile.mockResolvedValue(profile);
    mockedUpdateCurrentProfile.mockResolvedValue(updatedProfile);

    render(<SettingsScreen />);

    await waitFor(() => {
      expect(screen.getByDisplayValue("Ralph")).toBeTruthy();
    });

    fireEvent.changeText(screen.getByDisplayValue("Ralph"), " Ralph H ");
    fireEvent.press(screen.getByText("Save name"));

    await waitFor(() => {
      expect(mockedUpdateCurrentProfile).toHaveBeenCalledWith("Ralph H");
      expect(screen.getByDisplayValue("Ralph H")).toBeTruthy();
      expect(alertSpy).toHaveBeenCalledWith(
        "Profile saved",
        "Your display name was updated.",
      );
    });
  });

  it("signs out and returns to guest state", async () => {
    mockedGetCurrentSession.mockResolvedValue(signedInSession as never);
    mockedFetchCurrentProfile.mockResolvedValue(profile);
    mockedSignOut.mockResolvedValue();

    render(<SettingsScreen />);

    await waitFor(() => {
      expect(screen.getByText("Sign out")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("Sign out"));

    await waitFor(() => {
      expect(mockedSignOut).toHaveBeenCalled();
      expect(screen.getByText("Sign in with Google")).toBeTruthy();
    });
  });

  it("navigates back from the header control", async () => {
    mockedGetCurrentSession.mockResolvedValue(null);

    render(<SettingsScreen />);

    await waitFor(() => {
      expect(screen.getByText("Sign in with Google")).toBeTruthy();
    });
    fireEvent.press(screen.getByLabelText("Go back"));

    expect(router.back).toHaveBeenCalled();
  });
});
