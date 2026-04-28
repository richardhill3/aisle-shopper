import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { oneOrNull, pool } from "./db";
import { unauthorized } from "./errors";

export type CurrentProfile = {
  id: string;
  supabaseUserId: string;
  email: string;
  displayName: string | null;
};

type AuthIdentity = {
  supabaseUserId: string;
  email: string;
  displayName?: string;
};

type ProfileRow = {
  id: string;
  supabase_user_id: string;
  email: string;
  display_name: string | null;
};

declare module "express-serve-static-core" {
  interface Request {
    currentProfile?: CurrentProfile;
  }
}

export async function resolveAuth(
  request: Request,
  _response: Response,
  next: NextFunction,
) {
  try {
    const identity = resolveIdentity(request);

    if (identity) {
      request.currentProfile = await upsertProfile(identity);
    }

    next();
  } catch (error) {
    next(error);
  }
}

function resolveIdentity(request: Request): AuthIdentity | null {
  const testIdentity = resolveTestIdentity(request);

  if (testIdentity) {
    return testIdentity;
  }

  const authorization = request.header("authorization");

  if (!authorization) {
    return null;
  }

  const match = authorization.match(/^Bearer\s+(.+)$/i);

  if (!match) {
    throw unauthorized("Invalid authorization header.");
  }

  return resolveSupabaseJwt(match[1]);
}

function resolveTestIdentity(request: Request): AuthIdentity | null {
  const userId = request.header("x-test-auth-user-id");
  const email = request.header("x-test-auth-email");

  if (!userId && !email) {
    return null;
  }

  if (process.env.NODE_ENV === "production") {
    throw unauthorized("Test authentication is disabled.");
  }

  if (!userId || !email) {
    throw unauthorized("Test authentication requires user id and email.");
  }

  return {
    supabaseUserId: userId,
    email,
    displayName: request.header("x-test-auth-display-name") ?? undefined,
  };
}

function resolveSupabaseJwt(token: string): AuthIdentity {
  const payload = decodeJwtPayload(token);
  const sub = stringClaim(payload.sub);
  const email = stringClaim(payload.email);

  if (!sub || !email) {
    throw unauthorized("Invalid access token.");
  }

  return {
    supabaseUserId: sub,
    email,
    displayName: displayNameClaim(payload),
  };
}

function decodeJwtPayload(token: string): Record<string, unknown> {
  const parts = token.split(".");

  if (parts.length !== 3) {
    throw unauthorized("Invalid access token.");
  }

  try {
    const json = Buffer.from(parts[1], "base64url").toString("utf8");
    const payload = JSON.parse(json) as unknown;

    if (!payload || typeof payload !== "object") {
      throw new Error("JWT payload is not an object.");
    }

    return payload as Record<string, unknown>;
  } catch {
    throw unauthorized("Invalid access token.");
  }
}

function displayNameClaim(payload: Record<string, unknown>) {
  const metadata = payload.user_metadata;

  if (!metadata || typeof metadata !== "object") {
    return undefined;
  }

  const claims = metadata as Record<string, unknown>;
  return stringClaim(claims.full_name) ?? stringClaim(claims.name) ?? undefined;
}

function stringClaim(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

async function upsertProfile(identity: AuthIdentity): Promise<CurrentProfile> {
  const id = randomUUID();
  const email = identity.email.trim().toLowerCase();
  const displayName = identity.displayName?.trim() || null;
  const profile = oneOrNull(
    (
      await pool.query<ProfileRow>(
        `
          INSERT INTO profiles (id, supabase_user_id, email, display_name)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (supabase_user_id) DO UPDATE
          SET
            email = EXCLUDED.email,
            display_name = COALESCE(profiles.display_name, EXCLUDED.display_name),
            updated_at = NOW()
          RETURNING id, supabase_user_id, email, display_name
        `,
        [id, identity.supabaseUserId, email, displayName],
      )
    ).rows,
  );

  if (!profile) {
    throw unauthorized("Unable to resolve current profile.");
  }

  return {
    id: profile.id,
    supabaseUserId: profile.supabase_user_id,
    email: profile.email,
    displayName: profile.display_name,
  };
}
