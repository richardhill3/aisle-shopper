import { describe, expect, it } from "vitest";
import { PostgresListSharingRepository } from "../src/infrastructure/postgres/PostgresListSharingRepository";
import type { Db } from "../src/db";

type QueryCall = {
  text: string;
  values?: unknown[];
};

class FakeDb {
  calls: QueryCall[] = [];
  responses: unknown[][] = [];

  async query<T>(text: string, values?: unknown[]) {
    this.calls.push({ text, values });
    return {
      rows: (this.responses.shift() ?? []) as T[],
      rowCount: 0,
    };
  }
}

function asDb(db: FakeDb): Db {
  return db as unknown as Db;
}

const memberRow = {
  id: "profile-1",
  email: "collab@example.com",
  display_name: "Collab",
  created_at: new Date("2026-01-01T00:00:00.000Z"),
};

describe("PostgresListSharingRepository", () => {
  it("loads owner, collaborator, and guest access", async () => {
    const ownerDb = new FakeDb();
    ownerDb.responses.push([{ owner_profile_id: "actor-1", member_profile_id: null }]);
    await expect(
      new PostgresListSharingRepository(asDb(ownerDb)).getAccess("list-1", "actor-1"),
    ).resolves.toEqual({ role: "owner" });

    const collaboratorDb = new FakeDb();
    collaboratorDb.responses.push([
      { owner_profile_id: "owner-1", member_profile_id: "actor-1" },
    ]);
    await expect(
      new PostgresListSharingRepository(asDb(collaboratorDb)).getAccess(
        "list-1",
        "actor-1",
      ),
    ).resolves.toEqual({ role: "collaborator" });

    const guestDb = new FakeDb();
    guestDb.responses.push([]);
    await expect(
      new PostgresListSharingRepository(asDb(guestDb)).getAccess("list-1", "actor-1"),
    ).resolves.toEqual({ role: "guest" });
  });

  it("maps collaborator and profile rows into application records", async () => {
    const db = new FakeDb();
    db.responses.push([memberRow], [memberRow]);
    const repository = new PostgresListSharingRepository(asDb(db));

    await expect(repository.listCollaborators("list-1")).resolves.toEqual([
      {
        createdAt: memberRow.created_at,
        displayName: memberRow.display_name,
        email: memberRow.email,
        id: memberRow.id,
      },
    ]);
    await expect(repository.findProfileByEmail("collab@example.com")).resolves.toEqual({
      createdAt: memberRow.created_at,
      displayName: memberRow.display_name,
      email: memberRow.email,
      id: memberRow.id,
    });
  });

  it("inserts and removes collaborators with the expected parameters", async () => {
    const db = new FakeDb();
    db.responses.push([memberRow], []);
    const repository = new PostgresListSharingRepository(asDb(db));

    await expect(
      repository.addCollaborator("list-1", {
        createdAt: memberRow.created_at,
        displayName: memberRow.display_name,
        email: memberRow.email,
        id: memberRow.id,
      }),
    ).resolves.toMatchObject({
      email: memberRow.email,
      id: memberRow.id,
    });
    await repository.removeCollaborator("list-1", "profile-1");

    expect(db.calls[0]?.values).toEqual([
      "list-1",
      "profile-1",
      "collab@example.com",
      "Collab",
    ]);
    expect(db.calls[1]?.values).toEqual(["list-1", "profile-1"]);
  });

  it("runs callbacks with a transaction-scoped repository", async () => {
    const db = new FakeDb();
    const transactionalDb = new FakeDb();
    let transactionCalled = false;
    const repository = new PostgresListSharingRepository(
      asDb(db),
      async (callback) => {
        transactionCalled = true;
        return callback(asDb(transactionalDb));
      },
    );

    const result = await repository.transaction(async (transactionalRepository) => {
      await transactionalRepository.removeCollaborator("list-1", "profile-1");
      return "done";
    });

    expect(result).toBe("done");
    expect(transactionCalled).toBe(true);
    expect(db.calls).toEqual([]);
    expect(transactionalDb.calls).toHaveLength(1);
  });
});
