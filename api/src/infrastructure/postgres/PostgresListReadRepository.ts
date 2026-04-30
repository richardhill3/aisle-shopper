import type {
  ListItemRecord,
  ListReadRepository,
  ListRecord,
  ListSectionRecord,
  ListSummaryRecord,
} from "../../application/listReadUseCases";
import type { Db } from "../../db";
import { oneOrNull, pool } from "../../db";

type ListRow = {
  id: string;
  name: string;
  owner_profile_id: string | null;
  member_profile_id: string | null;
  created_at: Date;
  updated_at: Date;
};

type ListSummaryRow = ListRow & {
  section_count: string;
  item_count: string;
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

export class PostgresListReadRepository implements ListReadRepository {
  constructor(private readonly db: Db = pool) {}

  async listSummaries(
    limit: number,
    offset: number,
    actorProfileId: string | null,
  ): Promise<ListSummaryRecord[]> {
    const params: unknown[] = [limit, offset];
    const accessJoin = actorProfileId ? membershipJoin(3) : "";
    const accessWhere = actorProfileId ? `WHERE ${accessClause("lists", 3)}` : "";
    const memberProfileSelect = actorProfileId
      ? "list_memberships.profile_id"
      : "NULL::text";
    const membershipGroupBy = actorProfileId ? ", list_memberships.profile_id" : "";

    if (actorProfileId) {
      params.push(actorProfileId);
    }

    const { rows } = await this.db.query<ListSummaryRow>(
      `
        SELECT
          lists.id,
          lists.name,
          lists.owner_profile_id,
          ${memberProfileSelect} AS member_profile_id,
          lists.created_at,
          lists.updated_at,
          COUNT(DISTINCT sections.id) AS section_count,
          COUNT(items.id) AS item_count
        FROM lists
        ${accessJoin}
        LEFT JOIN sections ON sections.list_id = lists.id
        LEFT JOIN items ON items.section_id = sections.id
        ${accessWhere}
        GROUP BY lists.id${membershipGroupBy}
        ORDER BY lists.updated_at DESC
        LIMIT $1 OFFSET $2
      `,
      params,
    );

    return rows.map(mapSummaryRow);
  }

  async getList(
    listId: string,
    actorProfileId: string | null,
  ): Promise<ListRecord | null> {
    const params: unknown[] = [listId];
    const accessJoin = actorProfileId ? membershipJoin(2) : "";
    const accessWhere = actorProfileId ? `AND ${accessClause("lists", 2)}` : "";
    const memberProfileSelect = actorProfileId
      ? "list_memberships.profile_id"
      : "NULL::text";

    if (actorProfileId) {
      params.push(actorProfileId);
    }

    const list = oneOrNull(
      (
        await this.db.query<ListRow>(
          `
            SELECT
              lists.id,
              lists.name,
              lists.owner_profile_id,
              ${memberProfileSelect} AS member_profile_id,
              lists.created_at,
              lists.updated_at
            FROM lists
            ${accessJoin}
            WHERE lists.id = $1 ${accessWhere}
          `,
          params,
        )
      ).rows,
    );

    if (!list) {
      return null;
    }

    const sections = (
      await this.db.query<SectionRow>(
        `
          SELECT id, list_id, name, position, created_at, updated_at
          FROM sections
          WHERE list_id = $1
          ORDER BY position ASC, created_at ASC
        `,
        [listId],
      )
    ).rows;

    const sectionIds = sections.map((section) => section.id);
    const items =
      sectionIds.length === 0
        ? []
        : (
            await this.db.query<ItemRow>(
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
      ...mapSummaryRow({
        ...list,
        item_count: String(items.length),
        section_count: String(sections.length),
      }),
      sections: sections.map((section) =>
        mapSectionRow(
          section,
          items
            .filter((item) => item.section_id === section.id)
            .map(mapItemRow),
        ),
      ),
    };
  }
}

function mapSummaryRow(row: ListSummaryRow): ListSummaryRecord {
  return {
    id: row.id,
    name: row.name,
    ownerProfileId: row.owner_profile_id,
    sectionCount: Number(row.section_count),
    itemCount: Number(row.item_count),
    access: {
      ownerProfileId: row.owner_profile_id,
      memberProfileId: row.member_profile_id,
    },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSectionRow(
  row: SectionRow,
  items: ListItemRecord[],
): ListSectionRecord {
  return {
    id: row.id,
    listId: row.list_id,
    name: row.name,
    position: row.position,
    items,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapItemRow(row: ItemRow): ListItemRecord {
  return {
    id: row.id,
    sectionId: row.section_id,
    name: row.name,
    checked: row.checked,
    position: row.position,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function membershipJoin(profileParamIndex: number) {
  return `
    LEFT JOIN list_memberships
      ON list_memberships.list_id = lists.id
     AND list_memberships.profile_id = $${profileParamIndex}
  `;
}

function accessClause(listAlias: string, profileParamIndex: number) {
  return `(
    ${listAlias}.owner_profile_id = $${profileParamIndex}
    OR list_memberships.profile_id = $${profileParamIndex}
  )`;
}
