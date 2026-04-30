import { conflict, forbidden, invalid, notFound } from "./errors";

export const maxListCollaborators = 5;

export type ListSharingRole = "owner" | "collaborator" | "guest";

export type ListSharingAccess = {
  role: ListSharingRole;
};

export type CurrentActorIdentity = {
  profileId: string;
};

export type CollaboratorProfile = {
  id: string;
  email: string;
  displayName: string | null;
};

export type AddCollaboratorPolicyInput = {
  actor: CurrentActorIdentity;
  collaborators: readonly CollaboratorProfile[];
  targetProfile: CollaboratorProfile | null;
};

export function canManageSharing(access: ListSharingAccess): boolean {
  return access.role === "owner";
}

export function assertCanManageSharing(access: ListSharingAccess): void {
  if (!canManageSharing(access)) {
    throw forbidden("Owner access is required.");
  }
}

export function assertCanAddCollaborator(
  input: AddCollaboratorPolicyInput,
): asserts input is AddCollaboratorPolicyInput & {
  targetProfile: CollaboratorProfile;
} {
  const { actor, collaborators, targetProfile } = input;

  if (!targetProfile) {
    throw notFound("Profile not found.");
  }

  if (targetProfile.id === actor.profileId) {
    throw invalid("Owner cannot be added as a collaborator.");
  }

  if (
    collaborators.some((collaborator) => collaborator.id === targetProfile.id)
  ) {
    throw conflict("Profile is already a collaborator.");
  }

  if (collaborators.length >= maxListCollaborators) {
    throw invalid("Lists can have at most 5 collaborators.");
  }
}
