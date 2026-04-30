import { beforeEach, describe, expect, it } from "vitest";
import { ApplicationError } from "../src/application";
import { DomainError } from "../src/domain";
import {
  addListMember,
  listMembers,
  removeListMember,
  type ListMemberRecord,
  type ListSharingRepository,
} from "../src/application/listSharingUseCases";

class FakeListSharingRepository implements ListSharingRepository {
  access = new Map<string, "owner" | "collaborator" | "guest">();
  profiles = new Map<string, ListMemberRecord>();
  members = new Map<string, ListMemberRecord[]>();
  removed: Array<{ listId: string; profileId: string }> = [];
  transactionCount = 0;

  async transaction<T>(
    callback: (repository: ListSharingRepository) => Promise<T>,
  ): Promise<T> {
    this.transactionCount += 1;
    return callback(this);
  }

  async getAccess(_listId: string, actorProfileId: string) {
    return { role: this.access.get(actorProfileId) ?? "guest" };
  }

  async listCollaborators(listId: string) {
    return this.members.get(listId) ?? [];
  }

  async findProfileByEmail(email: string) {
    return this.profiles.get(email) ?? null;
  }

  async addCollaborator(listId: string, profile: ListMemberRecord) {
    const nextMembers = [...(this.members.get(listId) ?? []), profile];
    this.members.set(listId, nextMembers);
    return profile;
  }

  async removeCollaborator(listId: string, profileId: string) {
    this.removed.push({ listId, profileId });
    this.members.set(
      listId,
      (this.members.get(listId) ?? []).filter((member) => member.id !== profileId),
    );
  }
}

const listId = "list-1";
const owner = { profileId: "owner-profile" };
const collaborator = {
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  displayName: "Collaborator",
  email: "collab@example.com",
  id: "collab-profile",
};

describe("list sharing use cases", () => {
  let repository: FakeListSharingRepository;

  beforeEach(() => {
    repository = new FakeListSharingRepository();
    repository.access.set(owner.profileId, "owner");
    repository.profiles.set(collaborator.email, collaborator);
  });

  it("lists members for owners", async () => {
    repository.members.set(listId, [collaborator]);

    await expect(listMembers({ actor: owner, listId, repository })).resolves.toEqual([
      collaborator,
    ]);
  });

  it("adds collaborators for owners", async () => {
    await expect(
      addListMember({
        actor: owner,
        email: " Collab@Example.com ",
        listId,
        repository,
      }),
    ).resolves.toEqual(collaborator);
    await expect(listMembers({ actor: owner, listId, repository })).resolves.toEqual([
      collaborator,
    ]);
    expect(repository.transactionCount).toBe(1);
  });

  it("removes collaborators for owners", async () => {
    repository.members.set(listId, [collaborator]);

    await removeListMember({
      actor: owner,
      listId,
      profileId: collaborator.id,
      repository,
    });

    expect(repository.removed).toEqual([{ listId, profileId: collaborator.id }]);
    await expect(listMembers({ actor: owner, listId, repository })).resolves.toEqual(
      [],
    );
  });

  it("rejects unauthenticated guests", async () => {
    await expect(
      listMembers({ actor: null, listId, repository }),
    ).rejects.toThrow(new ApplicationError("unauthorized", "Authentication is required."));
  });

  it("rejects collaborator access", async () => {
    const actor = { profileId: "collaborator-profile" };
    repository.access.set(actor.profileId, "collaborator");

    await expect(
      addListMember({
        actor,
        email: collaborator.email,
        listId,
        repository,
      }),
    ).rejects.toThrow(new DomainError("forbidden", "Owner access is required."));
  });

  it("rejects unknown target profiles", async () => {
    await expect(
      addListMember({
        actor: owner,
        email: "missing@example.com",
        listId,
        repository,
      }),
    ).rejects.toThrow(new DomainError("not_found", "Profile not found."));
  });

  it("rejects adding the owner as a collaborator", async () => {
    repository.profiles.set("owner@example.com", {
      ...collaborator,
      email: "owner@example.com",
      id: owner.profileId,
    });

    await expect(
      addListMember({
        actor: owner,
        email: "owner@example.com",
        listId,
        repository,
      }),
    ).rejects.toThrow(
      new DomainError("invalid", "Owner cannot be added as a collaborator."),
    );
  });

  it("rejects duplicate members", async () => {
    repository.members.set(listId, [collaborator]);

    await expect(
      addListMember({
        actor: owner,
        email: collaborator.email,
        listId,
        repository,
      }),
    ).rejects.toThrow(
      new DomainError("conflict", "Profile is already a collaborator."),
    );
  });

  it("rejects over-limit lists", async () => {
    repository.members.set(
      listId,
      Array.from({ length: 5 }, (_, index) => ({
        ...collaborator,
        email: `collab-${index}@example.com`,
        id: `collab-${index}`,
      })),
    );

    await expect(
      addListMember({
        actor: owner,
        email: collaborator.email,
        listId,
        repository,
      }),
    ).rejects.toThrow(
      new DomainError("invalid", "Lists can have at most 5 collaborators."),
    );
  });
});
