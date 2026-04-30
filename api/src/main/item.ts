import { NodeIdGenerator } from "../infrastructure/NodeIdGenerator";
import { PostgresItemRepository } from "../infrastructure/postgres/PostgresItemRepository";
import { createItemController } from "../presentation/http/controllers/itemController";

export const itemController = createItemController(
  new PostgresItemRepository(),
  new NodeIdGenerator(),
);
