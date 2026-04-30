import {
  mapListRecord,
  type CurrentListReadActor,
  type ListRecord,
  type ListView,
} from "./listReadUseCases";
import type { IdGenerator } from "./listWriteUseCases";

export type SectionMoveDirection = "up" | "down";

export type SectionRepository = {
  addSection(input: {
    actorProfileId: string | null;
    id: string;
    listId: string;
    name: string;
  }): Promise<ListRecord | null>;
  updateSection(
    listId: string,
    sectionId: string,
    name: string,
    actorProfileId: string | null,
  ): Promise<ListRecord | null>;
  deleteSection(
    listId: string,
    sectionId: string,
    actorProfileId: string | null,
  ): Promise<ListRecord | null>;
  moveSection(
    listId: string,
    sectionId: string,
    direction: SectionMoveDirection,
    actorProfileId: string | null,
  ): Promise<ListRecord | null>;
};

export type AddSectionInput = {
  actor: CurrentListReadActor | null;
  idGenerator: IdGenerator;
  listId: string;
  name: string;
  repository: SectionRepository;
};

export type UpdateSectionInput = {
  actor: CurrentListReadActor | null;
  listId: string;
  name: string;
  repository: SectionRepository;
  sectionId: string;
};

export type DeleteSectionInput = {
  actor: CurrentListReadActor | null;
  listId: string;
  repository: SectionRepository;
  sectionId: string;
};

export type MoveSectionInput = DeleteSectionInput & {
  direction: SectionMoveDirection;
};

export async function addSection({
  actor,
  idGenerator,
  listId,
  name,
  repository,
}: AddSectionInput): Promise<ListView | null> {
  const actorProfileId = actor?.profileId ?? null;
  const record = await repository.addSection({
    actorProfileId,
    id: idGenerator.randomId(),
    listId,
    name,
  });

  return record ? mapListRecord(record, actorProfileId) : null;
}

export async function updateSection({
  actor,
  listId,
  name,
  repository,
  sectionId,
}: UpdateSectionInput): Promise<ListView | null> {
  const actorProfileId = actor?.profileId ?? null;
  const record = await repository.updateSection(
    listId,
    sectionId,
    name,
    actorProfileId,
  );

  return record ? mapListRecord(record, actorProfileId) : null;
}

export async function deleteSection({
  actor,
  listId,
  repository,
  sectionId,
}: DeleteSectionInput): Promise<ListView | null> {
  const actorProfileId = actor?.profileId ?? null;
  const record = await repository.deleteSection(listId, sectionId, actorProfileId);

  return record ? mapListRecord(record, actorProfileId) : null;
}

export async function moveSection({
  actor,
  direction,
  listId,
  repository,
  sectionId,
}: MoveSectionInput): Promise<ListView | null> {
  const actorProfileId = actor?.profileId ?? null;
  const record = await repository.moveSection(
    listId,
    sectionId,
    direction,
    actorProfileId,
  );

  return record ? mapListRecord(record, actorProfileId) : null;
}
