import { Router } from "express";
import { itemController } from "./main/item";
import { listReadController } from "./main/listRead";
import { listSharingController } from "./main/listSharing";
import { listWriteController } from "./main/listWrite";
import { profileController } from "./main/profile";
import { sectionController } from "./main/section";

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
  await sectionController.addSection(request, response, next);
});

apiRouter.patch(
  "/lists/:listId/sections/:sectionId",
  async (request, response, next) => {
    await sectionController.updateSection(request, response, next);
  },
);

apiRouter.delete(
  "/lists/:listId/sections/:sectionId",
  async (request, response, next) => {
    await sectionController.deleteSection(request, response, next);
  },
);

apiRouter.patch(
  "/lists/:listId/sections/:sectionId/position",
  async (request, response, next) => {
    await sectionController.moveSection(request, response, next);
  },
);

apiRouter.post(
  "/lists/:listId/sections/:sectionId/items",
  async (request, response, next) => {
    await itemController.addItem(request, response, next);
  },
);

apiRouter.patch(
  "/lists/:listId/sections/:sectionId/items/:itemId",
  async (request, response, next) => {
    await itemController.updateItem(request, response, next);
  },
);

apiRouter.delete(
  "/lists/:listId/sections/:sectionId/items/:itemId",
  async (request, response, next) => {
    await itemController.deleteItem(request, response, next);
  },
);

apiRouter.post(
  "/lists/:listId/items/reset-checked",
  async (request, response, next) => {
    await itemController.resetCheckedItems(request, response, next);
  },
);
