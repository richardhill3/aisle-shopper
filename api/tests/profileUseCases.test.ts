import { describe, expect, it } from "vitest";
import {
  getCurrentProfile,
  resolveVerifiedIdentityProfile,
  updateCurrentProfile,
  type ProfileRecord,
  type ProfileRepository,
} from "../src/application/profileUseCases";

const initialProfile: ProfileRecord = {
  id: "profile-1",
  supabaseUserId: "supabase-user-1",
  email: "user@example.com",
  displayName: "Existing Name",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

describe("profile use cases", () => {
  it("requires an authenticated actor to fetch the current profile", async () => {
    const repository = new FakeProfileRepository([initialProfile]);

    await expect(
      getCurrentProfile({ actor: null, repository }),
    ).rejects.toMatchObject({
      code: "unauthorized",
      message: "Authentication is required.",
    });
  });

  it("loads the current profile by actor profile id", async () => {
    const repository = new FakeProfileRepository([initialProfile]);

    await expect(
      getCurrentProfile({
        actor: { profileId: "profile-1" },
        repository,
      }),
    ).resolves.toEqual(initialProfile);
  });

  it("rejects a missing current profile", async () => {
    const repository = new FakeProfileRepository();

    await expect(
      getCurrentProfile({
        actor: { profileId: "missing-profile" },
        repository,
      }),
    ).rejects.toMatchObject({
      code: "unauthorized",
      message: "Unable to resolve current profile.",
    });
  });

  it("updates the current profile display name", async () => {
    const repository = new FakeProfileRepository([initialProfile]);

    const profile = await updateCurrentProfile({
      actor: { profileId: "profile-1" },
      displayName: "Updated Name",
      repository,
    });

    expect(profile).toMatchObject({
      id: "profile-1",
      displayName: "Updated Name",
    });
  });

  it("resolves a verified identity into a normalized current profile", async () => {
    const repository = new FakeProfileRepository();

    const profile = await resolveVerifiedIdentityProfile({
      identity: {
        supabaseUserId: "Supabase-User",
        email: " USER@Example.COM ",
        displayName: " New User ",
      },
      repository,
    });

    expect(profile).toMatchObject({
      supabaseUserId: "Supabase-User",
      email: "user@example.com",
      displayName: "New User",
    });
  });

  it("preserves an existing display name when resolving a verified identity", async () => {
    const repository = new FakeProfileRepository([initialProfile]);

    const profile = await resolveVerifiedIdentityProfile({
      identity: {
        supabaseUserId: "supabase-user-1",
        email: "updated@example.com",
        displayName: "Incoming Name",
      },
      repository,
    });

    expect(profile).toMatchObject({
      id: "profile-1",
      email: "updated@example.com",
      displayName: "Existing Name",
    });
  });
});

class FakeProfileRepository implements ProfileRepository {
  private readonly profiles = new Map<string, ProfileRecord>();

  constructor(profiles: ProfileRecord[] = []) {
    for (const profile of profiles) {
      this.profiles.set(profile.id, profile);
    }
  }

  async getById(id: string): Promise<ProfileRecord | null> {
    return this.profiles.get(id) ?? null;
  }

  async updateDisplayName(
    id: string,
    displayName: string | null,
  ): Promise<ProfileRecord | null> {
    const existing = this.profiles.get(id);

    if (!existing) {
      return null;
    }

    const updated = {
      ...existing,
      displayName,
      updatedAt: new Date("2026-01-02T00:00:00.000Z"),
    };
    this.profiles.set(id, updated);
    return updated;
  }

  async upsertFromVerifiedIdentity(input: {
    supabaseUserId: string;
    email: string;
    displayName: string | null;
  }): Promise<ProfileRecord | null> {
    const existing = [...this.profiles.values()].find(
      (profile) => profile.supabaseUserId === input.supabaseUserId,
    );

    if (existing) {
      const updated = {
        ...existing,
        email: input.email,
        displayName: existing.displayName ?? input.displayName,
        updatedAt: new Date("2026-01-02T00:00:00.000Z"),
      };
      this.profiles.set(updated.id, updated);
      return updated;
    }

    const created = {
      id: "created-profile",
      supabaseUserId: input.supabaseUserId,
      email: input.email,
      displayName: input.displayName,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    };
    this.profiles.set(created.id, created);
    return created;
  }
}
