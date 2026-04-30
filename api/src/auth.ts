import type { NextFunction, Request, Response } from "express";
import {
  resolveCurrentProfileFromCredential,
  type AuthCredential,
} from "./application/authUseCases";
import type { CurrentProfile } from "./domain";
import { unauthorized } from "./errors";
import {
  authVerifier,
  currentProfileResolver,
  resetSupabaseAuthClientForTests as resetSupabaseAuthClient,
} from "./main/auth";
import { mapCleanError } from "./presentation/http/errorMapper";

export type { CurrentProfile } from "./domain";

export function resetSupabaseAuthClientForTests() {
  resetSupabaseAuthClient();
}

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
    const currentProfile = await resolveCurrentProfileFromCredential({
      authVerifier,
      credential: credentialFromRequest(request),
      environment: environmentFromProcess(),
      profileResolver: currentProfileResolver,
    });

    if (currentProfile) {
      request.currentProfile = currentProfile;
    }

    next();
  } catch (error) {
    next(mapCleanError(error));
  }
}

function credentialFromRequest(request: Request): AuthCredential {
  if (hasTestAuthHeaders(request)) {
    return {
      type: "test",
      supabaseUserId: request.header("x-test-auth-user-id") ?? undefined,
      email: request.header("x-test-auth-email") ?? undefined,
      displayName: request.header("x-test-auth-display-name") ?? undefined,
    };
  }

  const authorization = request.header("authorization");

  if (!authorization) {
    return { type: "none" };
  }

  const match = authorization.match(/^Bearer\s+(.+)$/i);

  if (!match) {
    throw unauthorized("Invalid authorization header.");
  }

  return { type: "bearer", token: match[1] };
}

function hasTestAuthHeaders(request: Request) {
  return Boolean(
    request.header("x-test-auth-user-id") || request.header("x-test-auth-email"),
  );
}

function environmentFromProcess() {
  return {
    allowTestAuthBypass: process.env.API_ENABLE_TEST_AUTH_BYPASS === "true",
    isProduction: process.env.NODE_ENV === "production",
  };
}
