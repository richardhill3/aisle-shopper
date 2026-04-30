import type { NextFunction, Request, Response } from "express";
import type { UpdateProfileRequest } from "../../../../../shared/src";
import {
  getCurrentProfile,
  updateCurrentProfile,
  type ProfileRepository,
} from "../../../application/profileUseCases";
import { invalidRequest } from "../../../errors";
import { mapProfile } from "../dtoMappers";
import { mapCleanError } from "../errorMapper";

export type ProfileController = {
  getCurrentProfile(
    request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void>;
  updateCurrentProfile(
    request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void>;
};

export function createProfileController(
  repository: ProfileRepository,
): ProfileController {
  return {
    async getCurrentProfile(request, response, next) {
      try {
        const profile = await getCurrentProfile({
          actor: actorFromRequest(request),
          repository,
        });

        response.json({ profile: mapProfile(profile) });
      } catch (error) {
        next(mapCleanError(error));
      }
    },

    async updateCurrentProfile(request, response, next) {
      try {
        const actor = actorFromRequest(request);
        const body = (request.body ?? {}) as Partial<UpdateProfileRequest>;
        const profile = await updateCurrentProfile({
          actor,
          displayName: actor ? displayName(body.displayName) : null,
          repository,
        });

        response.json({ profile: mapProfile(profile) });
      } catch (error) {
        next(mapCleanError(error));
      }
    },
  };
}

function actorFromRequest(request: Request) {
  return request.currentProfile
    ? { profileId: request.currentProfile.id }
    : null;
}

function displayName(value: unknown) {
  if (value === null) {
    return null;
  }

  if (typeof value !== "string") {
    throw invalidRequest("Display name is required.");
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}
