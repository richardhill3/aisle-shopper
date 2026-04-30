import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { AuthVerifier } from "../../application/authUseCases";
import { unauthorized } from "../../application/errors";
import type { VerifiedIdentity } from "../../domain";

type SupabaseAuthConfig = {
  anonKey: string;
  url: string;
};

let supabaseAuthClient: SupabaseClient | null = null;
let supabaseAuthClientConfigKey: string | null = null;

export class SupabaseAuthVerifier implements AuthVerifier {
  async verify(token: string): Promise<VerifiedIdentity> {
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
}

export function resetSupabaseAuthClientForTests() {
  supabaseAuthClient = null;
  supabaseAuthClientConfigKey = null;
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
