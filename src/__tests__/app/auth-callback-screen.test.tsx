import { handleAuthRedirect } from "@/utils/auth";
import { render, screen, waitFor } from "@testing-library/react-native";
import * as WebBrowser from "expo-web-browser";
import { router, useLocalSearchParams } from "expo-router";
import AuthCallbackScreen from "../../app/auth/callback";

jest.mock("expo-router", () => ({
  router: {
    replace: jest.fn(),
  },
  useLocalSearchParams: jest.fn(),
}));

jest.mock("expo-web-browser", () => ({
  maybeCompleteAuthSession: jest.fn(),
}));

jest.mock("@/utils/auth", () => ({
  handleAuthRedirect: jest.fn(),
}));

const mockedHandleAuthRedirect = jest.mocked(handleAuthRedirect);
const mockedMaybeCompleteAuthSession = jest.mocked(
  WebBrowser.maybeCompleteAuthSession,
);
const mockedUseLocalSearchParams = jest.mocked(useLocalSearchParams);

describe("AuthCallbackScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseLocalSearchParams.mockReturnValue({ code: "auth-code" });
    mockedHandleAuthRedirect.mockResolvedValue();
  });

  it("completes the auth session and redirects to settings", async () => {
    render(<AuthCallbackScreen />);

    await waitFor(() => {
      expect(mockedHandleAuthRedirect).toHaveBeenCalledWith(
        "aisleshopper://auth/callback?code=auth-code",
      );
      expect(router.replace).toHaveBeenCalledWith("/settings");
    });
    expect(mockedMaybeCompleteAuthSession).not.toHaveBeenCalled();
  });

  it("passes token hash params to the auth utility", async () => {
    mockedUseLocalSearchParams.mockReturnValue({
      "#access_token": "access-token",
      refresh_token: "refresh-token",
    });

    render(<AuthCallbackScreen />);

    await waitFor(() => {
      expect(mockedHandleAuthRedirect).toHaveBeenCalledWith(
        "aisleshopper://auth/callback?refresh_token=refresh-token#access_token=access-token",
      );
    });
  });

  it("shows callback errors instead of navigating away", async () => {
    mockedHandleAuthRedirect.mockRejectedValue(new Error("Invalid callback"));

    render(<AuthCallbackScreen />);

    await waitFor(() => {
      expect(screen.getByText("Invalid callback")).toBeTruthy();
      expect(router.replace).not.toHaveBeenCalled();
    });
  });
});
