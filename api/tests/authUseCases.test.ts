import { describe, expect, it, vi } from "vitest";
import type { CurrentProfile, VerifiedIdentity } from "../src/domain";
import {
  resolveCurrentProfileFromCredential,
  type AuthVerifier,
  type CurrentProfileResolver,
} from "../src/application/authUseCases";
import { unauthorized } from "../src/application";

const currentProfile: CurrentProfile = {
  id: "profile-1",
  supabaseUserId: "user-1",
  email: "user@example.com",
  displayName: "User One",
};

describe("auth use cases", () => {
  it("returns null when no credential is provided", async () => {
    const verifier = new FakeAuthVerifier();
    const profileResolver = new FakeProfileResolver();

    await expect(
      resolveCurrentProfileFromCredential({
        authVerifier: verifier,
        credential: { type: "none" },
        environment: testEnvironment(),
        profileResolver,
      }),
    ).resolves.toBeNull();
    expect(verifier.verify).not.toHaveBeenCalled();
    expect(profileResolver.resolve).not.toHaveBeenCalled();
  });

  it("rejects test auth when the bypass is disabled", async () => {
    await expect(
      resolveCurrentProfileFromCredential({
        authVerifier: new FakeAuthVerifier(),
        credential: {
          type: "test",
          email: "test@example.com",
          supabaseUserId: "test-user",
        },
        environment: testEnvironment({ allowTestAuthBypass: false }),
        profileResolver: new FakeProfileResolver(),
      }),
    ).rejects.toMatchObject({
      code: "unauthorized",
      message: "Test authentication is disabled.",
    });
  });

  it("rejects test auth in production", async () => {
    await expect(
      resolveCurrentProfileFromCredential({
        authVerifier: new FakeAuthVerifier(),
        credential: {
          type: "test",
          email: "test@example.com",
          supabaseUserId: "test-user",
        },
        environment: testEnvironment({ isProduction: true }),
        profileResolver: new FakeProfileResolver(),
      }),
    ).rejects.toMatchObject({
      code: "unauthorized",
      message: "Test authentication is disabled.",
    });
  });

  it("requires both test user id and email", async () => {
    await expect(
      resolveCurrentProfileFromCredential({
        authVerifier: new FakeAuthVerifier(),
        credential: {
          type: "test",
          email: "test@example.com",
          supabaseUserId: undefined,
        },
        environment: testEnvironment(),
        profileResolver: new FakeProfileResolver(),
      }),
    ).rejects.toMatchObject({
      code: "unauthorized",
      message: "Test authentication requires user id and email.",
    });
  });

  it("resolves test auth identity through the current profile resolver", async () => {
    const profileResolver = new FakeProfileResolver();

    await expect(
      resolveCurrentProfileFromCredential({
        authVerifier: new FakeAuthVerifier(),
        credential: {
          type: "test",
          email: "Test@Example.com",
          supabaseUserId: "test-user",
          displayName: "Test User",
        },
        environment: testEnvironment(),
        profileResolver,
      }),
    ).resolves.toEqual(currentProfile);
    expect(profileResolver.resolve).toHaveBeenCalledWith({
      email: "Test@Example.com",
      supabaseUserId: "test-user",
      displayName: "Test User",
    });
  });

  it("resolves bearer auth through the verifier and profile resolver", async () => {
    const identity = {
      email: "verified@example.com",
      supabaseUserId: "verified-user",
    };
    const verifier = new FakeAuthVerifier(identity);
    const profileResolver = new FakeProfileResolver();

    await expect(
      resolveCurrentProfileFromCredential({
        authVerifier: verifier,
        credential: { type: "bearer", token: "header.payload.signature" },
        environment: testEnvironment(),
        profileResolver,
      }),
    ).resolves.toEqual(currentProfile);
    expect(verifier.verify).toHaveBeenCalledWith("header.payload.signature");
    expect(profileResolver.resolve).toHaveBeenCalledWith(identity);
  });

  it("passes verifier failures through", async () => {
    const verifier = new FakeAuthVerifier();
    verifier.verify.mockRejectedValue(unauthorized("Invalid access token."));

    await expect(
      resolveCurrentProfileFromCredential({
        authVerifier: verifier,
        credential: { type: "bearer", token: "bad-token" },
        environment: testEnvironment(),
        profileResolver: new FakeProfileResolver(),
      }),
    ).rejects.toMatchObject({
      code: "unauthorized",
      message: "Invalid access token.",
    });
  });
});

class FakeAuthVerifier implements AuthVerifier {
  readonly verify = vi.fn<(token: string) => Promise<VerifiedIdentity>>();

  constructor(identity?: VerifiedIdentity) {
    this.verify.mockResolvedValue(
      identity ?? {
        email: currentProfile.email,
        supabaseUserId: currentProfile.supabaseUserId,
        displayName: currentProfile.displayName ?? undefined,
      },
    );
  }
}

class FakeProfileResolver implements CurrentProfileResolver {
  readonly resolve =
    vi.fn<(identity: VerifiedIdentity) => Promise<CurrentProfile>>();

  constructor() {
    this.resolve.mockResolvedValue(currentProfile);
  }
}

function testEnvironment(overrides: Partial<{
  allowTestAuthBypass: boolean;
  isProduction: boolean;
}> = {}) {
  return {
    allowTestAuthBypass: true,
    isProduction: false,
    ...overrides,
  };
}
