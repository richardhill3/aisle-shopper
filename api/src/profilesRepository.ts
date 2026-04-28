import type { Profile } from "../../shared/src";
import type { CurrentProfile } from "./auth";
import { oneOrNull, pool } from "./db";
import { unauthorized } from "./errors";

type ProfileRow = {
  id: string;
  supabase_user_id: string;
  email: string;
  display_name: string | null;
  created_at: Date;
  updated_at: Date;
};

export async function getCurrentProfile(
  currentProfile?: CurrentProfile,
): Promise<Profile> {
  if (!currentProfile) {
    throw unauthorized("Authentication is required.");
  }

  const row = await loadProfile(currentProfile.id);

  if (!row) {
    throw unauthorized("Unable to resolve current profile.");
  }

  return mapProfile(row);
}

export async function updateCurrentProfile(
  displayName: string | null,
  currentProfile?: CurrentProfile,
): Promise<Profile> {
  if (!currentProfile) {
    throw unauthorized("Authentication is required.");
  }

  const row = oneOrNull(
    (
      await pool.query<ProfileRow>(
        `
          UPDATE profiles
          SET display_name = $2, updated_at = NOW()
          WHERE id = $1
          RETURNING id, supabase_user_id, email, display_name, created_at, updated_at
        `,
        [currentProfile.id, displayName],
      )
    ).rows,
  );

  if (!row) {
    throw unauthorized("Unable to resolve current profile.");
  }

  return mapProfile(row);
}

async function loadProfile(id: string) {
  return oneOrNull(
    (
      await pool.query<ProfileRow>(
        `
          SELECT id, supabase_user_id, email, display_name, created_at, updated_at
          FROM profiles
          WHERE id = $1
        `,
        [id],
      )
    ).rows,
  );
}

function mapProfile(row: ProfileRow): Profile {
  return {
    createdAt: row.created_at.toISOString(),
    displayName: row.display_name,
    email: row.email,
    id: row.id,
    supabaseUserId: row.supabase_user_id,
    updatedAt: row.updated_at.toISOString(),
  };
}
