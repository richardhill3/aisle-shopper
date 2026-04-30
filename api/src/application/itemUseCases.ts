import {
  mapListRecord,
  type CurrentListReadActor,
  type ListRecord,
  type ListView,
} from "./listReadUseCases";
import type { IdGenerator } from "./listWriteUseCases";

export type ItemRepository = {
  addItem(input: {
    actorProfileId: string | null;
    id: string;
    listId: string;
    name: string;
    sectionId: string;
  }): Promise<ListRecord | null>;
  updateItem(
    listId: string,
    sectionId: string,
    itemId: string,
    updates: { checked?: boolean; name?: string },
    actorProfileId: string | null,
  ): Promise<ListRecord | null>;
  deleteItem(
    listId: string,
    sectionId: string,
    itemId: string,
    actorProfileId: string | null,
  ): Promise<ListRecord | null>;
  resetCheckedItems(
    listId: string,
    actorProfileId: string | null,
  ): Promise<ListRecord | null>;
};

export type AddItemInput = {
  actor: CurrentListReadActor | null;
  idGenerator: IdGenerator;
  listId: string;
  name: string;
  repository: ItemRepository;
  sectionId: string;
};

export type UpdateItemInput = {
  actor: CurrentListReadActor | null;
  itemId: string;
  listId: string;
  repository: ItemRepository;
  sectionId: string;
  updates: { checked?: boolean; name?: string };
};

export type DeleteItemInput = {
  actor: CurrentListReadActor | null;
  itemId: string;
  listId: string;
  repository: ItemRepository;
  sectionId: string;
};

export type ResetCheckedItemsInput = {
  actor: CurrentListReadActor | null;
  listId: string;
  repository: ItemRepository;
};

export async function addItem({
  actor,
  idGenerator,
  listId,
  name,
  repository,
  sectionId,
}: AddItemInput): Promise<ListView | null> {
  const actorProfileId = actor?.profileId ?? null;
  const record = await repository.addItem({
    actorProfileId,
    id: idGenerator.randomId(),
    listId,
    name,
    sectionId,
  });

  return record ? mapListRecord(record, actorProfileId) : null;
}

export async function updateItem({
  actor,
  itemId,
  listId,
  repository,
  sectionId,
  updates,
}: UpdateItemInput): Promise<ListView | null> {
  const actorProfileId = actor?.profileId ?? null;
  const record = await repository.updateItem(
    listId,
    sectionId,
    itemId,
    updates,
    actorProfileId,
  );

  return record ? mapListRecord(record, actorProfileId) : null;
}

export async function deleteItem({
  actor,
  itemId,
  listId,
  repository,
  sectionId,
}: DeleteItemInput): Promise<ListView | null> {
  const actorProfileId = actor?.profileId ?? null;
  const record = await repository.deleteItem(
    listId,
    sectionId,
    itemId,
    actorProfileId,
  );

  return record ? mapListRecord(record, actorProfileId) : null;
}

export async function resetCheckedItems({
  actor,
  listId,
  repository,
}: ResetCheckedItemsInput): Promise<ListView | null> {
  const actorProfileId = actor?.profileId ?? null;
  const record = await repository.resetCheckedItems(listId, actorProfileId);

  return record ? mapListRecord(record, actorProfileId) : null;
}
