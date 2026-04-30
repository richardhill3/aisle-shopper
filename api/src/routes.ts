import { Router } from "express";
import type {
  CreateItemRequest,
  CreateSectionRequest,
  MoveSectionRequest,
  UpdateItemRequest,
  UpdateSectionRequest,
} from "../../shared/src";
import {
  addItem,
  addSection,
  deleteItem,
  deleteSection,
  moveSection,
  resetCheckedItems,
  updateItem,
  updateSection,
} from "./listsRepository";
import { invalidRequest } from "./errors";
import { listReadController } from "./main/listRead";
import { listSharingController } from "./main/listSharing";
import { listWriteController } from "./main/listWrite";
import { profileController } from "./main/profile";
import {
  booleanValue,
  direction,
  optionalName,
  requiredName,
} from "./validation";

export const apiRouter = Router();

apiRouter.get("/health", (_request, response) => {
  response.json({ ok: true });
});

apiRouter.get("/me", async (request, response, next) => {
  await profileController.getCurrentProfile(request, response, next);
});

apiRouter.patch("/me", async (request, response, next) => {
  await profileController.updateCurrentProfile(request, response, next);
});

apiRouter.get("/lists/recent", async (request, response, next) => {
  await listReadController.listRecent(request, response, next);
});

apiRouter.get("/lists", async (request, response, next) => {
  await listReadController.listSummaries(request, response, next);
});

apiRouter.post("/lists", async (request, response, next) => {
  await listWriteController.createList(request, response, next);
});

apiRouter.get("/lists/:listId/members", listSharingController.listMembers);

apiRouter.post("/lists/:listId/members", listSharingController.addListMember);

apiRouter.delete(
  "/lists/:listId/members/:profileId",
  listSharingController.removeListMember,
);

apiRouter.get("/lists/:listId", async (request, response, next) => {
  await listReadController.getList(request, response, next);
});

apiRouter.patch("/lists/:listId", async (request, response, next) => {
  await listWriteController.updateList(request, response, next);
});

apiRouter.delete("/lists/:listId", async (request, response, next) => {
  await listWriteController.deleteList(request, response, next);
});

apiRouter.post("/lists/:listId/sections", async (request, response, next) => {
  try {
    const body = request.body as Partial<CreateSectionRequest>;
    const name = requiredName(body.name, "Aisle name");
    response.status(201).json({
      list: await addSection(request.params.listId, name, request.currentProfile),
    });
  } catch (error) {
    next(error);
  }
});

apiRouter.patch(
  "/lists/:listId/sections/:sectionId",
  async (request, response, next) => {
    try {
      const body = request.body as Partial<UpdateSectionRequest>;
      const name = requiredName(body.name, "Aisle name");
      response.json({
        list: await updateSection(
          request.params.listId,
          request.params.sectionId,
          name,
          request.currentProfile,
        ),
      });
    } catch (error) {
      next(error);
    }
  },
);

apiRouter.delete(
  "/lists/:listId/sections/:sectionId",
  async (request, response, next) => {
    try {
      response.json({
        list: await deleteSection(
          request.params.listId,
          request.params.sectionId,
          request.currentProfile,
        ),
      });
    } catch (error) {
      next(error);
    }
  },
);

apiRouter.patch(
  "/lists/:listId/sections/:sectionId/position",
  async (request, response, next) => {
    try {
      const body = request.body as Partial<MoveSectionRequest>;
      response.json({
        list: await moveSection(
          request.params.listId,
          request.params.sectionId,
          direction(body.direction),
          request.currentProfile,
        ),
      });
    } catch (error) {
      next(error);
    }
  },
);

apiRouter.post(
  "/lists/:listId/sections/:sectionId/items",
  async (request, response, next) => {
    try {
      const body = request.body as Partial<CreateItemRequest>;
      const name = requiredName(body.name, "Item name");
      response.status(201).json({
        list: await addItem(
          request.params.listId,
          request.params.sectionId,
          name,
          request.currentProfile,
        ),
      });
    } catch (error) {
      next(error);
    }
  },
);

apiRouter.patch(
  "/lists/:listId/sections/:sectionId/items/:itemId",
  async (request, response, next) => {
    try {
      const body = request.body as Partial<UpdateItemRequest>;
      const name = optionalName(body.name, "Item name");
      const checked = booleanValue(body.checked, "Checked");

      if (name === undefined && checked === undefined) {
        throw invalidRequest("At least one item field is required.");
      }

      response.json({
        list: await updateItem(
          request.params.listId,
          request.params.sectionId,
          request.params.itemId,
          { checked, name },
          request.currentProfile,
        ),
      });
    } catch (error) {
      next(error);
    }
  },
);

apiRouter.delete(
  "/lists/:listId/sections/:sectionId/items/:itemId",
  async (request, response, next) => {
    try {
      response.json({
        list: await deleteItem(
          request.params.listId,
          request.params.sectionId,
          request.params.itemId,
          request.currentProfile,
        ),
      });
    } catch (error) {
      next(error);
    }
  },
);

apiRouter.post(
  "/lists/:listId/items/reset-checked",
  async (request, response, next) => {
    try {
      response.json({
        list: await resetCheckedItems(
          request.params.listId,
          request.currentProfile,
        ),
      });
    } catch (error) {
      next(error);
    }
  },
);
