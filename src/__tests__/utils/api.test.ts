import { apiRequest } from "@/utils/api";
import { getAccessToken } from "@/utils/auth";

jest.mock("@/utils/auth", () => ({
  getAccessToken: jest.fn(),
}));

const mockedGetAccessToken = jest.mocked(getAccessToken);
const mockedFetch = jest.fn();

describe("apiRequest", () => {
  beforeEach(() => {
    mockedGetAccessToken.mockReset();
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
      "http://localhost:3000/api/v1/lists",
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
      "http://localhost:3000/api/v1/lists",
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
});
