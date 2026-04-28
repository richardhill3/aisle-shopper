import fs from "node:fs";
import path from "node:path";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { pool } from "../src/db";

const app = createApp();

async function resetDatabase() {
  await pool.query(
    "TRUNCATE items, sections, list_memberships, lists, profiles RESTART IDENTITY CASCADE",
  );
}

beforeAll(async () => {
  const schema = fs.readFileSync(
    path.join(process.cwd(), "api/schema.sql"),
    "utf8",
  );
  await pool.query(schema);
});

beforeEach(async () => {
  await resetDatabase();
});

afterAll(async () => {
  await pool.end();
});

describe("shopping list API", () => {
  it("returns health status", async () => {
    await request(app).get("/api/v1/health").expect(200, { ok: true });
  });

  it("creates, lists, fetches, renames, and deletes a list", async () => {
    const created = await request(app)
      .post("/api/v1/lists")
      .send({ name: "  Groceries  " })
      .expect(201);

    expect(created.body.list).toMatchObject({
      name: "Groceries",
      sections: [],
    });

    const listId = created.body.list.id;

    const summaries = await request(app).get("/api/v1/lists").expect(200);
    expect(summaries.body.lists).toMatchObject([
      {
        id: listId,
        itemCount: 0,
        name: "Groceries",
        sectionCount: 0,
      },
    ]);

    await request(app)
      .patch(`/api/v1/lists/${listId}`)
      .send({ name: "Weekly groceries" })
      .expect(200)
      .expect((response) => {
        expect(response.body.list.name).toBe("Weekly groceries");
      });

    await request(app).get(`/api/v1/lists/${listId}`).expect(200);
    await request(app).delete(`/api/v1/lists/${listId}`).expect(204);
    await request(app).get(`/api/v1/lists/${listId}`).expect(404);
  });

  it("manages section ordering and boundary moves", async () => {
    const listId = await createList("Store");
    const produce = await addSection(listId, "Produce");
    const dairy = await addSection(listId, "Dairy");

    await request(app)
      .patch(`/api/v1/lists/${listId}/sections/${dairy}/position`)
      .send({ direction: "up" })
      .expect(200)
      .expect((response) => {
        expect(
          response.body.list.sections.map(
            (section: { name: string }) => section.name,
          ),
        ).toEqual(["Dairy", "Produce"]);
      });

    await request(app)
      .patch(`/api/v1/lists/${listId}/sections/${dairy}/position`)
      .send({ direction: "up" })
      .expect(200)
      .expect((response) => {
        expect(response.body.list.sections[0].id).toBe(dairy);
      });

    await request(app)
      .patch(`/api/v1/lists/${listId}/sections/${produce}`)
      .send({ name: "Fruit and veg" })
      .expect(200)
      .expect((response) => {
        expect(response.body.list.sections[1].name).toBe("Fruit and veg");
      });
  });

  it("manages items, counts, checked state, reset, and deletion", async () => {
    const listId = await createList("Store");
    const sectionId = await addSection(listId, "Dairy");

    const milk = await request(app)
      .post(`/api/v1/lists/${listId}/sections/${sectionId}/items`)
      .send({ name: "Milk" })
      .expect(201);

    const eggs = await request(app)
      .post(`/api/v1/lists/${listId}/sections/${sectionId}/items`)
      .send({ name: "Eggs" })
      .expect(201);

    const milkId = milk.body.list.sections[0].items[0].id;
    const eggsId = eggs.body.list.sections[0].items[1].id;

    await request(app)
      .patch(`/api/v1/lists/${listId}/sections/${sectionId}/items/${milkId}`)
      .send({ checked: true })
      .expect(200)
      .expect((response) => {
        expect(response.body.list.sections[0].items[0].checked).toBe(true);
      });

    await request(app)
      .patch(`/api/v1/lists/${listId}/sections/${sectionId}/items/${eggsId}`)
      .send({ name: "Large eggs" })
      .expect(200);

    await request(app)
      .get("/api/v1/lists/recent?limit=1")
      .expect(200)
      .expect((response) => {
        expect(response.body.lists[0]).toMatchObject({
          itemCount: 2,
          sectionCount: 1,
        });
      });

    await request(app)
      .post(`/api/v1/lists/${listId}/items/reset-checked`)
      .expect(200)
      .expect((response) => {
        expect(
          response.body.list.sections[0].items.every(
            (item: { checked: boolean }) => !item.checked,
          ),
        ).toBe(true);
      });

    await request(app)
      .delete(`/api/v1/lists/${listId}/sections/${sectionId}/items/${eggsId}`)
      .expect(200)
      .expect((response) => {
        expect(response.body.list.sections[0].items).toHaveLength(1);
      });
  });

  it("assigns item positions safely when adds overlap", async () => {
    const listId = await createList("Store");
    const sectionId = await addSection(listId, "Dairy");

    await Promise.all([
      request(app)
        .post(`/api/v1/lists/${listId}/sections/${sectionId}/items`)
        .send({ name: "Milk" })
        .expect(201),
      request(app)
        .post(`/api/v1/lists/${listId}/sections/${sectionId}/items`)
        .send({ name: "Eggs" })
        .expect(201),
    ]);

    await request(app)
      .get(`/api/v1/lists/${listId}`)
      .expect(200)
      .expect((response) => {
        const items = response.body.list.sections[0].items;
        expect(items).toHaveLength(2);
        expect(items.map((item: { position: number }) => item.position)).toEqual(
          [0, 1],
        );
      });
  });

  it("validates bad input and unknown resources", async () => {
    await request(app).post("/api/v1/lists").send({ name: " " }).expect(400);
    await request(app).get("/api/v1/lists?limit=bad").expect(400);
    await request(app).get("/api/v1/lists/missing").expect(404);

    const listId = await createList("Store");
    await request(app)
      .patch(`/api/v1/lists/${listId}/sections/missing/position`)
      .send({ direction: "sideways" })
      .expect(400);
    await request(app)
      .patch(`/api/v1/lists/${listId}/sections/missing/items/missing`)
      .send({})
      .expect(400);
  });

  it("cascades deletes from sections and lists", async () => {
    const listId = await createList("Store");
    const sectionId = await addSection(listId, "Dairy");
    await addItem(listId, sectionId, "Milk");

    await request(app)
      .delete(`/api/v1/lists/${listId}/sections/${sectionId}`)
      .expect(200)
      .expect((response) => {
        expect(response.body.list.sections).toEqual([]);
      });

    const nextSectionId = await addSection(listId, "Produce");
    await addItem(listId, nextSectionId, "Apples");
    await request(app).delete(`/api/v1/lists/${listId}`).expect(204);

    const counts = await pool.query<{
      items: string;
      lists: string;
      sections: string;
    }>(
      `
        SELECT
          (SELECT COUNT(*) FROM lists) AS lists,
          (SELECT COUNT(*) FROM sections) AS sections,
          (SELECT COUNT(*) FROM items) AS items
      `,
    );

    expect(counts.rows[0]).toEqual({ items: "0", lists: "0", sections: "0" });
  });

  it("scopes authenticated list CRUD to the current owner", async () => {
    const userA = authHeaders("user-a", "UserA@Example.com");
    const userB = authHeaders("user-b", "user-b@example.com");

    const aCreated = await request(app)
      .post("/api/v1/lists")
      .set(userA)
      .send({ name: "A list" })
      .expect(201);
    const bCreated = await request(app)
      .post("/api/v1/lists")
      .set(userB)
      .send({ name: "B list" })
      .expect(201);

    const aListId = aCreated.body.list.id as string;
    const bListId = bCreated.body.list.id as string;

    await request(app)
      .get("/api/v1/lists")
      .set(userA)
      .expect(200)
      .expect((response) => {
        expect(response.body.lists.map((list: { id: string }) => list.id)).toEqual([
          aListId,
        ]);
      });

    await request(app)
      .get("/api/v1/lists/recent")
      .set(userB)
      .expect(200)
      .expect((response) => {
        expect(response.body.lists.map((list: { id: string }) => list.id)).toEqual([
          bListId,
        ]);
      });

    await request(app)
      .get(`/api/v1/lists/${aListId}`)
      .set(userA)
      .expect(200)
      .expect((response) => {
        expect(response.body.list.name).toBe("A list");
      });

    await request(app)
      .patch(`/api/v1/lists/${aListId}`)
      .set(userA)
      .send({ name: "A renamed list" })
      .expect(200)
      .expect((response) => {
        expect(response.body.list.name).toBe("A renamed list");
      });

    await request(app).delete(`/api/v1/lists/${aListId}`).set(userA).expect(204);
    await request(app).get(`/api/v1/lists/${aListId}`).set(userA).expect(404);
  });

  it("hides and denies another authenticated user's owned list", async () => {
    const userA = authHeaders("user-a", "user-a@example.com");
    const userB = authHeaders("user-b", "user-b@example.com");

    const created = await request(app)
      .post("/api/v1/lists")
      .set(userA)
      .send({ name: "Private list" })
      .expect(201);
    const listId = created.body.list.id as string;

    await request(app).get(`/api/v1/lists/${listId}`).set(userB).expect(404);
    await request(app)
      .patch(`/api/v1/lists/${listId}`)
      .set(userB)
      .send({ name: "Stolen" })
      .expect(404);
    await request(app).delete(`/api/v1/lists/${listId}`).set(userB).expect(404);

    const section = await request(app)
      .post(`/api/v1/lists/${listId}/sections`)
      .set(userA)
      .send({ name: "Dairy" })
      .expect(201);
    const sectionId = section.body.list.sections[0].id as string;
    const item = await request(app)
      .post(`/api/v1/lists/${listId}/sections/${sectionId}/items`)
      .set(userA)
      .send({ name: "Milk" })
      .expect(201);
    const itemId = item.body.list.sections[0].items[0].id as string;

    await request(app)
      .post(`/api/v1/lists/${listId}/sections`)
      .set(userB)
      .send({ name: "Produce" })
      .expect(404);
    await request(app)
      .patch(`/api/v1/lists/${listId}/sections/${sectionId}`)
      .set(userB)
      .send({ name: "Cheese" })
      .expect(404);
    await request(app)
      .patch(`/api/v1/lists/${listId}/sections/${sectionId}/items/${itemId}`)
      .set(userB)
      .send({ checked: true })
      .expect(404);
    await request(app)
      .post(`/api/v1/lists/${listId}/items/reset-checked`)
      .set(userB)
      .expect(404);
  });

  it("allows collaborators to read and edit shared lists but not delete them", async () => {
    const owner = authHeaders("owner-user", "owner@example.com");
    const collaborator = authHeaders("collaborator-user", "collab@example.com");

    const ownerList = await request(app)
      .post("/api/v1/lists")
      .set(owner)
      .send({ name: "Shared list" })
      .expect(201);
    const listId = ownerList.body.list.id as string;
    const collaboratorProfileId = await getProfileId(collaborator);
    await addMembership(listId, collaboratorProfileId);

    await request(app)
      .get(`/api/v1/lists/${listId}`)
      .set(collaborator)
      .expect(200)
      .expect((response) => {
        expect(response.body.list.name).toBe("Shared list");
      });

    await request(app)
      .patch(`/api/v1/lists/${listId}`)
      .set(collaborator)
      .send({ name: "Collaborator renamed" })
      .expect(200)
      .expect((response) => {
        expect(response.body.list.name).toBe("Collaborator renamed");
      });

    const section = await request(app)
      .post(`/api/v1/lists/${listId}/sections`)
      .set(collaborator)
      .send({ name: "Produce" })
      .expect(201);
    const sectionId = section.body.list.sections[0].id as string;

    const item = await request(app)
      .post(`/api/v1/lists/${listId}/sections/${sectionId}/items`)
      .set(collaborator)
      .send({ name: "Apples" })
      .expect(201);
    const itemId = item.body.list.sections[0].items[0].id as string;

    await request(app)
      .patch(`/api/v1/lists/${listId}/sections/${sectionId}/items/${itemId}`)
      .set(collaborator)
      .send({ checked: true })
      .expect(200)
      .expect((response) => {
        expect(response.body.list.sections[0].items[0].checked).toBe(true);
      });

    await request(app)
      .post(`/api/v1/lists/${listId}/items/reset-checked`)
      .set(collaborator)
      .expect(200)
      .expect((response) => {
        expect(response.body.list.sections[0].items[0].checked).toBe(false);
      });

    await request(app).delete(`/api/v1/lists/${listId}`).set(collaborator).expect(404);
    await request(app).get(`/api/v1/lists/${listId}`).set(owner).expect(200);
  });

  it("includes owned and shared lists in authenticated summaries only", async () => {
    const owner = authHeaders("summary-owner", "owner@example.com");
    const collaborator = authHeaders("summary-collab", "collab@example.com");
    const unrelated = authHeaders("summary-other", "other@example.com");

    const owned = await request(app)
      .post("/api/v1/lists")
      .set(collaborator)
      .send({ name: "Owned list" })
      .expect(201);
    const shared = await request(app)
      .post("/api/v1/lists")
      .set(owner)
      .send({ name: "Shared list" })
      .expect(201);
    const unrelatedList = await request(app)
      .post("/api/v1/lists")
      .set(unrelated)
      .send({ name: "Unrelated list" })
      .expect(201);

    const collaboratorProfileId = await getProfileId(collaborator);
    await addMembership(shared.body.list.id, collaboratorProfileId);

    await request(app)
      .get("/api/v1/lists")
      .set(collaborator)
      .expect(200)
      .expect((response) => {
        expect(response.body.lists.map((list: { id: string }) => list.id)).toEqual(
          expect.arrayContaining([owned.body.list.id, shared.body.list.id]),
        );
        expect(response.body.lists.map((list: { id: string }) => list.id)).not.toContain(
          unrelatedList.body.list.id,
        );
      });

    await request(app)
      .get("/api/v1/lists/recent")
      .set(collaborator)
      .expect(200)
      .expect((response) => {
        expect(response.body.lists.map((list: { id: string }) => list.id)).toEqual(
          expect.arrayContaining([owned.body.list.id, shared.body.list.id]),
        );
      });
  });

  it("fetches and updates the current authenticated profile", async () => {
    const user = authHeaders(
      "profile-user",
      "Profile.User@Example.com",
      "Initial Name",
    );

    await request(app)
      .get("/api/v1/me")
      .set(user)
      .expect(200)
      .expect((response) => {
        expect(response.body.profile).toMatchObject({
          displayName: "Initial Name",
          email: "profile.user@example.com",
          supabaseUserId: "profile-user",
        });
        expect(response.body.profile.id).toEqual(expect.any(String));
        expect(response.body.profile.createdAt).toEqual(expect.any(String));
        expect(response.body.profile.updatedAt).toEqual(expect.any(String));
        expect(response.body.profile.password).toBeUndefined();
      });

    await request(app)
      .patch("/api/v1/me")
      .set(user)
      .send({ displayName: "  Updated Name  " })
      .expect(200)
      .expect((response) => {
        expect(response.body.profile).toMatchObject({
          displayName: "Updated Name",
          email: "profile.user@example.com",
          supabaseUserId: "profile-user",
        });
      });

    await request(app)
      .get("/api/v1/me")
      .set(authHeaders("profile-user", "PROFILE.USER@EXAMPLE.COM"))
      .expect(200)
      .expect((response) => {
        expect(response.body.profile).toMatchObject({
          displayName: "Updated Name",
          email: "profile.user@example.com",
          supabaseUserId: "profile-user",
        });
      });
  });

  it("rejects unauthenticated profile requests", async () => {
    await request(app).get("/api/v1/me").expect(401);
    await request(app).patch("/api/v1/me").expect(401);
  });
});

function authHeaders(userId: string, email: string, displayName?: string) {
  const headers: Record<string, string> = {
    "x-test-auth-email": email,
    "x-test-auth-user-id": userId,
  };

  if (displayName) {
    headers["x-test-auth-display-name"] = displayName;
  }

  return headers;
}

async function createList(name: string) {
  const response = await request(app).post("/api/v1/lists").send({ name });
  return response.body.list.id as string;
}

async function addSection(listId: string, name: string) {
  const response = await request(app)
    .post(`/api/v1/lists/${listId}/sections`)
    .send({ name });
  return response.body.list.sections.at(-1).id as string;
}

async function addItem(listId: string, sectionId: string, name: string) {
  await request(app)
    .post(`/api/v1/lists/${listId}/sections/${sectionId}/items`)
    .send({ name });
}

async function getProfileId(headers: Record<string, string>) {
  const response = await request(app).get("/api/v1/me").set(headers).expect(200);
  return response.body.profile.id as string;
}

async function addMembership(listId: string, profileId: string) {
  await pool.query(
    `
      INSERT INTO list_memberships (list_id, profile_id)
      VALUES ($1, $2)
    `,
    [listId, profileId],
  );
}
