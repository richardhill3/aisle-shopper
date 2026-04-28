CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  supabase_user_id TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lists (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  owner_profile_id TEXT REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE lists
  ADD COLUMN IF NOT EXISTS owner_profile_id TEXT REFERENCES profiles(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS lists_owner_profile_updated_idx
  ON lists(owner_profile_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS profiles_email_idx ON profiles(email);

CREATE TABLE IF NOT EXISTS list_memberships (
  list_id TEXT NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (list_id, profile_id)
);

CREATE INDEX IF NOT EXISTS list_memberships_profile_list_idx
  ON list_memberships(profile_id, list_id);

CREATE TABLE IF NOT EXISTS sections (
  id TEXT PRIMARY KEY,
  list_id TEXT NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS sections_list_position_idx
  ON sections(list_id, position);

CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY,
  section_id TEXT NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  checked BOOLEAN NOT NULL DEFAULT FALSE,
  position INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS items_section_position_idx
  ON items(section_id, position);

CREATE INDEX IF NOT EXISTS sections_list_id_idx ON sections(list_id);
CREATE INDEX IF NOT EXISTS items_section_id_idx ON items(section_id);
