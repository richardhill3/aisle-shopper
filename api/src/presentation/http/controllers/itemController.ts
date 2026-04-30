import type { NextFunction, Request, Response } from "express";
import type {
  CreateItemRequest,
  UpdateItemRequest,
} from "../../../../../shared/src";
import {
  addItem,
  deleteItem,
  resetCheckedItems,
  updateItem,
  type ItemRepository,
} from "../../../application/itemUseCases";
import type { IdGenerator } from "../../../application/listWriteUseCases";
import { invalidRequest, notFound } from "../../../errors";
import { booleanValue, optionalName, requiredName } from "../../../validation";
import { mapList } from "../dtoMappers";

export type ItemController = {
  addItem(request: Request, response: Response, next: NextFunction): Promise<void>;
  updateItem(request: Request, response: Response, next: NextFunction): Promise<void>;
  deleteItem(request: Request, response: Response, next: NextFunction): Promise<void>;
  resetCheckedItems(
    request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void>;
};

export function createItemController(
  repository: ItemRepository,
  idGenerator: IdGenerator,
): ItemController {
  return {
    async addItem(request, response, next) {
      try {
        const body = request.body as Partial<CreateItemRequest>;
        const list = await addItem({
          actor: actorFromRequest(request),
          idGenerator,
          listId: routeParam(request.params.listId, "List id"),
          name: requiredName(body.name, "Item name"),
          repository,
          sectionId: routeParam(request.params.sectionId, "Section id"),
        });

        response.status(201).json({ list: mapRequiredList(list, "Section not found.") });
      } catch (error) {
        next(error);
      }
    },

    async updateItem(request, response, next) {
      try {
        const body = request.body as Partial<UpdateItemRequest>;
        const name = optionalName(body.name, "Item name");
        const checked = booleanValue(body.checked, "Checked");

        if (name === undefined && checked === undefined) {
          throw invalidRequest("At least one item field is required.");
        }

        const list = await updateItem({
          actor: actorFromRequest(request),
          itemId: routeParam(request.params.itemId, "Item id"),
          listId: routeParam(request.params.listId, "List id"),
          repository,
          sectionId: routeParam(request.params.sectionId, "Section id"),
          updates: { checked, name },
        });

        response.json({ list: mapRequiredList(list, "Item not found.") });
      } catch (error) {
        next(error);
      }
    },

    async deleteItem(request, response, next) {
      try {
        const list = await deleteItem({
          actor: actorFromRequest(request),
          itemId: routeParam(request.params.itemId, "Item id"),
          listId: routeParam(request.params.listId, "List id"),
          repository,
          sectionId: routeParam(request.params.sectionId, "Section id"),
        });

        response.json({ list: mapRequiredList(list, "Item not found.") });
      } catch (error) {
        next(error);
      }
    },

    async resetCheckedItems(request, response, next) {
      try {
        const list = await resetCheckedItems({
          actor: actorFromRequest(request),
          listId: routeParam(request.params.listId, "List id"),
          repository,
        });

        response.json({ list: mapRequiredList(list, "List not found.") });
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

function mapRequiredList(
  list: Parameters<typeof mapList>[0] | null,
  message: string,
) {
  if (!list) {
    throw notFound(message);
  }

  return mapList(list);
}
