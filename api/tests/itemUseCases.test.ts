import { beforeEach, describe, expect, it } from "vitest";
import type {
  ListItemRecord,
  ListRecord,
  ListSectionRecord,
} from "../src/application/listReadUseCases";
import type { IdGenerator } from "../src/application/listWriteUseCases";
import {
  addItem,
  deleteItem,
  resetCheckedItems,
  updateItem,
  type ItemRepository,
} from "../src/application/itemUseCases";

class FakeItemRepository implements ItemRepository {
  lists = new Map<string, ListRecord>();

  async addItem(input: {
    actorProfileId: string | null;
    id: string;
    listId: string;
    name: string;
    sectionId: string;
  }) {
    const current = this.accessibleList(input.listId, input.actorProfileId);
    const section = current?.sections.find(
      (candidate) => candidate.id === input.sectionId,
    );

    if (!current || !section) {
      return null;
    }

    const item = itemRecord({
      checked: false,
      id: input.id,
      name: input.name,
      position: section.items.length,
      sectionId: input.sectionId,
    });
    const next = touchList({
      ...current,
      itemCount: current.itemCount + 1,
      sections: current.sections.map((candidate) =>
        candidate.id === input.sectionId
          ? touchSection({ ...candidate, items: [...candidate.items, item] })
          : candidate,
      ),
    });
    this.lists.set(input.listId, next);
    return next;
  }

  async updateItem(
    listId: string,
    sectionId: string,
    itemId: string,
    updates: { checked?: boolean; name?: string },
    actorProfileId: string | null,
  ) {
    const current = this.accessibleList(listId, actorProfileId);
    const section = current?.sections.find((candidate) => candidate.id === sectionId);
    const item = section?.items.find((candidate) => candidate.id === itemId);

    if (!current || !section || !item) {
      return null;
    }

    const next = touchList({
      ...current,
      sections: current.sections.map((candidate) =>
        candidate.id === sectionId
          ? touchSection({
              ...candidate,
              items: candidate.items.map((candidateItem) =>
                candidateItem.id === itemId
                  ? {
                      ...candidateItem,
                      checked: updates.checked ?? candidateItem.checked,
                      name: updates.name ?? candidateItem.name,
                      updatedAt,
                    }
                  : candidateItem,
              ),
            })
          : candidate,
      ),
    });
    this.lists.set(listId, next);
    return next;
  }

  async deleteItem(
    listId: string,
    sectionId: string,
    itemId: string,
    actorProfileId: string | null,
  ) {
    const current = this.accessibleList(listId, actorProfileId);
    const section = current?.sections.find((candidate) => candidate.id === sectionId);

    if (!current || !section || !section.items.some((item) => item.id === itemId)) {
      return null;
    }

    const nextItems = section.items
      .filter((item) => item.id !== itemId)
      .map((item, position) => ({ ...item, position }));
    const next = touchList({
      ...current,
      itemCount: current.itemCount - 1,
      sections: current.sections.map((candidate) =>
        candidate.id === sectionId
          ? touchSection({ ...candidate, items: nextItems })
          : candidate,
      ),
    });
    this.lists.set(listId, next);
    return next;
  }

  async resetCheckedItems(listId: string, actorProfileId: string | null) {
    const current = this.accessibleList(listId, actorProfileId);

    if (!current) {
      return null;
    }

    const next = touchList({
      ...current,
      sections: current.sections.map((section) =>
        touchSection({
          ...section,
          items: section.items.map((item) => ({
            ...item,
            checked: false,
            updatedAt,
          })),
        }),
      ),
    });
    this.lists.set(listId, next);
    return next;
  }

  private accessibleList(listId: string, actorProfileId: string | null) {
    const current = this.lists.get(listId);

    if (!current || !canEdit(current, actorProfileId)) {
      return null;
    }

    return current;
  }
}

const idGenerator: IdGenerator = {
  randomId: () => "generated-item-id",
};
const owner = { profileId: "owner-profile" };
const collaborator = { profileId: "collab-profile" };
const updatedAt = new Date("2026-01-02T00:00:00.000Z");

describe("item use cases", () => {
  let repository: FakeItemRepository;

  beforeEach(() => {
    repository = new FakeItemRepository();
  });

  it("adds an item at the next position for editable sections", async () => {
    repository.lists.set(
      "list-1",
      listRecord({
        id: "list-1",
        ownerProfileId: owner.profileId,
        sections: [
          sectionRecord({
            id: "section-1",
            items: [itemRecord({ id: "milk", position: 0 })],
          }),
        ],
      }),
    );

    await expect(
      addItem({
        actor: owner,
        idGenerator,
        listId: "list-1",
        name: "Eggs",
        repository,
        sectionId: "section-1",
      }),
    ).resolves.toMatchObject({
      currentUserRole: "owner",
      sections: [
        {
          id: "section-1",
          items: [
            { id: "milk", position: 0 },
            { id: "generated-item-id", name: "Eggs", position: 1 },
          ],
        },
      ],
    });
  });

  it("allows collaborators to update item name and checked state", async () => {
    repository.lists.set(
      "shared-list",
      listRecord({
        id: "shared-list",
        memberProfileId: collaborator.profileId,
        ownerProfileId: owner.profileId,
        sections: [
          sectionRecord({
            id: "section-1",
            items: [itemRecord({ checked: false, id: "item-1", name: "Milk" })],
          }),
        ],
      }),
    );

    await expect(
      updateItem({
        actor: collaborator,
        listId: "shared-list",
        repository,
        sectionId: "section-1",
        itemId: "item-1",
        updates: { checked: true, name: "Oat milk" },
      }),
    ).resolves.toMatchObject({
      currentUserRole: "collaborator",
      sections: [
        {
          items: [{ checked: true, id: "item-1", name: "Oat milk" }],
        },
      ],
    });
  });

  it("returns null for inaccessible lists, missing sections, or missing items", async () => {
    repository.lists.set(
      "private-list",
      listRecord({
        id: "private-list",
        ownerProfileId: owner.profileId,
        sections: [
          sectionRecord({
            id: "section-1",
            items: [itemRecord({ id: "item-1" })],
          }),
        ],
      }),
    );

    await expect(
      addItem({
        actor: { profileId: "other-profile" },
        idGenerator,
        listId: "private-list",
        name: "Eggs",
        repository,
        sectionId: "section-1",
      }),
    ).resolves.toBeNull();
    await expect(
      updateItem({
        actor: owner,
        listId: "private-list",
        repository,
        sectionId: "missing-section",
        itemId: "item-1",
        updates: { checked: true },
      }),
    ).resolves.toBeNull();
    await expect(
      deleteItem({
        actor: owner,
        listId: "private-list",
        repository,
        sectionId: "section-1",
        itemId: "missing-item",
      }),
    ).resolves.toBeNull();
  });

  it("deletes items and returns reindexed positions", async () => {
    repository.lists.set(
      "list-1",
      listRecord({
        id: "list-1",
        ownerProfileId: owner.profileId,
        sections: [
          sectionRecord({
            id: "section-1",
            items: [
              itemRecord({ id: "milk", position: 0 }),
              itemRecord({ id: "eggs", position: 1 }),
              itemRecord({ id: "yogurt", position: 2 }),
            ],
          }),
        ],
      }),
    );

    await expect(
      deleteItem({
        actor: owner,
        listId: "list-1",
        repository,
        sectionId: "section-1",
        itemId: "eggs",
      }),
    ).resolves.toMatchObject({
      itemCount: 2,
      sections: [
        {
          items: [
            { id: "milk", position: 0 },
            { id: "yogurt", position: 1 },
          ],
        },
      ],
    });
  });

  it("resets checked items across a list", async () => {
    repository.lists.set(
      "list-1",
      listRecord({
        id: "list-1",
        ownerProfileId: owner.profileId,
        sections: [
          sectionRecord({
            id: "dairy",
            items: [itemRecord({ checked: true, id: "milk" })],
          }),
          sectionRecord({
            id: "produce",
            items: [itemRecord({ checked: true, id: "apples" })],
          }),
        ],
      }),
    );

    await expect(
      resetCheckedItems({
        actor: owner,
        listId: "list-1",
        repository,
      }),
    ).resolves.toMatchObject({
      sections: [
        { items: [{ checked: false, id: "milk" }] },
        { items: [{ checked: false, id: "apples" }] },
      ],
    });
  });
});

function listRecord(input: {
  id: string;
  memberProfileId?: string | null;
  ownerProfileId: string | null;
  sections?: ListSectionRecord[];
}): ListRecord {
  const now = new Date("2026-01-01T00:00:00.000Z");
  const sections = input.sections ?? [];

  return {
    access: {
      memberProfileId: input.memberProfileId ?? null,
      ownerProfileId: input.ownerProfileId,
    },
    createdAt: now,
    id: input.id,
    itemCount: sections.reduce((count, section) => count + section.items.length, 0),
    name: "Groceries",
    ownerProfileId: input.ownerProfileId,
    sectionCount: sections.length,
    sections,
    updatedAt: now,
  };
}

function sectionRecord(input: {
  id: string;
  items?: ListItemRecord[];
  listId?: string;
  name?: string;
  position?: number;
}): ListSectionRecord {
  const now = new Date("2026-01-01T00:00:00.000Z");

  return {
    createdAt: now,
    id: input.id,
    items: input.items ?? [],
    listId: input.listId ?? "list-1",
    name: input.name ?? input.id,
    position: input.position ?? 0,
    updatedAt: now,
  };
}

function itemRecord(input: {
  checked?: boolean;
  id: string;
  name?: string;
  position?: number;
  sectionId?: string;
}): ListItemRecord {
  const now = new Date("2026-01-01T00:00:00.000Z");

  return {
    checked: input.checked ?? false,
    createdAt: now,
    id: input.id,
    name: input.name ?? input.id,
    position: input.position ?? 0,
    sectionId: input.sectionId ?? "section-1",
    updatedAt: now,
  };
}

function touchList(record: ListRecord): ListRecord {
  return { ...record, updatedAt };
}

function touchSection(record: ListSectionRecord): ListSectionRecord {
  return { ...record, updatedAt };
}

function canEdit(record: ListRecord, actorProfileId: string | null) {
  return (
    !actorProfileId ||
    record.ownerProfileId === actorProfileId ||
    record.access.memberProfileId === actorProfileId
  );
}
