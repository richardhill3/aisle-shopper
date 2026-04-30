import type { NextFunction, Request, Response } from "express";
import type { AddListMemberRequest } from "../../../../../shared/src";
import {
  addListMember,
  listMembers,
  removeListMember,
  type ListSharingRepository,
} from "../../../application/listSharingUseCases";
import { invalidRequest } from "../../../errors";
import { requiredEmail } from "../../../validation";
import { mapListMember } from "../dtoMappers";
import { mapListSharingError } from "../errorMapper";

export type ListSharingController = {
  listMembers(request: Request, response: Response, next: NextFunction): Promise<void>;
  addListMember(
    request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void>;
  removeListMember(
    request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void>;
};

export function createListSharingController(
  repository: ListSharingRepository,
): ListSharingController {
  return {
    async listMembers(request, response, next) {
      try {
        const members = await listMembers({
          actor: actorFromRequest(request),
          listId: routeParam(request.params.listId, "List id"),
          repository,
        });

        response.json({ members: members.map(mapListMember) });
      } catch (error) {
        next(mapListSharingError(error));
      }
    },

    async addListMember(request, response, next) {
      try {
        const body = request.body as Partial<AddListMemberRequest>;
        const member = await addListMember({
          actor: actorFromRequest(request),
          email: requiredEmail(body.email),
          listId: routeParam(request.params.listId, "List id"),
          repository,
        });

        response.status(201).json({ member: mapListMember(member) });
      } catch (error) {
        next(mapListSharingError(error));
      }
    },

    async removeListMember(request, response, next) {
      try {
        await removeListMember({
          actor: actorFromRequest(request),
          listId: routeParam(request.params.listId, "List id"),
          profileId: routeParam(request.params.profileId, "Profile id"),
          repository,
        });
        response.status(204).send();
      } catch (error) {
        next(mapListSharingError(error));
      }
    },
  };
}

function routeParam(value: string | string[] | undefined, label: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw invalidRequest(`${label} is required.`);
  }

  return value;
}

function actorFromRequest(request: Request) {
  return request.currentProfile
    ? { profileId: request.currentProfile.id }
    : null;
}
