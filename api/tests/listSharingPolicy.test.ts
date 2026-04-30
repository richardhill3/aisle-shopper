import { describe, expect, it } from "vitest";
import { DomainError } from "../src/domain";
import {
  assertCanAddCollaborator,
  assertCanManageSharing,
  canManageSharing,
  maxListCollaborators,
  type CollaboratorProfile,
  type CurrentActorIdentity,
  type ListSharingAccess,
} from "../src/domain/listSharingPolicy";

const ownerActor: CurrentActorIdentity = {
  profileId: "owner-profile",
};

const ownerAccess: ListSharingAccess = {
  role: "owner",
};

const collaboratorAccess: ListSharingAccess = {
  role: "collaborator",
};

const guestAccess: ListSharingAccess = {
  role: "guest",
};

const targetProfile: CollaboratorProfile = {
  displayName: "Target User",
  email: "target@example.com",
  id: "target-profile",
};

describe("ListSharingPolicy", () => {
  it("allows owners to manage sharing", () => {
    expect(canManageSharing(ownerAccess)).toBe(true);
    expect(() => assertCanManageSharing(ownerAccess)).not.toThrow();
  });

  it("rejects collaborators and guests from managing sharing", () => {
    expect(canManageSharing(collaboratorAccess)).toBe(false);
    expect(canManageSharing(guestAccess)).toBe(false);
    expect(() => assertCanManageSharing(collaboratorAccess)).toThrow(
      new DomainError("forbidden", "Owner access is required."),
    );
    expect(() => assertCanManageSharing(guestAccess)).toThrow(
      new DomainError("forbidden", "Owner access is required."),
    );
  });

  it("allows a new collaborator when the owner manages a list below the limit", () => {
    expect(() =>
      assertCanAddCollaborator({
        actor: ownerActor,
        collaborators: [],
        targetProfile,
      }),
    ).not.toThrow();
  });

  it("rejects unknown target profiles", () => {
    expect(() =>
      assertCanAddCollaborator({
        actor: ownerActor,
        collaborators: [],
        targetProfile: null,
      }),
    ).toThrow(new DomainError("not_found", "Profile not found."));
  });

  it("rejects adding the owner as a collaborator", () => {
    expect(() =>
      assertCanAddCollaborator({
        actor: ownerActor,
        collaborators: [],
        targetProfile: { ...targetProfile, id: ownerActor.profileId },
      }),
    ).toThrow(
      new DomainError("invalid", "Owner cannot be added as a collaborator."),
    );
  });

  it("rejects duplicate collaborators", () => {
    expect(() =>
      assertCanAddCollaborator({
        actor: ownerActor,
        collaborators: [targetProfile],
        targetProfile,
      }),
    ).toThrow(
      new DomainError("conflict", "Profile is already a collaborator."),
    );
  });

  it("rejects lists that already have the maximum collaborator count", () => {
    const collaborators = Array.from({ length: maxListCollaborators }, (_, index) => ({
      displayName: null,
      email: `collab-${index}@example.com`,
      id: `collab-${index}`,
    }));

    expect(() =>
      assertCanAddCollaborator({
        actor: ownerActor,
        collaborators,
        targetProfile,
      }),
    ).toThrow(
      new DomainError("invalid", "Lists can have at most 5 collaborators."),
    );
  });
});
