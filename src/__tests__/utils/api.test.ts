import { apiRequest } from "@/utils/api";
import { getAccessToken, getTestAuthHeaders } from "@/utils/auth";

jest.mock("@/utils/auth", () => ({
  getAccessToken: jest.fn(),
  getTestAuthHeaders: jest.fn(),
}));

const mockedGetAccessToken = jest.mocked(getAccessToken);
const mockedGetTestAuthHeaders = jest.mocked(getTestAuthHeaders);
const mockedFetch = jest.fn();
const expectedApiBaseUrl = (
  process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000"
).replace(/\/$/, "");

describe("apiRequest", () => {
  beforeEach(() => {
    mockedGetAccessToken.mockReset();
    mockedGetTestAuthHeaders.mockReset();
    mockedGetTestAuthHeaders.mockResolvedValue({});
    mockedFetch.mockReset();
    global.fetch = mockedFetch;
  });

  it("adds an authorization header when an access token exists", async () => {
    mockedGetAccessToken.mockResolvedValue("session-token");
    mockedFetch.mockResolvedValue({
      json: jest.fn().mockResolvedValue({ ok: true }),
      ok: true,
      status: 200,
    });

    await expect(apiRequest<{ ok: boolean }>("/lists")).resolves.toEqual({
      ok: true,
    });

    expect(mockedFetch).toHaveBeenCalledWith(
      `${expectedApiBaseUrl}/api/v1/lists`,
      expect.objectContaining({
        headers: expect.objectContaining({
          Accept: "application/json",
          Authorization: "Bearer session-token",
        }),
      }),
    );
  });

  it("omits authorization for guest requests", async () => {
    mockedGetAccessToken.mockResolvedValue(null);
    mockedFetch.mockResolvedValue({
      json: jest.fn().mockResolvedValue({ ok: true }),
      ok: true,
      status: 200,
    });

    await apiRequest("/lists", {
      headers: {
        "X-Request-ID": "request-1",
      },
    });

    expect(mockedFetch).toHaveBeenCalledWith(
      `${expectedApiBaseUrl}/api/v1/lists`,
      expect.objectContaining({
        headers: expect.not.objectContaining({
          Authorization: expect.any(String),
        }),
      }),
    );
    expect(mockedFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          "X-Request-ID": "request-1",
        }),
      }),
    );
  });

  it("adds deterministic test auth headers when a test identity exists", async () => {
    mockedGetAccessToken.mockResolvedValue(null);
    mockedGetTestAuthHeaders.mockResolvedValue({
      "x-test-auth-email": "e2e@example.com",
      "x-test-auth-user-id": "e2e-user",
    });
    mockedFetch.mockResolvedValue({
      json: jest.fn().mockResolvedValue({ ok: true }),
      ok: true,
      status: 200,
    });

    await apiRequest("/lists");

    expect(mockedFetch).toHaveBeenCalledWith(
      `${expectedApiBaseUrl}/api/v1/lists`,
      expect.objectContaining({
        headers: expect.objectContaining({
          "x-test-auth-email": "e2e@example.com",
          "x-test-auth-user-id": "e2e-user",
        }),
      }),
    );
  });
});
