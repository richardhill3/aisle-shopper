import { beforeEach, describe, expect, it } from "vitest";
import {
  getList,
  listSummaries,
  recentListSummaries,
  type ListReadRepository,
  type ListRecord,
  type ListSummaryRecord,
} from "../src/application/listReadUseCases";

class FakeListReadRepository implements ListReadRepository {
  summaries: ListSummaryRecord[] = [];
  lists = new Map<string, ListRecord>();
  calls: Array<{ limit: number; offset: number; actorProfileId: string | null }> =
    [];

  async listSummaries(limit: number, offset: number, actorProfileId: string | null) {
    this.calls.push({ actorProfileId, limit, offset });
    return this.summaries.slice(offset, offset + limit);
  }

  async getList(id: string, _actorProfileId: string | null) {
    return this.lists.get(id) ?? null;
  }
}

const now = new Date("2026-01-01T00:00:00.000Z");
const actor = { profileId: "owner-profile" };
const ownerSummary: ListSummaryRecord = {
  access: { memberProfileId: null, ownerProfileId: actor.profileId },
  createdAt: now,
  id: "owner-list",
  itemCount: 2,
  name: "Owner list",
  ownerProfileId: actor.profileId,
  sectionCount: 1,
  updatedAt: now,
};
const collaboratorSummary: ListSummaryRecord = {
  ...ownerSummary,
  access: { memberProfileId: actor.profileId, ownerProfileId: "other-owner" },
  id: "shared-list",
  name: "Shared list",
  ownerProfileId: "other-owner",
};
const guestSummary: ListSummaryRecord = {
  ...ownerSummary,
  access: { memberProfileId: null, ownerProfileId: null },
  id: "guest-list",
  name: "Guest list",
  ownerProfileId: null,
};

describe("list read use cases", () => {
  let repository: FakeListReadRepository;

  beforeEach(() => {
    repository = new FakeListReadRepository();
    repository.summaries = [ownerSummary, collaboratorSummary, guestSummary];
  });

  it("returns list summaries with role and capability metadata", async () => {
    await expect(
      listSummaries({ actor, limit: 10, offset: 0, repository }),
    ).resolves.toMatchObject([
      {
        capabilities: { canDelete: true, canEdit: true, canShare: true, canShop: true },
        currentUserRole: "owner",
        id: "owner-list",
      },
      {
        capabilities: {
          canDelete: false,
          canEdit: true,
          canShare: false,
          canShop: true,
        },
        currentUserRole: "collaborator",
        id: "shared-list",
      },
      {
        currentUserRole: "guest",
        id: "guest-list",
      },
    ]);
    expect(repository.calls).toEqual([
      { actorProfileId: actor.profileId, limit: 10, offset: 0 },
    ]);
  });

  it("uses the recent summary offset", async () => {
    await recentListSummaries({ actor: null, limit: 2, repository });

    expect(repository.calls).toEqual([{ actorProfileId: null, limit: 2, offset: 0 }]);
  });

  it("returns list details with nested sections and items", async () => {
    repository.lists.set("owner-list", {
      ...ownerSummary,
      sections: [
        {
          createdAt: now,
          id: "section-1",
          items: [
            {
              checked: false,
              createdAt: now,
              id: "item-1",
              name: "Milk",
              position: 0,
              sectionId: "section-1",
              updatedAt: now,
            },
          ],
          listId: "owner-list",
          name: "Dairy",
          position: 0,
          updatedAt: now,
        },
      ],
    });

    await expect(
      getList({ actor, listId: "owner-list", repository }),
    ).resolves.toMatchObject({
      currentUserRole: "owner",
      id: "owner-list",
      sections: [
        {
          id: "section-1",
          items: [{ id: "item-1", name: "Milk" }],
        },
      ],
    });
  });

  it("returns null when the repository does not expose the list", async () => {
    await expect(
      getList({ actor, listId: "missing-list", repository }),
    ).resolves.toBeNull();
  });
});
