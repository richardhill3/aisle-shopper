import { randomUUID } from "node:crypto";
import type {
  ShoppingItem,
  ShoppingList,
  ShoppingListSummary,
  ShoppingSection,
} from "../../shared/src";
import type { Db } from "./db";
import { oneOrNull, pool, transaction } from "./db";
import { notFound } from "./errors";

type ListRow = {
  id: string;
  name: string;
  created_at: Date;
  updated_at: Date;
};

type SectionRow = {
  id: string;
  list_id: string;
  name: string;
  position: number;
  created_at: Date;
  updated_at: Date;
};

type ItemRow = {
  id: string;
  section_id: string;
  name: string;
  checked: boolean;
  position: number;
  created_at: Date;
  updated_at: Date;
};

type ListSummaryRow = ListRow & {
  section_count: string;
  item_count: string;
};

function iso(value: Date) {
  return value.toISOString();
}

function mapSummary(row: ListSummaryRow): ShoppingListSummary {
  return {
    id: row.id,
    name: row.name,
    sectionCount: Number(row.section_count),
    itemCount: Number(row.item_count),
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  };
}

function mapItem(row: ItemRow): ShoppingItem {
  return {
    id: row.id,
    sectionId: row.section_id,
    name: row.name,
    checked: row.checked,
    position: row.position,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  };
}

function mapSection(row: SectionRow, items: ShoppingItem[]): ShoppingSection {
  return {
    id: row.id,
    listId: row.list_id,
    name: row.name,
    position: row.position,
    items,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  };
}

export async function listSummaries(limit = 50, offset = 0) {
  const { rows } = await pool.query<ListSummaryRow>(
    `
      SELECT
        lists.id,
        lists.name,
        lists.created_at,
        lists.updated_at,
        COUNT(DISTINCT sections.id) AS section_count,
        COUNT(items.id) AS item_count
      FROM lists
      LEFT JOIN sections ON sections.list_id = lists.id
      LEFT JOIN items ON items.section_id = sections.id
      GROUP BY lists.id
      ORDER BY lists.updated_at DESC
      LIMIT $1 OFFSET $2
    `,
    [limit, offset],
  );

  return rows.map(mapSummary);
}

export async function getList(id: string, db: Db = pool) {
  const list = oneOrNull(
    (
      await db.query<ListRow>(
        `
          SELECT id, name, created_at, updated_at
          FROM lists
          WHERE id = $1
        `,
        [id],
      )
    ).rows,
  );

  if (!list) {
    return null;
  }

  const sections = (
    await db.query<SectionRow>(
      `
        SELECT id, list_id, name, position, created_at, updated_at
        FROM sections
        WHERE list_id = $1
        ORDER BY position ASC, created_at ASC
      `,
      [id],
    )
  ).rows;

  const sectionIds = sections.map((section) => section.id);
  const items =
    sectionIds.length === 0
      ? []
      : (
          await db.query<ItemRow>(
            `
              SELECT id, section_id, name, checked, position, created_at, updated_at
              FROM items
              WHERE section_id = ANY($1::text[])
              ORDER BY position ASC, created_at ASC
            `,
            [sectionIds],
          )
        ).rows;

  return {
    id: list.id,
    name: list.name,
    sections: sections.map((section) =>
      mapSection(
        section,
        items
          .filter((item) => item.section_id === section.id)
          .map((item) => mapItem(item)),
      ),
    ),
    createdAt: iso(list.created_at),
    updatedAt: iso(list.updated_at),
  } satisfies ShoppingList;
}

export async function requireList(id: string, db: Db = pool) {
  const list = await getList(id, db);

  if (!list) {
    throw notFound("List not found.");
  }

  return list;
}

export async function createList(name: string) {
  const id = randomUUID();

  return transaction(async (client) => {
    await client.query(
      `
        INSERT INTO lists (id, name)
        VALUES ($1, $2)
      `,
      [id, name],
    );

    return requireList(id, client);
  });
}

export async function updateList(id: string, name: string) {
  return transaction(async (client) => {
    const result = await client.query(
      `
        UPDATE lists
        SET name = $2, updated_at = NOW()
        WHERE id = $1
      `,
      [id, name],
    );

    if (result.rowCount === 0) {
      throw notFound("List not found.");
    }

    return requireList(id, client);
  });
}

export async function deleteList(id: string) {
  const result = await pool.query(
    `
      DELETE FROM lists
      WHERE id = $1
    `,
    [id],
  );

  if (result.rowCount === 0) {
    throw notFound("List not found.");
  }
}

export async function addSection(listId: string, name: string) {
  const id = randomUUID();

  return transaction(async (client) => {
    await lockList(client, listId);
    const position = await nextPosition(client, "sections", "list_id", listId);

    await client.query(
      `
        INSERT INTO sections (id, list_id, name, position)
        VALUES ($1, $2, $3, $4)
      `,
      [id, listId, name, position],
    );
    await touchList(client, listId);

    return requireList(listId, client);
  });
}

export async function updateSection(
  listId: string,
  sectionId: string,
  name: string,
) {
  return transaction(async (client) => {
    const result = await client.query(
      `
        UPDATE sections
        SET name = $3, updated_at = NOW()
        WHERE id = $2 AND list_id = $1
      `,
      [listId, sectionId, name],
    );

    if (result.rowCount === 0) {
      throw notFound("Section not found.");
    }

    await touchList(client, listId);
    return requireList(listId, client);
  });
}

export async function deleteSection(listId: string, sectionId: string) {
  return transaction(async (client) => {
    const result = await client.query(
      `
        DELETE FROM sections
        WHERE id = $2 AND list_id = $1
      `,
      [listId, sectionId],
    );

    if (result.rowCount === 0) {
      throw notFound("Section not found.");
    }

    await touchList(client, listId);
    await reindexSections(client, listId);
    return requireList(listId, client);
  });
}

export async function moveSection(
  listId: string,
  sectionId: string,
  direction: "up" | "down",
) {
  return transaction(async (client) => {
    const sections = (
      await client.query<SectionRow>(
        `
          SELECT id, list_id, name, position, created_at, updated_at
          FROM sections
          WHERE list_id = $1
          ORDER BY position ASC, created_at ASC
        `,
        [listId],
      )
    ).rows;

    const currentIndex = sections.findIndex(
      (section) => section.id === sectionId,
    );

    if (currentIndex < 0) {
      throw notFound("Section not found.");
    }

    const nextIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

    if (nextIndex < 0 || nextIndex >= sections.length) {
      return requireList(listId, client);
    }

    const current = sections[currentIndex];
    const next = sections[nextIndex];

    await client.query(
      `
        UPDATE sections
        SET position = -1, updated_at = NOW()
        WHERE id = $1
      `,
      [current.id],
    );
    await client.query(
      `
        UPDATE sections
        SET position = $2, updated_at = NOW()
        WHERE id = $1
      `,
      [next.id, current.position],
    );
    await client.query(
      `
        UPDATE sections
        SET position = $2, updated_at = NOW()
        WHERE id = $1
      `,
      [current.id, next.position],
    );
    await touchList(client, listId);

    return requireList(listId, client);
  });
}

export async function addItem(listId: string, sectionId: string, name: string) {
  const id = randomUUID();

  return transaction(async (client) => {
    await lockSection(client, listId, sectionId);
    const position = await nextPosition(
      client,
      "items",
      "section_id",
      sectionId,
    );

    await client.query(
      `
        INSERT INTO items (id, section_id, name, position)
        VALUES ($1, $2, $3, $4)
      `,
      [id, sectionId, name, position],
    );
    await touchSection(client, sectionId);
    await touchList(client, listId);

    return requireList(listId, client);
  });
}

export async function updateItem(
  listId: string,
  sectionId: string,
  itemId: string,
  updates: { checked?: boolean; name?: string },
) {
  return transaction(async (client) => {
    await requireSection(client, listId, sectionId);

    const current = oneOrNull(
      (
        await client.query<ItemRow>(
          `
            SELECT id, section_id, name, checked, position, created_at, updated_at
            FROM items
            WHERE id = $1 AND section_id = $2
          `,
          [itemId, sectionId],
        )
      ).rows,
    );

    if (!current) {
      throw notFound("Item not found.");
    }

    await client.query(
      `
        UPDATE items
        SET name = $3, checked = $4, updated_at = NOW()
        WHERE id = $1 AND section_id = $2
      `,
      [
        itemId,
        sectionId,
        updates.name ?? current.name,
        updates.checked ?? current.checked,
      ],
    );
    await touchSection(client, sectionId);
    await touchList(client, listId);

    return requireList(listId, client);
  });
}

export async function deleteItem(
  listId: string,
  sectionId: string,
  itemId: string,
) {
  return transaction(async (client) => {
    await requireSection(client, listId, sectionId);
    const result = await client.query(
      `
        DELETE FROM items
        WHERE id = $1 AND section_id = $2
      `,
      [itemId, sectionId],
    );

    if (result.rowCount === 0) {
      throw notFound("Item not found.");
    }

    await touchSection(client, sectionId);
    await touchList(client, listId);
    await reindexItems(client, sectionId);

    return requireList(listId, client);
  });
}

export async function resetCheckedItems(listId: string) {
  return transaction(async (client) => {
    await requireList(listId, client);

    await client.query(
      `
        UPDATE items
        SET checked = FALSE, updated_at = NOW()
        WHERE section_id IN (
          SELECT id FROM sections WHERE list_id = $1
        )
      `,
      [listId],
    );
    await client.query(
      `
        UPDATE sections
        SET updated_at = NOW()
        WHERE list_id = $1
      `,
      [listId],
    );
    await touchList(client, listId);

    return requireList(listId, client);
  });
}

async function requireSection(db: Db, listId: string, sectionId: string) {
  const section = oneOrNull(
    (
      await db.query(
        `
          SELECT id
          FROM sections
          WHERE id = $2 AND list_id = $1
        `,
        [listId, sectionId],
      )
    ).rows,
  );

  if (!section) {
    throw notFound("Section not found.");
  }
}

async function lockList(db: Db, listId: string) {
  const list = oneOrNull(
    (
      await db.query(
        `
          SELECT id
          FROM lists
          WHERE id = $1
          FOR UPDATE
        `,
        [listId],
      )
    ).rows,
  );

  if (!list) {
    throw notFound("List not found.");
  }
}

async function lockSection(db: Db, listId: string, sectionId: string) {
  const section = oneOrNull(
    (
      await db.query(
        `
          SELECT id
          FROM sections
          WHERE id = $2 AND list_id = $1
          FOR UPDATE
        `,
        [listId, sectionId],
      )
    ).rows,
  );

  if (!section) {
    throw notFound("Section not found.");
  }
}

async function nextPosition(
  db: Db,
  table: "items" | "sections",
  column: "list_id" | "section_id",
  id: string,
) {
  const result = await db.query<{ next_position: number }>(
    `
      SELECT COALESCE(MAX(position), -1) + 1 AS next_position
      FROM ${table}
      WHERE ${column} = $1
    `,
    [id],
  );

  return result.rows[0]?.next_position ?? 0;
}

async function touchList(db: Db, listId: string) {
  await db.query(
    `
      UPDATE lists
      SET updated_at = NOW()
      WHERE id = $1
    `,
    [listId],
  );
}

async function touchSection(db: Db, sectionId: string) {
  await db.query(
    `
      UPDATE sections
      SET updated_at = NOW()
      WHERE id = $1
    `,
    [sectionId],
  );
}

async function reindexSections(db: Db, listId: string) {
  await db.query(
    `
      WITH ordered AS (
        SELECT id, ROW_NUMBER() OVER (ORDER BY position ASC, created_at ASC) - 1 AS next_position
        FROM sections
        WHERE list_id = $1
      )
      UPDATE sections
      SET position = ordered.next_position
      FROM ordered
      WHERE sections.id = ordered.id
    `,
    [listId],
  );
}

async function reindexItems(db: Db, sectionId: string) {
  await db.query(
    `
      WITH ordered AS (
        SELECT id, ROW_NUMBER() OVER (ORDER BY position ASC, created_at ASC) - 1 AS next_position
        FROM items
        WHERE section_id = $1
      )
      UPDATE items
      SET position = ordered.next_position
      FROM ordered
      WHERE items.id = ordered.id
    `,
    [sectionId],
  );
}
