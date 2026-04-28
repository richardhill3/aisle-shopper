import { Router } from "express";
import type {
  CreateItemRequest,
  CreateListRequest,
  CreateSectionRequest,
  MoveSectionRequest,
  UpdateItemRequest,
  UpdateListRequest,
  UpdateProfileRequest,
  UpdateSectionRequest,
} from "../../shared/src";
import {
  addItem,
  addSection,
  createList,
  deleteItem,
  deleteList,
  deleteSection,
  getList,
  listSummaries,
  moveSection,
  resetCheckedItems,
  updateItem,
  updateList,
  updateSection,
} from "./listsRepository";
import { invalidRequest, notFound, unauthorized } from "./errors";
import {
  getCurrentProfile,
  updateCurrentProfile,
} from "./profilesRepository";
import {
  booleanValue,
  direction,
  optionalName,
  paging,
  requiredName,
} from "./validation";

export const apiRouter = Router();

apiRouter.get("/health", (_request, response) => {
  response.json({ ok: true });
});

apiRouter.get("/me", async (request, response, next) => {
  try {
    response.json({
      profile: await getCurrentProfile(request.currentProfile),
    });
  } catch (error) {
    next(error);
  }
});

apiRouter.patch("/me", async (request, response, next) => {
  try {
    if (!request.currentProfile) {
      throw unauthorized("Authentication is required.");
    }

    const body = request.body as Partial<UpdateProfileRequest>;
    response.json({
      profile: await updateCurrentProfile(
        displayName(body.displayName),
        request.currentProfile,
      ),
    });
  } catch (error) {
    next(error);
  }
});

apiRouter.get("/lists/recent", async (request, response, next) => {
  try {
    const limit = paging(request.query.limit, 3, 50);
    response.json({
      lists: await listSummaries(limit, 0, request.currentProfile),
    });
  } catch (error) {
    next(error);
  }
});

apiRouter.get("/lists", async (request, response, next) => {
  try {
    const limit = paging(request.query.limit, 50, 100);
    const offset = paging(request.query.offset, 0, Number.MAX_SAFE_INTEGER);
    response.json({
      lists: await listSummaries(limit, offset, request.currentProfile),
    });
  } catch (error) {
    next(error);
  }
});

apiRouter.post("/lists", async (request, response, next) => {
  try {
    const body = request.body as Partial<CreateListRequest>;
    const name = requiredName(body.name, "List name");
    response.status(201).json({
      list: await createList(name, request.currentProfile),
    });
  } catch (error) {
    next(error);
  }
});

apiRouter.get("/lists/:listId", async (request, response, next) => {
  try {
    const list = await getList(
      request.params.listId,
      undefined,
      request.currentProfile,
    );

    if (!list) {
      throw notFound("List not found.");
    }

    response.json({ list });
  } catch (error) {
    next(error);
  }
});

apiRouter.patch("/lists/:listId", async (request, response, next) => {
  try {
    const body = request.body as Partial<UpdateListRequest>;
    const name = requiredName(body.name, "List name");
    response.json({
      list: await updateList(request.params.listId, name, request.currentProfile),
    });
  } catch (error) {
    next(error);
  }
});

apiRouter.delete("/lists/:listId", async (request, response, next) => {
  try {
    await deleteList(request.params.listId, request.currentProfile);
    response.status(204).send();
  } catch (error) {
    next(error);
  }
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
