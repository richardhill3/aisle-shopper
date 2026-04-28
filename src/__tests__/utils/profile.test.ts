import { fetchCurrentProfile, updateCurrentProfile } from "@/utils/profile";
import { apiRequest } from "@/utils/api";

jest.mock("@/utils/api", () => ({
  apiRequest: jest.fn(),
}));

const mockedApiRequest = jest.mocked(apiRequest);

const profile = {
  createdAt: "2026-01-01T00:00:00.000Z",
  displayName: "Ralph",
  email: "ralph@example.com",
  id: "profile-1",
  supabaseUserId: "user-1",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("profile API helpers", () => {
  beforeEach(() => {
    mockedApiRequest.mockReset();
  });

  it("fetches the current profile", async () => {
    mockedApiRequest.mockResolvedValue({ profile });

    await expect(fetchCurrentProfile()).resolves.toBe(profile);

    expect(mockedApiRequest).toHaveBeenCalledWith("/me");
  });

  it("updates the current profile display name", async () => {
    mockedApiRequest.mockResolvedValue({ profile });

    await expect(updateCurrentProfile(" Ralph ")).resolves.toBe(profile);

    expect(mockedApiRequest).toHaveBeenCalledWith("/me", {
      body: JSON.stringify({ displayName: " Ralph " }),
      method: "PATCH",
    });
  });
});
