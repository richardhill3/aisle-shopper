import type { ListRecord } from "../../application/listReadUseCases";
import type { ItemRepository } from "../../application/itemUseCases";
import type { Db } from "../../db";
import { oneOrNull, pool, transaction } from "../../db";
import { PostgresListReadRepository } from "./PostgresListReadRepository";

type TransactionRunner = <T>(callback: (db: Db) => Promise<T>) => Promise<T>;

type ItemRow = {
  checked: boolean;
  id: string;
  name: string;
};

export class PostgresItemRepository implements ItemRepository {
  constructor(
    private readonly db: Db = pool,
    private readonly runTransaction: TransactionRunner = transaction,
  ) {}

  async addItem(input: {
    actorProfileId: string | null;
    id: string;
    listId: string;
    name: string;
    sectionId: string;
  }): Promise<ListRecord | null> {
    return this.runTransaction(async (db) => {
      const locked = await lockSection(
        db,
        input.listId,
        input.sectionId,
        input.actorProfileId,
      );

      if (!locked) {
        return null;
      }

      const position = await nextItemPosition(db, input.sectionId);

      await db.query(
        `
          INSERT INTO items (id, section_id, name, position)
          VALUES ($1, $2, $3, $4)
        `,
        [input.id, input.sectionId, input.name, position],
      );
      await touchSection(db, input.sectionId);
      await touchList(db, input.listId);

      return requireListRecord(db, input.listId, input.actorProfileId);
    });
  }

  async updateItem(
    listId: string,
    sectionId: string,
    itemId: string,
    updates: { checked?: boolean; name?: string },
    actorProfileId: string | null,
  ): Promise<ListRecord | null> {
    return this.runTransaction(async (db) => {
      const section = await requireSection(db, listId, sectionId, actorProfileId);

      if (!section) {
        return null;
      }

      const current = oneOrNull(
        (
          await db.query<ItemRow>(
            `
              SELECT id, name, checked
              FROM items
              WHERE id = $1 AND section_id = $2
            `,
            [itemId, sectionId],
          )
        ).rows,
      );

      if (!current) {
        return null;
      }

      await db.query(
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
      await touchSection(db, sectionId);
      await touchList(db, listId);

      return requireListRecord(db, listId, actorProfileId);
    });
  }

  async deleteItem(
    listId: string,
    sectionId: string,
    itemId: string,
    actorProfileId: string | null,
  ): Promise<ListRecord | null> {
    return this.runTransaction(async (db) => {
      const section = await requireSection(db, listId, sectionId, actorProfileId);

      if (!section) {
        return null;
      }

      const result = await db.query(
        `
          DELETE FROM items
          WHERE id = $1 AND section_id = $2
        `,
        [itemId, sectionId],
      );

      if (result.rowCount === 0) {
        return null;
      }

      await touchSection(db, sectionId);
      await touchList(db, listId);
      await reindexItems(db, sectionId);

      return requireListRecord(db, listId, actorProfileId);
    });
  }

  async resetCheckedItems(
    listId: string,
    actorProfileId: string | null,
  ): Promise<ListRecord | null> {
    return this.runTransaction(async (db) => {
      const list = await getListRecord(db, listId, actorProfileId);

      if (!list) {
        return null;
      }

      await db.query(
        `
          UPDATE items
          SET checked = FALSE, updated_at = NOW()
          WHERE section_id IN (
            SELECT id FROM sections WHERE list_id = $1
          )
        `,
        [listId],
      );
      await db.query(
        `
          UPDATE sections
          SET updated_at = NOW()
          WHERE list_id = $1
        `,
        [listId],
      );
      await touchList(db, listId);

      return requireListRecord(db, listId, actorProfileId);
    });
  }
}

async function getListRecord(
  db: Db,
  listId: string,
  actorProfileId: string | null,
): Promise<ListRecord | null> {
  return new PostgresListReadRepository(db).getList(listId, actorProfileId);
}

async function requireListRecord(
  db: Db,
  listId: string,
  actorProfileId: string | null,
): Promise<ListRecord> {
  const list = await getListRecord(db, listId, actorProfileId);

  if (!list) {
    throw new Error("Expected list to exist after item write.");
  }

  return list;
}

async function requireSection(
  db: Db,
  listId: string,
  sectionId: string,
  actorProfileId: string | null,
): Promise<boolean> {
  const list = await getListRecord(db, listId, actorProfileId);

  if (!list) {
    return false;
  }

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

  return Boolean(section);
}

async function lockSection(
  db: Db,
  listId: string,
  sectionId: string,
  actorProfileId: string | null,
): Promise<boolean> {
  const params: unknown[] = [listId, sectionId];
  const accessWhere = actorProfileId ? `AND ${accessClause("lists", 3)}` : "";

  if (actorProfileId) {
    params.push(actorProfileId);
  }

  const section = oneOrNull(
    (
      await db.query(
        `
          SELECT sections.id
          FROM sections
          INNER JOIN lists ON lists.id = sections.list_id
          WHERE sections.id = $2
            AND sections.list_id = $1
            ${accessWhere}
          FOR UPDATE
        `,
        params,
      )
    ).rows,
  );

  return Boolean(section);
}

async function nextItemPosition(db: Db, sectionId: string) {
  const result = await db.query<{ next_position: number }>(
    `
      SELECT COALESCE(MAX(position), -1) + 1 AS next_position
      FROM items
      WHERE section_id = $1
    `,
    [sectionId],
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

function accessClause(listAlias: string, profileParamIndex: number) {
  return `(
    ${listAlias}.owner_profile_id = $${profileParamIndex}
    OR EXISTS (
      SELECT 1
      FROM list_memberships
      WHERE list_memberships.list_id = ${listAlias}.id
        AND list_memberships.profile_id = $${profileParamIndex}
    )
  )`;
}
