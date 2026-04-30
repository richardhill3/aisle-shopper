import type { NextFunction, Request, Response } from "express";
import {
  getList,
  listSummaries,
  recentListSummaries,
  type ListReadRepository,
} from "../../../application/listReadUseCases";
import { invalidRequest, notFound } from "../../../errors";
import { paging } from "../../../validation";
import { mapList, mapListSummary } from "../dtoMappers";

export type ListReadController = {
  listRecent(request: Request, response: Response, next: NextFunction): Promise<void>;
  listSummaries(
    request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void>;
  getList(request: Request, response: Response, next: NextFunction): Promise<void>;
};

export function createListReadController(
  repository: ListReadRepository,
): ListReadController {
  return {
    async listRecent(request, response, next) {
      try {
        const limit = paging(request.query.limit, 3, 50);
        const lists = await recentListSummaries({
          actor: actorFromRequest(request),
          limit,
          repository,
        });

        response.json({ lists: lists.map(mapListSummary) });
      } catch (error) {
        next(error);
      }
    },

    async listSummaries(request, response, next) {
      try {
        const limit = paging(request.query.limit, 50, 100);
        const offset = paging(request.query.offset, 0, Number.MAX_SAFE_INTEGER);
        const lists = await listSummaries({
          actor: actorFromRequest(request),
          limit,
          offset,
          repository,
        });

        response.json({ lists: lists.map(mapListSummary) });
      } catch (error) {
        next(error);
      }
    },

    async getList(request, response, next) {
      try {
        const list = await getList({
          actor: actorFromRequest(request),
          listId: routeParam(request.params.listId, "List id"),
          repository,
        });

        if (!list) {
          throw notFound("List not found.");
        }

        response.json({ list: mapList(list) });
      } catch (error) {
        next(error);
      }
    },
  };
}

function actorFromRequest(request: Request) {
  return request.currentProfile
    ? { profileId: request.currentProfile.id }
    : null;
}

function routeParam(value: string | string[] | undefined, label: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw invalidRequest(`${label} is required.`);
  }

  return value;
}
