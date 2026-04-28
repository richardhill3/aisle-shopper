import type { Profile, ProfileResponse } from "@shared";
import { apiRequest } from "@/utils/api";

export async function fetchCurrentProfile(): Promise<Profile> {
  const { profile } = await apiRequest<ProfileResponse>("/me");
  return profile;
}

export async function updateCurrentProfile(
  displayName: string | null,
): Promise<Profile> {
  const { profile } = await apiRequest<ProfileResponse>("/me", {
    body: JSON.stringify({ displayName }),
    method: "PATCH",
  });
  return profile;
}
