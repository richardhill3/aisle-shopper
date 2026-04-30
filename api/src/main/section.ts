import { NodeIdGenerator } from "../infrastructure/NodeIdGenerator";
import { PostgresSectionRepository } from "../infrastructure/postgres/PostgresSectionRepository";
import { createSectionController } from "../presentation/http/controllers/sectionController";

export const sectionController = createSectionController(
  new PostgresSectionRepository(),
  new NodeIdGenerator(),
);
