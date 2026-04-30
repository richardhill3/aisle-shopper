import { randomUUID } from "node:crypto";
import type {
  ListCapabilities,
  ListUserRole,
  ShoppingItem,
  ShoppingList,
  ShoppingListSummary,
  ShoppingSection,
} from "../../shared/src";
import type { Db } from "./db";
import type { CurrentProfile } from "./auth";
import { oneOrNull, pool, transaction } from "./db";
import { notFound } from "./errors";

type ListRow = {
  id: string;
  name: string;
  owner_profile_id: string | null;
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

function listRole(row: Pick<ListRow, "owner_profile_id">, currentProfile?: CurrentProfile): ListUserRole {
  if (!currentProfile) {
    return "guest";
  }

  return row.owner_profile_id === currentProfile.id ? "owner" : "collaborator";
}

function capabilitiesForRole(role: ListUserRole): ListCapabilities {
  return {
    canDelete: role !== "collaborator",
    canEdit: true,
    canShare: role !== "collaborator",
    canShop: true,
  };
}

function mapSummary(
  row: ListSummaryRow,
  currentProfile?: CurrentProfile,
): ShoppingListSummary {
  const currentUserRole = listRole(row, currentProfile);

  return {
    id: row.id,
    name: row.name,
    sectionCount: Number(row.section_count),
    itemCount: Number(row.item_count),
    ownerProfileId: row.owner_profile_id,
    currentUserRole,
    capabilities: capabilitiesForRole(currentUserRole),
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

export async function listSummaries(
  limit = 50,
  offset = 0,
  currentProfile?: CurrentProfile,
) {
  const params: unknown[] = [limit, offset];
  const accessWhere = currentProfile ? `WHERE ${accessClause("lists", 3)}` : "";

  if (currentProfile) {
    params.push(currentProfile.id);
  }

  const { rows } = await pool.query<ListSummaryRow>(
    `
      SELECT
        lists.id,
        lists.name,
        lists.owner_profile_id,
        lists.created_at,
        lists.updated_at,
        COUNT(DISTINCT sections.id) AS section_count,
        COUNT(items.id) AS item_count
      FROM lists
      LEFT JOIN sections ON sections.list_id = lists.id
      LEFT JOIN items ON items.section_id = sections.id
      ${accessWhere}
      GROUP BY lists.id
      ORDER BY lists.updated_at DESC
      LIMIT $1 OFFSET $2
    `,
    params,
  );

  return rows.map((row) => mapSummary(row, currentProfile));
}

export async function getList(
  id: string,
  db: Db = pool,
  currentProfile?: CurrentProfile,
) {
  const params: unknown[] = [id];
  const accessWhere = currentProfile ? `AND ${accessClause("lists", 2)}` : "";

  if (currentProfile) {
    params.push(currentProfile.id);
  }

  const list = oneOrNull(
    (
      await db.query<ListRow>(
        `
          SELECT id, name, owner_profile_id, created_at, updated_at
          FROM lists
          WHERE id = $1 ${accessWhere}
        `,
        params,
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

  const currentUserRole = listRole(list, currentProfile);

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
    ownerProfileId: list.owner_profile_id,
    currentUserRole,
    capabilities: capabilitiesForRole(currentUserRole),
    createdAt: iso(list.created_at),
    updatedAt: iso(list.updated_at),
  } satisfies ShoppingList;
}

export async function requireList(
  id: string,
  db: Db = pool,
  currentProfile?: CurrentProfile,
) {
  const list = await getList(id, db, currentProfile);

  if (!list) {
    throw notFound("List not found.");
  }

  return list;
}

export async function createList(name: string, currentProfile?: CurrentProfile) {
  const id = randomUUID();

  return transaction(async (client) => {
    await client.query(
      `
        INSERT INTO lists (id, name, owner_profile_id)
        VALUES ($1, $2, $3)
      `,
      [id, name, currentProfile?.id ?? null],
    );

    return requireList(id, client, currentProfile);
  });
}

export async function updateList(
  id: string,
  name: string,
  currentProfile?: CurrentProfile,
) {
  return transaction(async (client) => {
    const params: unknown[] = [id, name];
    const accessWhere = currentProfile ? `AND ${accessClause("lists", 3)}` : "";

    if (currentProfile) {
      params.push(currentProfile.id);
    }

    const result = await client.query(
      `
        UPDATE lists
        SET name = $2, updated_at = NOW()
        WHERE id = $1 ${accessWhere}
      `,
      params,
    );

    if (result.rowCount === 0) {
      throw notFound("List not found.");
    }

    return requireList(id, client, currentProfile);
  });
}

export async function deleteList(id: string, currentProfile?: CurrentProfile) {
  const params: unknown[] = [id];
  const ownerClause = currentProfile ? "AND owner_profile_id = $2" : "";

  if (currentProfile) {
    params.push(currentProfile.id);
  }

  const result = await pool.query(
    `
      DELETE FROM lists
      WHERE id = $1 ${ownerClause}
    `,
    params,
  );

  if (result.rowCount === 0) {
    throw notFound("List not found.");
  }
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
