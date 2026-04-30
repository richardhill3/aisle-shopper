import type { NextFunction, Request, Response } from "express";
import type {
  CreateSectionRequest,
  MoveSectionRequest,
  UpdateSectionRequest,
} from "../../../../../shared/src";
import type { IdGenerator } from "../../../application/listWriteUseCases";
import {
  addSection,
  deleteSection,
  moveSection,
  updateSection,
  type SectionRepository,
} from "../../../application/sectionUseCases";
import { invalidRequest, notFound } from "../../../errors";
import { direction, requiredName } from "../../../validation";
import { mapList } from "../dtoMappers";

export type SectionController = {
  addSection(request: Request, response: Response, next: NextFunction): Promise<void>;
  updateSection(request: Request, response: Response, next: NextFunction): Promise<void>;
  deleteSection(request: Request, response: Response, next: NextFunction): Promise<void>;
  moveSection(request: Request, response: Response, next: NextFunction): Promise<void>;
};

export function createSectionController(
  repository: SectionRepository,
  idGenerator: IdGenerator,
): SectionController {
  return {
    async addSection(request, response, next) {
      try {
        const body = request.body as Partial<CreateSectionRequest>;
        const list = await addSection({
          actor: actorFromRequest(request),
          idGenerator,
          listId: routeParam(request.params.listId, "List id"),
          name: requiredName(body.name, "Aisle name"),
          repository,
        });

        response.status(201).json({ list: mapRequiredList(list, "List not found.") });
      } catch (error) {
        next(error);
      }
    },

    async updateSection(request, response, next) {
      try {
        const body = request.body as Partial<UpdateSectionRequest>;
        const list = await updateSection({
          actor: actorFromRequest(request),
          listId: routeParam(request.params.listId, "List id"),
          name: requiredName(body.name, "Aisle name"),
          repository,
          sectionId: routeParam(request.params.sectionId, "Section id"),
        });

        response.json({ list: mapRequiredList(list, "Section not found.") });
      } catch (error) {
        next(error);
      }
    },

    async deleteSection(request, response, next) {
      try {
        const list = await deleteSection({
          actor: actorFromRequest(request),
          listId: routeParam(request.params.listId, "List id"),
          repository,
          sectionId: routeParam(request.params.sectionId, "Section id"),
        });

        response.json({ list: mapRequiredList(list, "Section not found.") });
      } catch (error) {
        next(error);
      }
    },

    async moveSection(request, response, next) {
      try {
        const body = request.body as Partial<MoveSectionRequest>;
        const list = await moveSection({
          actor: actorFromRequest(request),
          direction: direction(body.direction),
          listId: routeParam(request.params.listId, "List id"),
          repository,
          sectionId: routeParam(request.params.sectionId, "Section id"),
        });

        response.json({ list: mapRequiredList(list, "Section not found.") });
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
