import { beforeEach, describe, expect, it } from "vitest";
import {
  createList,
  deleteList,
  updateList,
  type IdGenerator,
  type ListWriteRepository,
} from "../src/application/listWriteUseCases";
import type { ListRecord } from "../src/application/listReadUseCases";

class FakeListWriteRepository implements ListWriteRepository {
  lists = new Map<string, ListRecord>();
  deleted: Array<{ actorProfileId: string | null; listId: string }> = [];

  async createList(input: {
    id: string;
    name: string;
    ownerProfileId: string | null;
  }) {
    const record = listRecord({
      id: input.id,
      name: input.name,
      ownerProfileId: input.ownerProfileId,
      memberProfileId: null,
    });
    this.lists.set(input.id, record);
    return record;
  }

  async updateList(
    listId: string,
    name: string,
    actorProfileId: string | null,
  ) {
    const current = this.lists.get(listId);

    if (!current || !canEdit(current, actorProfileId)) {
      return null;
    }

    const next = { ...current, name, updatedAt: new Date("2026-01-02T00:00:00.000Z") };
    this.lists.set(listId, next);
    return next;
  }

  async deleteList(listId: string, actorProfileId: string | null) {
    const current = this.lists.get(listId);

    if (!current || !canDelete(current, actorProfileId)) {
      return false;
    }

    this.deleted.push({ actorProfileId, listId });
    this.lists.delete(listId);
    return true;
  }
}

const idGenerator: IdGenerator = {
  randomId: () => "generated-list-id",
};
const owner = { profileId: "owner-profile" };
const collaborator = { profileId: "collab-profile" };

describe("list write use cases", () => {
  let repository: FakeListWriteRepository;

  beforeEach(() => {
    repository = new FakeListWriteRepository();
  });

  it("creates authenticated lists owned by the actor", async () => {
    await expect(
      createList({ actor: owner, idGenerator, name: "Groceries", repository }),
    ).resolves.toMatchObject({
      currentUserRole: "owner",
      id: "generated-list-id",
      name: "Groceries",
      ownerProfileId: owner.profileId,
    });
  });

  it("creates transitional guest lists without an owner", async () => {
    await expect(
      createList({ actor: null, idGenerator, name: "Guest list", repository }),
    ).resolves.toMatchObject({
      currentUserRole: "guest",
      ownerProfileId: null,
    });
  });

  it("renames owner and collaborator accessible lists", async () => {
    repository.lists.set(
      "shared-list",
      listRecord({
        id: "shared-list",
        memberProfileId: collaborator.profileId,
        ownerProfileId: owner.profileId,
      }),
    );

    await expect(
      updateList({
        actor: collaborator,
        listId: "shared-list",
        name: "Renamed",
        repository,
      }),
    ).resolves.toMatchObject({
      currentUserRole: "collaborator",
      name: "Renamed",
    });
  });

  it("returns null when renaming an inaccessible list", async () => {
    repository.lists.set(
      "private-list",
      listRecord({ id: "private-list", ownerProfileId: owner.profileId }),
    );

    await expect(
      updateList({
        actor: { profileId: "other-profile" },
        listId: "private-list",
        name: "Stolen",
        repository,
      }),
    ).resolves.toBeNull();
  });

  it("deletes only owner-accessible authenticated lists", async () => {
    repository.lists.set(
      "owner-list",
      listRecord({ id: "owner-list", ownerProfileId: owner.profileId }),
    );
    repository.lists.set(
      "shared-list",
      listRecord({
        id: "shared-list",
        memberProfileId: collaborator.profileId,
        ownerProfileId: owner.profileId,
      }),
    );

    await expect(
      deleteList({ actor: owner, listId: "owner-list", repository }),
    ).resolves.toBe(true);
    await expect(
      deleteList({ actor: collaborator, listId: "shared-list", repository }),
    ).resolves.toBe(false);
  });
});

function listRecord(input: {
  id: string;
  name?: string;
  ownerProfileId: string | null;
  memberProfileId?: string | null;
}): ListRecord {
  const now = new Date("2026-01-01T00:00:00.000Z");

  return {
    access: {
      ownerProfileId: input.ownerProfileId,
      memberProfileId: input.memberProfileId ?? null,
    },
    createdAt: now,
    id: input.id,
    itemCount: 0,
    name: input.name ?? "Groceries",
    ownerProfileId: input.ownerProfileId,
    sectionCount: 0,
    sections: [],
    updatedAt: now,
  };
}

function canEdit(record: ListRecord, actorProfileId: string | null) {
  return (
    !actorProfileId ||
    record.ownerProfileId === actorProfileId ||
    record.access.memberProfileId === actorProfileId
  );
}

function canDelete(record: ListRecord, actorProfileId: string | null) {
  return !actorProfileId || record.ownerProfileId === actorProfileId;
}
