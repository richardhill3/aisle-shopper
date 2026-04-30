import type { NextFunction, Request, Response } from "express";
import type {
  CreateListRequest,
  UpdateListRequest,
} from "../../../../../shared/src";
import type { IdGenerator } from "../../../application/listWriteUseCases";
import {
  createList,
  deleteList,
  updateList,
  type ListWriteRepository,
} from "../../../application/listWriteUseCases";
import { invalidRequest, notFound } from "../../../errors";
import { requiredName } from "../../../validation";
import { mapList } from "../dtoMappers";

export type ListWriteController = {
  createList(request: Request, response: Response, next: NextFunction): Promise<void>;
  updateList(request: Request, response: Response, next: NextFunction): Promise<void>;
  deleteList(request: Request, response: Response, next: NextFunction): Promise<void>;
};

export function createListWriteController(
  repository: ListWriteRepository,
  idGenerator: IdGenerator,
): ListWriteController {
  return {
    async createList(request, response, next) {
      try {
        const body = request.body as Partial<CreateListRequest>;
        const list = await createList({
          actor: actorFromRequest(request),
          idGenerator,
          name: requiredName(body.name, "List name"),
          repository,
        });

        response.status(201).json({ list: mapList(list) });
      } catch (error) {
        next(error);
      }
    },

    async updateList(request, response, next) {
      try {
        const body = request.body as Partial<UpdateListRequest>;
        const list = await updateList({
          actor: actorFromRequest(request),
          listId: routeParam(request.params.listId, "List id"),
          name: requiredName(body.name, "List name"),
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

    async deleteList(request, response, next) {
      try {
        const deleted = await deleteList({
          actor: actorFromRequest(request),
          listId: routeParam(request.params.listId, "List id"),
          repository,
        });

        if (!deleted) {
          throw notFound("List not found.");
        }

        response.status(204).send();
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
