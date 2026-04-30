import { PostgresListReadRepository } from "../infrastructure/postgres/PostgresListReadRepository";
import { createListReadController } from "../presentation/http/controllers/listReadController";

export const listReadController = createListReadController(
  new PostgresListReadRepository(),
);
