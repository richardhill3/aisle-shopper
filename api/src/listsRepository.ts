import { randomUUID } from "node:crypto";
import type {
  ListMember,
  ShoppingItem,
  ShoppingList,
  ShoppingListSummary,
  ShoppingSection,
} from "../../shared/src";
import type { Db } from "./db";
import type { CurrentProfile } from "./auth";
import { oneOrNull, pool, transaction } from "./db";
import { forbidden, invalidRequest, notFound, unauthorized } from "./errors";

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

type ListMemberRow = {
  id: string;
  email: string;
  display_name: string | null;
  created_at: Date;
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

function mapMember(row: ListMemberRow): ListMember {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    createdAt: iso(row.created_at),
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

  return rows.map(mapSummary);
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
          SELECT id, name, created_at, updated_at
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

export async function addSection(
  listId: string,
  name: string,
  currentProfile?: CurrentProfile,
) {
  const id = randomUUID();

  return transaction(async (client) => {
    await lockList(client, listId, currentProfile);
    const position = await nextPosition(client, "sections", "list_id", listId);

    await client.query(
      `
        INSERT INTO sections (id, list_id, name, position)
        VALUES ($1, $2, $3, $4)
      `,
      [id, listId, name, position],
    );
    await touchList(client, listId);

    return requireList(listId, client, currentProfile);
  });
}

export async function updateSection(
  listId: string,
  sectionId: string,
  name: string,
  currentProfile?: CurrentProfile,
) {
  return transaction(async (client) => {
    await requireList(listId, client, currentProfile);

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
    return requireList(listId, client, currentProfile);
  });
}

export async function deleteSection(
  listId: string,
  sectionId: string,
  currentProfile?: CurrentProfile,
) {
  return transaction(async (client) => {
    await requireList(listId, client, currentProfile);

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
    return requireList(listId, client, currentProfile);
  });
}

export async function moveSection(
  listId: string,
  sectionId: string,
  direction: "up" | "down",
  currentProfile?: CurrentProfile,
) {
  return transaction(async (client) => {
    await requireList(listId, client, currentProfile);

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
      return requireList(listId, client, currentProfile);
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

    return requireList(listId, client, currentProfile);
  });
}

export async function addItem(
  listId: string,
  sectionId: string,
  name: string,
  currentProfile?: CurrentProfile,
) {
  const id = randomUUID();

  return transaction(async (client) => {
    await lockSection(client, listId, sectionId, currentProfile);
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

    return requireList(listId, client, currentProfile);
  });
}

export async function updateItem(
  listId: string,
  sectionId: string,
  itemId: string,
  updates: { checked?: boolean; name?: string },
  currentProfile?: CurrentProfile,
) {
  return transaction(async (client) => {
    await requireSection(client, listId, sectionId, currentProfile);

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

    return requireList(listId, client, currentProfile);
  });
}

export async function deleteItem(
  listId: string,
  sectionId: string,
  itemId: string,
  currentProfile?: CurrentProfile,
) {
  return transaction(async (client) => {
    await requireSection(client, listId, sectionId, currentProfile);
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

    return requireList(listId, client, currentProfile);
  });
}

export async function resetCheckedItems(
  listId: string,
  currentProfile?: CurrentProfile,
) {
  return transaction(async (client) => {
    await requireList(listId, client, currentProfile);

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

    return requireList(listId, client, currentProfile);
  });
}

export async function listMembers(
  listId: string,
  currentProfile?: CurrentProfile,
) {
  await requireOwnerAccess(listId, currentProfile);

  const { rows } = await pool.query<ListMemberRow>(
    `
      SELECT
        profiles.id,
        profiles.email,
        profiles.display_name,
        list_memberships.created_at
      FROM list_memberships
      INNER JOIN profiles ON profiles.id = list_memberships.profile_id
      WHERE list_memberships.list_id = $1
      ORDER BY list_memberships.created_at ASC, profiles.email ASC
    `,
    [listId],
  );

  return rows.map(mapMember);
}

export async function addListMember(
  listId: string,
  email: string,
  currentProfile?: CurrentProfile,
) {
  return transaction(async (client) => {
    await requireOwnerAccess(listId, currentProfile, client);

    const profile = oneOrNull(
      (
        await client.query<{
          id: string;
          email: string;
          display_name: string | null;
        }>(
          `
            SELECT id, email, display_name
            FROM profiles
            WHERE email = $1
          `,
          [email],
        )
      ).rows,
    );

    if (!profile) {
      throw invalidRequest("Profile not found.");
    }

    if (profile.id === currentProfile?.id) {
      throw invalidRequest("Owner cannot be added as a collaborator.");
    }

    const existing = oneOrNull(
      (
        await client.query(
          `
            SELECT profile_id
            FROM list_memberships
            WHERE list_id = $1 AND profile_id = $2
          `,
          [listId, profile.id],
        )
      ).rows,
    );

    if (existing) {
      throw invalidRequest("Profile is already a collaborator.");
    }

    const count = oneOrNull(
      (
        await client.query<{ count: string }>(
          `
            SELECT COUNT(*) AS count
            FROM list_memberships
            WHERE list_id = $1
          `,
          [listId],
        )
      ).rows,
    );

    if (Number(count?.count ?? 0) >= 5) {
      throw invalidRequest("Lists can have at most 5 collaborators.");
    }

    const member = oneOrNull(
      (
        await client.query<ListMemberRow>(
          `
            INSERT INTO list_memberships (list_id, profile_id)
            VALUES ($1, $2)
            RETURNING
              $2::text AS id,
              $3::text AS email,
              $4::text AS display_name,
              created_at
          `,
          [listId, profile.id, profile.email, profile.display_name],
        )
      ).rows,
    );

    if (!member) {
      throw invalidRequest("Unable to add collaborator.");
    }

    return mapMember(member);
  });
}

export async function removeListMember(
  listId: string,
  profileId: string,
  currentProfile?: CurrentProfile,
) {
  await requireOwnerAccess(listId, currentProfile);

  await pool.query(
    `
      DELETE FROM list_memberships
      WHERE list_id = $1 AND profile_id = $2
    `,
    [listId, profileId],
  );
}

async function requireSection(
  db: Db,
  listId: string,
  sectionId: string,
  currentProfile?: CurrentProfile,
) {
  await requireList(listId, db, currentProfile);

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

async function requireOwnerAccess(
  listId: string,
  currentProfile?: CurrentProfile,
  db: Db = pool,
) {
  if (!currentProfile) {
    throw unauthorized("Authentication is required.");
  }

  const list = oneOrNull(
    (
      await db.query(
        `
          SELECT id
          FROM lists
          WHERE id = $1 AND owner_profile_id = $2
        `,
        [listId, currentProfile.id],
      )
    ).rows,
  );

  if (!list) {
    throw forbidden("Owner access is required.");
  }
}

async function lockList(
  db: Db,
  listId: string,
  currentProfile?: CurrentProfile,
) {
  const params: unknown[] = [listId];
  const accessWhere = currentProfile ? `AND ${accessClause("lists", 2)}` : "";

  if (currentProfile) {
    params.push(currentProfile.id);
  }

  const list = oneOrNull(
    (
      await db.query(
        `
          SELECT id
          FROM lists
          WHERE id = $1 ${accessWhere}
          FOR UPDATE
        `,
        params,
      )
    ).rows,
  );

  if (!list) {
    throw notFound("List not found.");
  }
}

async function lockSection(
  db: Db,
  listId: string,
  sectionId: string,
  currentProfile?: CurrentProfile,
) {
  const params: unknown[] = [listId, sectionId];
  const accessWhere = currentProfile ? `AND ${accessClause("lists", 3)}` : "";

  if (currentProfile) {
    params.push(currentProfile.id);
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
