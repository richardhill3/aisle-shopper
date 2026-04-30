import type {
  ListRecord,
} from "../../application/listReadUseCases";
import type { ListWriteRepository } from "../../application/listWriteUseCases";
import type { Db } from "../../db";
import { pool, transaction } from "../../db";
import { PostgresListReadRepository } from "./PostgresListReadRepository";

type TransactionRunner = <T>(callback: (db: Db) => Promise<T>) => Promise<T>;

export class PostgresListWriteRepository implements ListWriteRepository {
  constructor(
    private readonly db: Db = pool,
    private readonly runTransaction: TransactionRunner = transaction,
  ) {}

  async createList(input: {
    id: string;
    name: string;
    ownerProfileId: string | null;
  }): Promise<ListRecord> {
    return this.runTransaction(async (db) => {
      await db.query(
        `
          INSERT INTO lists (id, name, owner_profile_id)
          VALUES ($1, $2, $3)
        `,
        [input.id, input.name, input.ownerProfileId],
      );

      return requireListRecord(db, input.id, input.ownerProfileId);
    });
  }

  async updateList(
    listId: string,
    name: string,
    actorProfileId: string | null,
  ): Promise<ListRecord | null> {
    return this.runTransaction(async (db) => {
      const params: unknown[] = [listId, name];
      const accessWhere = actorProfileId ? `AND ${accessClause("lists", 3)}` : "";

      if (actorProfileId) {
        params.push(actorProfileId);
      }

      const result = await db.query(
        `
          UPDATE lists
          SET name = $2, updated_at = NOW()
          WHERE id = $1 ${accessWhere}
        `,
        params,
      );

      if (result.rowCount === 0) {
        return null;
      }

      return requireListRecord(db, listId, actorProfileId);
    });
  }

  async deleteList(
    listId: string,
    actorProfileId: string | null,
  ): Promise<boolean> {
    const params: unknown[] = [listId];
    const ownerClause = actorProfileId ? "AND owner_profile_id = $2" : "";

    if (actorProfileId) {
      params.push(actorProfileId);
    }

    const result = await this.db.query(
      `
        DELETE FROM lists
        WHERE id = $1 ${ownerClause}
      `,
      params,
    );

    return (result.rowCount ?? 0) > 0;
  }
}

async function requireListRecord(
  db: Db,
  listId: string,
  actorProfileId: string | null,
): Promise<ListRecord> {
  const list = await new PostgresListReadRepository(db).getList(
    listId,
    actorProfileId,
  );

  if (!list) {
    throw new Error("Expected list to exist after write.");
  }

  return list;
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
