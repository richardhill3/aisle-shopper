import { NodeIdGenerator } from "../infrastructure/NodeIdGenerator";
import { PostgresItemRepository } from "../infrastructure/postgres/PostgresItemRepository";
import { PostgresListReadRepository } from "../infrastructure/postgres/PostgresListReadRepository";
import { PostgresListSharingRepository } from "../infrastructure/postgres/PostgresListSharingRepository";
import { PostgresListWriteRepository } from "../infrastructure/postgres/PostgresListWriteRepository";
import { PostgresProfileRepository } from "../infrastructure/postgres/PostgresProfileRepository";
import { PostgresSectionRepository } from "../infrastructure/postgres/PostgresSectionRepository";
import { createItemController } from "../presentation/http/controllers/itemController";
import { createListReadController } from "../presentation/http/controllers/listReadController";
import { createListSharingController } from "../presentation/http/controllers/listSharingController";
import { createListWriteController } from "../presentation/http/controllers/listWriteController";
import { createProfileController } from "../presentation/http/controllers/profileController";
import { createSectionController } from "../presentation/http/controllers/sectionController";
import type { ApiControllers } from "../presentation/http/routes";

export type AppContainer = {
  controllers: ApiControllers;
};

export function createAppContainer(): AppContainer {
  const idGenerator = new NodeIdGenerator();
  const profileRepository = new PostgresProfileRepository();

  return {
    controllers: {
      itemController: createItemController(
        new PostgresItemRepository(),
        idGenerator,
      ),
      listReadController: createListReadController(
        new PostgresListReadRepository(),
      ),
      listSharingController: createListSharingController(
        new PostgresListSharingRepository(),
      ),
      listWriteController: createListWriteController(
        new PostgresListWriteRepository(),
        idGenerator,
      ),
      profileController: createProfileController(profileRepository),
      sectionController: createSectionController(
        new PostgresSectionRepository(),
        idGenerator,
      ),
    },
  };
}
