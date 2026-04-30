import type { ListRecord } from "../../application/listReadUseCases";
import type {
  SectionMoveDirection,
  SectionRepository,
} from "../../application/sectionUseCases";
import type { Db } from "../../db";
import { oneOrNull, pool, transaction } from "../../db";
import { PostgresListReadRepository } from "./PostgresListReadRepository";

type TransactionRunner = <T>(callback: (db: Db) => Promise<T>) => Promise<T>;

type SectionRow = {
  id: string;
  position: number;
};

export class PostgresSectionRepository implements SectionRepository {
  constructor(
    private readonly db: Db = pool,
    private readonly runTransaction: TransactionRunner = transaction,
  ) {}

  async addSection(input: {
    actorProfileId: string | null;
    id: string;
    listId: string;
    name: string;
  }): Promise<ListRecord | null> {
    return this.runTransaction(async (db) => {
      const locked = await lockList(db, input.listId, input.actorProfileId);

      if (!locked) {
        return null;
      }

      const position = await nextSectionPosition(db, input.listId);

      await db.query(
        `
          INSERT INTO sections (id, list_id, name, position)
          VALUES ($1, $2, $3, $4)
        `,
        [input.id, input.listId, input.name, position],
      );
      await touchList(db, input.listId);

      return requireListRecord(db, input.listId, input.actorProfileId);
    });
  }

  async updateSection(
    listId: string,
    sectionId: string,
    name: string,
    actorProfileId: string | null,
  ): Promise<ListRecord | null> {
    return this.runTransaction(async (db) => {
      const list = await getListRecord(db, listId, actorProfileId);

      if (!list) {
        return null;
      }

      const result = await db.query(
        `
          UPDATE sections
          SET name = $3, updated_at = NOW()
          WHERE id = $2 AND list_id = $1
        `,
        [listId, sectionId, name],
      );

      if (result.rowCount === 0) {
        return null;
      }

      await touchList(db, listId);
      return requireListRecord(db, listId, actorProfileId);
    });
  }

  async deleteSection(
    listId: string,
    sectionId: string,
    actorProfileId: string | null,
  ): Promise<ListRecord | null> {
    return this.runTransaction(async (db) => {
      const list = await getListRecord(db, listId, actorProfileId);

      if (!list) {
        return null;
      }

      const result = await db.query(
        `
          DELETE FROM sections
          WHERE id = $2 AND list_id = $1
        `,
        [listId, sectionId],
      );

      if (result.rowCount === 0) {
        return null;
      }

      await touchList(db, listId);
      await reindexSections(db, listId);
      return requireListRecord(db, listId, actorProfileId);
    });
  }

  async moveSection(
    listId: string,
    sectionId: string,
    direction: SectionMoveDirection,
    actorProfileId: string | null,
  ): Promise<ListRecord | null> {
    return this.runTransaction(async (db) => {
      const list = await getListRecord(db, listId, actorProfileId);

      if (!list) {
        return null;
      }

      const sections = (
        await db.query<SectionRow>(
          `
            SELECT id, position
            FROM sections
            WHERE list_id = $1
            ORDER BY position ASC, created_at ASC
          `,
          [listId],
        )
      ).rows;

      const currentIndex = sections.findIndex((section) => section.id === sectionId);

      if (currentIndex < 0) {
        return null;
      }

      const nextIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

      if (nextIndex < 0 || nextIndex >= sections.length) {
        return list;
      }

      const current = sections[currentIndex];
      const next = sections[nextIndex];

      await db.query(
        `
          UPDATE sections
          SET position = -1, updated_at = NOW()
          WHERE id = $1
        `,
        [current.id],
      );
      await db.query(
        `
          UPDATE sections
          SET position = $2, updated_at = NOW()
          WHERE id = $1
        `,
        [next.id, current.position],
      );
      await db.query(
        `
          UPDATE sections
          SET position = $2, updated_at = NOW()
          WHERE id = $1
        `,
        [current.id, next.position],
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
    throw new Error("Expected list to exist after section write.");
  }

  return list;
}

async function lockList(
  db: Db,
  listId: string,
  actorProfileId: string | null,
): Promise<boolean> {
  const params: unknown[] = [listId];
  const accessWhere = actorProfileId ? `AND ${accessClause("lists", 2)}` : "";

  if (actorProfileId) {
    params.push(actorProfileId);
  }

  const list = oneOrNull(
    (
      await db.query(
        `
          SELECT lists.id
          FROM lists
          WHERE lists.id = $1 ${accessWhere}
          FOR UPDATE
        `,
        params,
      )
    ).rows,
  );

  return Boolean(list);
}

async function nextSectionPosition(db: Db, listId: string) {
  const result = await db.query<{ next_position: number }>(
    `
      SELECT COALESCE(MAX(position), -1) + 1 AS next_position
      FROM sections
      WHERE list_id = $1
    `,
    [listId],
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
