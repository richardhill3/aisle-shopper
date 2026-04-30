import type {
  CurrentProfile,
  CurrentProfileActorIdentity,
  Profile,
  VerifiedIdentity,
} from "../domain";
import { unauthorized } from "./errors";

export type ProfileRecord = Profile;

export type ProfileRepository = {
  getById(id: string): Promise<ProfileRecord | null>;
  updateDisplayName(
    id: string,
    displayName: string | null,
  ): Promise<ProfileRecord | null>;
  upsertFromVerifiedIdentity(input: {
    supabaseUserId: string;
    email: string;
    displayName: string | null;
  }): Promise<ProfileRecord | null>;
};

export type CurrentProfileInput = {
  actor: CurrentProfileActorIdentity | null;
  repository: ProfileRepository;
};

export type UpdateCurrentProfileInput = CurrentProfileInput & {
  displayName: string | null;
};

export type ResolveVerifiedIdentityProfileInput = {
  identity: VerifiedIdentity;
  repository: ProfileRepository;
};

export async function getCurrentProfile({
  actor,
  repository,
}: CurrentProfileInput): Promise<ProfileRecord> {
  const profileId = requireProfileId(actor);
  return requireProfile(await repository.getById(profileId));
}

export async function updateCurrentProfile({
  actor,
  displayName,
  repository,
}: UpdateCurrentProfileInput): Promise<ProfileRecord> {
  const profileId = requireProfileId(actor);
  return requireProfile(
    await repository.updateDisplayName(profileId, displayName),
  );
}

export async function resolveVerifiedIdentityProfile({
  identity,
  repository,
}: ResolveVerifiedIdentityProfileInput): Promise<CurrentProfile> {
  const profile = await repository.upsertFromVerifiedIdentity({
    supabaseUserId: identity.supabaseUserId,
    email: normalizeEmail(identity.email),
    displayName: normalizeDisplayName(identity.displayName),
  });

  return currentProfileFromRecord(requireProfile(profile));
}

function requireProfileId(actor: CurrentProfileActorIdentity | null): string {
  if (!actor) {
    throw unauthorized("Authentication is required.");
  }

  return actor.profileId;
}

function requireProfile(profile: ProfileRecord | null): ProfileRecord {
  if (!profile) {
    throw unauthorized("Unable to resolve current profile.");
  }

  return profile;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function normalizeDisplayName(displayName?: string) {
  return displayName?.trim() || null;
}

function currentProfileFromRecord(profile: ProfileRecord): CurrentProfile {
  return {
    id: profile.id,
    supabaseUserId: profile.supabaseUserId,
    email: profile.email,
    displayName: profile.displayName,
  };
}
