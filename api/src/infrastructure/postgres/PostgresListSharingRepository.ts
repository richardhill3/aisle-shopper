import type {
  ListMemberRecord,
  ListSharingRepository,
} from "../../application/listSharingUseCases";
import type { ListSharingAccess } from "../../domain";
import type { Db } from "../../db";
import { oneOrNull, pool, transaction } from "../../db";

type TransactionRunner = <T>(callback: (db: Db) => Promise<T>) => Promise<T>;

type AccessRow = {
  owner_profile_id: string | null;
  member_profile_id: string | null;
};

type MemberRow = {
  id: string;
  email: string;
  display_name: string | null;
  created_at: Date;
};

function mapMember(row: MemberRow): ListMemberRecord {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    createdAt: row.created_at,
  };
}

export class PostgresListSharingRepository implements ListSharingRepository {
  constructor(
    private readonly db: Db = pool,
    private readonly runTransaction: TransactionRunner = transaction,
  ) {}

  async transaction<T>(
    callback: (repository: ListSharingRepository) => Promise<T>,
  ): Promise<T> {
    return this.runTransaction((db) =>
      callback(new PostgresListSharingRepository(db, this.runTransaction)),
    );
  }

  async getAccess(
    listId: string,
    actorProfileId: string,
  ): Promise<ListSharingAccess> {
    const row = oneOrNull(
      (
        await this.db.query<AccessRow>(
          `
            SELECT
              lists.owner_profile_id,
              list_memberships.profile_id AS member_profile_id
            FROM lists
            LEFT JOIN list_memberships
              ON list_memberships.list_id = lists.id
             AND list_memberships.profile_id = $2
            WHERE lists.id = $1
          `,
          [listId, actorProfileId],
        )
      ).rows,
    );

    if (!row) {
      return { role: "guest" };
    }

    if (row.owner_profile_id === actorProfileId) {
      return { role: "owner" };
    }

    if (row.member_profile_id === actorProfileId) {
      return { role: "collaborator" };
    }

    return { role: "guest" };
  }

  async listCollaborators(listId: string): Promise<ListMemberRecord[]> {
    const { rows } = await this.db.query<MemberRow>(
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

  async findProfileByEmail(email: string): Promise<ListMemberRecord | null> {
    const row = oneOrNull(
      (
        await this.db.query<MemberRow>(
          `
            SELECT id, email, display_name, created_at
            FROM profiles
            WHERE email = $1
          `,
          [email],
        )
      ).rows,
    );

    return row ? mapMember(row) : null;
  }

  async addCollaborator(
    listId: string,
    profile: ListMemberRecord,
  ): Promise<ListMemberRecord> {
    const row = oneOrNull(
      (
        await this.db.query<MemberRow>(
          `
            INSERT INTO list_memberships (list_id, profile_id)
            VALUES ($1, $2)
            RETURNING
              $2::text AS id,
              $3::text AS email,
              $4::text AS display_name,
              created_at
          `,
          [listId, profile.id, profile.email, profile.displayName],
        )
      ).rows,
    );

    return row ? mapMember(row) : profile;
  }

  async removeCollaborator(listId: string, profileId: string): Promise<void> {
    await this.db.query(
      `
        DELETE FROM list_memberships
        WHERE list_id = $1 AND profile_id = $2
      `,
      [listId, profileId],
    );
  }
}
