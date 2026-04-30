import type { CurrentProfile, VerifiedIdentity } from "../domain";
import { unauthorized } from "./errors";

export type AuthCredential =
  | { type: "none" }
  | { type: "bearer"; token: string }
  | {
      type: "test";
      supabaseUserId: string | undefined;
      email: string | undefined;
      displayName?: string;
    };

export type AuthEnvironment = {
  allowTestAuthBypass: boolean;
  isProduction: boolean;
};

export type AuthVerifier = {
  verify(token: string): Promise<VerifiedIdentity>;
};

export type CurrentProfileResolver = {
  resolve(identity: VerifiedIdentity): Promise<CurrentProfile>;
};

export type ResolveCurrentProfileFromCredentialInput = {
  authVerifier: AuthVerifier;
  credential: AuthCredential;
  environment: AuthEnvironment;
  profileResolver: CurrentProfileResolver;
};

export async function resolveCurrentProfileFromCredential({
  authVerifier,
  credential,
  environment,
  profileResolver,
}: ResolveCurrentProfileFromCredentialInput): Promise<CurrentProfile | null> {
  if (credential.type === "none") {
    return null;
  }

  if (credential.type === "test") {
    return profileResolver.resolve(resolveTestIdentity(credential, environment));
  }

  return profileResolver.resolve(await authVerifier.verify(credential.token));
}

function resolveTestIdentity(
  credential: Extract<AuthCredential, { type: "test" }>,
  environment: AuthEnvironment,
): VerifiedIdentity {
  if (environment.isProduction || !environment.allowTestAuthBypass) {
    throw unauthorized("Test authentication is disabled.");
  }

  if (!credential.supabaseUserId || !credential.email) {
    throw unauthorized("Test authentication requires user id and email.");
  }

  return {
    supabaseUserId: credential.supabaseUserId,
    email: credential.email,
    displayName: credential.displayName,
  };
}
