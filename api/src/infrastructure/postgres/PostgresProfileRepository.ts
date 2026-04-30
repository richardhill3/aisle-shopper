import { randomUUID } from "node:crypto";
import type {
  ProfileRecord,
  ProfileRepository,
} from "../../application/profileUseCases";
import type { Db } from "../../db";
import { oneOrNull, pool } from "../../db";

type ProfileRow = {
  id: string;
  supabase_user_id: string;
  email: string;
  display_name: string | null;
  created_at: Date;
  updated_at: Date;
};

export class PostgresProfileRepository implements ProfileRepository {
  constructor(private readonly db: Db = pool) {}

  async getById(id: string): Promise<ProfileRecord | null> {
    const row = oneOrNull(
      (
        await this.db.query<ProfileRow>(
          `
            SELECT id, supabase_user_id, email, display_name, created_at, updated_at
            FROM profiles
            WHERE id = $1
          `,
          [id],
        )
      ).rows,
    );

    return row ? mapProfile(row) : null;
  }

  async updateDisplayName(
    id: string,
    displayName: string | null,
  ): Promise<ProfileRecord | null> {
    const row = oneOrNull(
      (
        await this.db.query<ProfileRow>(
          `
            UPDATE profiles
            SET display_name = $2, updated_at = NOW()
            WHERE id = $1
            RETURNING id, supabase_user_id, email, display_name, created_at, updated_at
          `,
          [id, displayName],
        )
      ).rows,
    );

    return row ? mapProfile(row) : null;
  }

  async upsertFromVerifiedIdentity(input: {
    supabaseUserId: string;
    email: string;
    displayName: string | null;
  }): Promise<ProfileRecord | null> {
    const row = oneOrNull(
      (
        await this.db.query<ProfileRow>(
          `
            INSERT INTO profiles (id, supabase_user_id, email, display_name)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (supabase_user_id) DO UPDATE
            SET
              email = EXCLUDED.email,
              display_name = COALESCE(profiles.display_name, EXCLUDED.display_name),
              updated_at = NOW()
            RETURNING id, supabase_user_id, email, display_name, created_at, updated_at
          `,
          [randomUUID(), input.supabaseUserId, input.email, input.displayName],
        )
      ).rows,
    );

    return row ? mapProfile(row) : null;
  }
}

function mapProfile(row: ProfileRow): ProfileRecord {
  return {
    id: row.id,
    supabaseUserId: row.supabase_user_id,
    email: row.email,
    displayName: row.display_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
