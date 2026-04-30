import { beforeEach, describe, expect, it } from "vitest";
import type {
  ListRecord,
  ListSectionRecord,
} from "../src/application/listReadUseCases";
import {
  addSection,
  deleteSection,
  moveSection,
  updateSection,
  type SectionRepository,
} from "../src/application/sectionUseCases";
import type { IdGenerator } from "../src/application/listWriteUseCases";

class FakeSectionRepository implements SectionRepository {
  lists = new Map<string, ListRecord>();

  async addSection(input: {
    actorProfileId: string | null;
    id: string;
    listId: string;
    name: string;
  }) {
    const current = this.accessibleList(input.listId, input.actorProfileId);

    if (!current) {
      return null;
    }

    const section = sectionRecord({
      id: input.id,
      listId: input.listId,
      name: input.name,
      position: current.sections.length,
    });
    const next = touchList({
      ...current,
      sectionCount: current.sections.length + 1,
      sections: [...current.sections, section],
    });
    this.lists.set(input.listId, next);
    return next;
  }

  async updateSection(
    listId: string,
    sectionId: string,
    name: string,
    actorProfileId: string | null,
  ) {
    const current = this.accessibleList(listId, actorProfileId);

    if (!current) {
      return null;
    }

    const section = current.sections.find((candidate) => candidate.id === sectionId);

    if (!section) {
      return null;
    }

    const next = touchList({
      ...current,
      sections: current.sections.map((candidate) =>
        candidate.id === sectionId
          ? { ...candidate, name, updatedAt: updatedAt }
          : candidate,
      ),
    });
    this.lists.set(listId, next);
    return next;
  }

  async deleteSection(
    listId: string,
    sectionId: string,
    actorProfileId: string | null,
  ) {
    const current = this.accessibleList(listId, actorProfileId);

    if (!current) {
      return null;
    }

    if (!current.sections.some((section) => section.id === sectionId)) {
      return null;
    }

    const sections = current.sections
      .filter((section) => section.id !== sectionId)
      .map((section, position) => ({ ...section, position }));
    const next = touchList({
      ...current,
      sectionCount: sections.length,
      sections,
    });
    this.lists.set(listId, next);
    return next;
  }

  async moveSection(
    listId: string,
    sectionId: string,
    direction: "up" | "down",
    actorProfileId: string | null,
  ) {
    const current = this.accessibleList(listId, actorProfileId);

    if (!current) {
      return null;
    }

    const currentIndex = current.sections.findIndex(
      (section) => section.id === sectionId,
    );

    if (currentIndex < 0) {
      return null;
    }

    const nextIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

    if (nextIndex < 0 || nextIndex >= current.sections.length) {
      return current;
    }

    const sections = [...current.sections];
    const [section] = sections.splice(currentIndex, 1);
    sections.splice(nextIndex, 0, section);

    const next = touchList({
      ...current,
      sections: sections.map((candidate, position) => ({
        ...candidate,
        position,
      })),
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
  randomId: () => "generated-section-id",
};
const owner = { profileId: "owner-profile" };
const collaborator = { profileId: "collab-profile" };
const updatedAt = new Date("2026-01-02T00:00:00.000Z");

describe("section use cases", () => {
  let repository: FakeSectionRepository;

  beforeEach(() => {
    repository = new FakeSectionRepository();
  });

  it("adds a section at the next position for owner-accessible lists", async () => {
    repository.lists.set(
      "list-1",
      listRecord({
        id: "list-1",
        ownerProfileId: owner.profileId,
        sections: [sectionRecord({ id: "existing", position: 0 })],
      }),
    );

    await expect(
      addSection({
        actor: owner,
        idGenerator,
        listId: "list-1",
        name: "Dairy",
        repository,
      }),
    ).resolves.toMatchObject({
      currentUserRole: "owner",
      sections: [
        { id: "existing", position: 0 },
        { id: "generated-section-id", name: "Dairy", position: 1 },
      ],
    });
  });

  it("allows collaborators to rename sections", async () => {
    repository.lists.set(
      "shared-list",
      listRecord({
        id: "shared-list",
        memberProfileId: collaborator.profileId,
        ownerProfileId: owner.profileId,
        sections: [sectionRecord({ id: "section-1", name: "Old name" })],
      }),
    );

    await expect(
      updateSection({
        actor: collaborator,
        listId: "shared-list",
        name: "Produce",
        repository,
        sectionId: "section-1",
      }),
    ).resolves.toMatchObject({
      currentUserRole: "collaborator",
      sections: [{ id: "section-1", name: "Produce" }],
    });
  });

  it("returns null for inaccessible lists or missing sections", async () => {
    repository.lists.set(
      "private-list",
      listRecord({
        id: "private-list",
        ownerProfileId: owner.profileId,
        sections: [sectionRecord({ id: "section-1" })],
      }),
    );

    await expect(
      updateSection({
        actor: { profileId: "other-profile" },
        listId: "private-list",
        name: "Stolen",
        repository,
        sectionId: "section-1",
      }),
    ).resolves.toBeNull();
    await expect(
      deleteSection({
        actor: owner,
        listId: "private-list",
        repository,
        sectionId: "missing-section",
      }),
    ).resolves.toBeNull();
  });

  it("deletes sections and returns reindexed positions", async () => {
    repository.lists.set(
      "list-1",
      listRecord({
        id: "list-1",
        ownerProfileId: owner.profileId,
        sections: [
          sectionRecord({ id: "produce", position: 0 }),
          sectionRecord({ id: "dairy", position: 1 }),
          sectionRecord({ id: "bakery", position: 2 }),
        ],
      }),
    );

    await expect(
      deleteSection({
        actor: owner,
        listId: "list-1",
        repository,
        sectionId: "dairy",
      }),
    ).resolves.toMatchObject({
      sectionCount: 2,
      sections: [
        { id: "produce", position: 0 },
        { id: "bakery", position: 1 },
      ],
    });
  });

  it("moves sections and preserves no-op boundary moves", async () => {
    repository.lists.set(
      "list-1",
      listRecord({
        id: "list-1",
        ownerProfileId: owner.profileId,
        sections: [
          sectionRecord({ id: "produce", position: 0 }),
          sectionRecord({ id: "dairy", position: 1 }),
        ],
      }),
    );

    await expect(
      moveSection({
        actor: owner,
        direction: "up",
        listId: "list-1",
        repository,
        sectionId: "dairy",
      }),
    ).resolves.toMatchObject({
      sections: [
        { id: "dairy", position: 0 },
        { id: "produce", position: 1 },
      ],
    });
    await expect(
      moveSection({
        actor: owner,
        direction: "up",
        listId: "list-1",
        repository,
        sectionId: "dairy",
      }),
    ).resolves.toMatchObject({
      sections: [
        { id: "dairy", position: 0 },
        { id: "produce", position: 1 },
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
    itemCount: 0,
    name: "Groceries",
    ownerProfileId: input.ownerProfileId,
    sectionCount: sections.length,
    sections,
    updatedAt: now,
  };
}

function sectionRecord(input: {
  id: string;
  listId?: string;
  name?: string;
  position?: number;
}): ListSectionRecord {
  const now = new Date("2026-01-01T00:00:00.000Z");

  return {
    createdAt: now,
    id: input.id,
    items: [],
    listId: input.listId ?? "list-1",
    name: input.name ?? input.id,
    position: input.position ?? 0,
    updatedAt: now,
  };
}

function touchList(record: ListRecord): ListRecord {
  return { ...record, updatedAt };
}

function canEdit(record: ListRecord, actorProfileId: string | null) {
  return (
    !actorProfileId ||
    record.ownerProfileId === actorProfileId ||
    record.access.memberProfileId === actorProfileId
  );
}
