import {
  mapListRecord,
  type CurrentListReadActor,
  type ListRecord,
  type ListView,
} from "./listReadUseCases";

export type IdGenerator = {
  randomId(): string;
};

export type ListWriteRepository = {
  createList(input: {
    id: string;
    name: string;
    ownerProfileId: string | null;
  }): Promise<ListRecord>;
  updateList(
    listId: string,
    name: string,
    actorProfileId: string | null,
  ): Promise<ListRecord | null>;
  deleteList(listId: string, actorProfileId: string | null): Promise<boolean>;
};

export type CreateListInput = {
  actor: CurrentListReadActor | null;
  idGenerator: IdGenerator;
  name: string;
  repository: ListWriteRepository;
};

export type UpdateListInput = {
  actor: CurrentListReadActor | null;
  listId: string;
  name: string;
  repository: ListWriteRepository;
};

export type DeleteListInput = {
  actor: CurrentListReadActor | null;
  listId: string;
  repository: ListWriteRepository;
};

export async function createList({
  actor,
  idGenerator,
  name,
  repository,
}: CreateListInput): Promise<ListView> {
  const actorProfileId = actor?.profileId ?? null;
  const record = await repository.createList({
    id: idGenerator.randomId(),
    name,
    ownerProfileId: actorProfileId,
  });

  return mapListRecord(record, actorProfileId);
}

export async function updateList({
  actor,
  listId,
  name,
  repository,
}: UpdateListInput): Promise<ListView | null> {
  const actorProfileId = actor?.profileId ?? null;
  const record = await repository.updateList(listId, name, actorProfileId);

  return record ? mapListRecord(record, actorProfileId) : null;
}

export async function deleteList({
  actor,
  listId,
  repository,
}: DeleteListInput): Promise<boolean> {
  return repository.deleteList(listId, actor?.profileId ?? null);
}
