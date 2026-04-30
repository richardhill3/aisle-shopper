import { PostgresListSharingRepository } from "../infrastructure/postgres/PostgresListSharingRepository";
import { createListSharingController } from "../presentation/http/controllers/listSharingController";

export const listSharingController = createListSharingController(
  new PostgresListSharingRepository(),
);
