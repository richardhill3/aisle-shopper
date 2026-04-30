import { NodeIdGenerator } from "../infrastructure/NodeIdGenerator";
import { PostgresListWriteRepository } from "../infrastructure/postgres/PostgresListWriteRepository";
import { createListWriteController } from "../presentation/http/controllers/listWriteController";

export const listWriteController = createListWriteController(
  new PostgresListWriteRepository(),
  new NodeIdGenerator(),
);
