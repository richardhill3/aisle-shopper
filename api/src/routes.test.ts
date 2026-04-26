import fs from "node:fs";
import path from "node:path";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "./app";
import { pool } from "./db";

const app = createApp();

async function resetDatabase() {
  await pool.query("TRUNCATE items, sections, lists RESTART IDENTITY CASCADE");
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
});

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
