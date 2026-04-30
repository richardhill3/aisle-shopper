import type { NextFunction, Request, Response } from "express";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { CurrentProfile } from "./domain";
import { unauthorized } from "./errors";
import { resolveCurrentProfile } from "./main/profile";

export type { CurrentProfile } from "./domain";

type AuthIdentity = {
  supabaseUserId: string;
  email: string;
  displayName?: string;
};

type SupabaseAuthConfig = {
  anonKey: string;
  url: string;
};

let supabaseAuthClient: SupabaseClient | null = null;
let supabaseAuthClientConfigKey: string | null = null;

declare module "express-serve-static-core" {
  interface Request {
    currentProfile?: CurrentProfile;
  }
}

export function resetSupabaseAuthClientForTests() {
  supabaseAuthClient = null;
  supabaseAuthClientConfigKey = null;
}

export async function resolveAuth(
  request: Request,
  _response: Response,
  next: NextFunction,
) {
  try {
    const identity = await resolveIdentity(request);

    if (identity) {
      request.currentProfile = await resolveCurrentProfile(identity);
    }

    next();
  } catch (error) {
    next(error);
  }
}

async function resolveIdentity(request: Request): Promise<AuthIdentity | null> {
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

  if (
    process.env.NODE_ENV === "production" ||
    process.env.API_ENABLE_TEST_AUTH_BYPASS !== "true"
  ) {
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

async function resolveSupabaseJwt(token: string): Promise<AuthIdentity> {
  assertJwtShape(token);

  const config = getSupabaseAuthConfig();
  const { data, error } = await getVerifiedClaims(token, config);

  if (error || !data?.claims) {
    throw unauthorized("Invalid access token.");
  }

  const claims = data.claims as Record<string, unknown>;
  const issuer = stringClaim(claims.iss);
  const sub = stringClaim(claims.sub);
  const email = stringClaim(claims.email);

  if (issuer !== expectedIssuer(config.url)) {
    throw unauthorized("Invalid access token.");
  }

  if (!sub || !email) {
    throw unauthorized("Invalid access token.");
  }

  return {
    supabaseUserId: sub,
    email,
    displayName: displayNameClaim(claims),
  };
}

function assertJwtShape(token: string) {
  const parts = token.split(".");

  if (parts.length !== 3) {
    throw unauthorized("Invalid access token.");
  }

  return parts;
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

function getSupabaseAuthClient(config: SupabaseAuthConfig) {
  const configKey = `${config.url}:${config.anonKey}`;

  if (supabaseAuthClient && supabaseAuthClientConfigKey === configKey) {
    return supabaseAuthClient;
  }

  supabaseAuthClient = createClient(config.url, config.anonKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
  supabaseAuthClientConfigKey = configKey;

  return supabaseAuthClient;
}

async function getVerifiedClaims(token: string, config: SupabaseAuthConfig) {
  try {
    return await getSupabaseAuthClient(config).auth.getClaims(token);
  } catch {
    throw unauthorized("Invalid access token.");
  }
}

function getSupabaseAuthConfig(): SupabaseAuthConfig {
  const url =
    process.env.SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
  const anonKey =
    process.env.SUPABASE_ANON_KEY ??
    process.env.SUPABASE_PUBLISHABLE_KEY ??
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
    "";

  if (!url || !anonKey) {
    throw unauthorized("Supabase authentication is not configured.");
  }

  return {
    anonKey,
    url: url.replace(/\/$/, ""),
  };
}

function expectedIssuer(supabaseUrl: string) {
  return `${supabaseUrl}/auth/v1`;
}
