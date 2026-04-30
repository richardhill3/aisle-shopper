import { Router } from "express";
import type { ItemController } from "./controllers/itemController";
import type { ListReadController } from "./controllers/listReadController";
import type { ListSharingController } from "./controllers/listSharingController";
import type { ListWriteController } from "./controllers/listWriteController";
import type { ProfileController } from "./controllers/profileController";
import type { SectionController } from "./controllers/sectionController";

export type ApiControllers = {
  itemController: ItemController;
  listReadController: ListReadController;
  listSharingController: ListSharingController;
  listWriteController: ListWriteController;
  profileController: ProfileController;
  sectionController: SectionController;
};

export function createApiRouter(controllers: ApiControllers) {
  const router = Router();
  const {
    itemController,
    listReadController,
    listSharingController,
    listWriteController,
    profileController,
    sectionController,
  } = controllers;

  router.get("/health", (_request, response) => {
    response.json({ ok: true });
  });

  router.get("/me", profileController.getCurrentProfile);
  router.patch("/me", profileController.updateCurrentProfile);

  router.get("/lists/recent", listReadController.listRecent);
  router.get("/lists", listReadController.listSummaries);
  router.post("/lists", listWriteController.createList);

  router.get("/lists/:listId/members", listSharingController.listMembers);
  router.post("/lists/:listId/members", listSharingController.addListMember);
  router.delete(
    "/lists/:listId/members/:profileId",
    listSharingController.removeListMember,
  );

  router.get("/lists/:listId", listReadController.getList);
  router.patch("/lists/:listId", listWriteController.updateList);
  router.delete("/lists/:listId", listWriteController.deleteList);

  router.post("/lists/:listId/sections", sectionController.addSection);
  router.patch(
    "/lists/:listId/sections/:sectionId",
    sectionController.updateSection,
  );
  router.delete(
    "/lists/:listId/sections/:sectionId",
    sectionController.deleteSection,
  );
  router.patch(
    "/lists/:listId/sections/:sectionId/position",
    sectionController.moveSection,
  );

  router.post(
    "/lists/:listId/sections/:sectionId/items",
    itemController.addItem,
  );
  router.patch(
    "/lists/:listId/sections/:sectionId/items/:itemId",
    itemController.updateItem,
  );
  router.delete(
    "/lists/:listId/sections/:sectionId/items/:itemId",
    itemController.deleteItem,
  );
  router.post("/lists/:listId/items/reset-checked", itemController.resetCheckedItems);

  return router;
}
