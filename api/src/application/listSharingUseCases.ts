import {
  assertCanAddCollaborator,
  assertCanManageSharing,
  type CollaboratorProfile,
  type CurrentActorIdentity,
  type ListSharingAccess,
} from "../domain";
import { unauthorized } from "./errors";

export type ListMemberRecord = CollaboratorProfile & {
  createdAt: Date;
};

export type ListSharingRepository = {
  transaction<T>(
    callback: (repository: ListSharingRepository) => Promise<T>,
  ): Promise<T>;
  getAccess(
    listId: string,
    actorProfileId: string,
  ): Promise<ListSharingAccess>;
  listCollaborators(listId: string): Promise<ListMemberRecord[]>;
  findProfileByEmail(email: string): Promise<ListMemberRecord | null>;
  addCollaborator(
    listId: string,
    profile: ListMemberRecord,
  ): Promise<ListMemberRecord>;
  removeCollaborator(listId: string, profileId: string): Promise<void>;
};

export type ListSharingUseCaseInput = {
  actor: CurrentActorIdentity | null;
  listId: string;
  repository: ListSharingRepository;
};

export type AddListMemberInput = ListSharingUseCaseInput & {
  email: string;
};

export type RemoveListMemberInput = ListSharingUseCaseInput & {
  profileId: string;
};

export async function listMembers({
  actor,
  listId,
  repository,
}: ListSharingUseCaseInput): Promise<ListMemberRecord[]> {
  await requireOwnerAccess(actor, listId, repository);
  return repository.listCollaborators(listId);
}

export async function addListMember({
  actor,
  email,
  listId,
  repository,
}: AddListMemberInput): Promise<ListMemberRecord> {
  return repository.transaction((transactionalRepository) =>
    addListMemberInRepository({
      actor,
      email,
      listId,
      repository: transactionalRepository,
    }),
  );
}

async function addListMemberInRepository({
  actor,
  email,
  listId,
  repository,
}: AddListMemberInput): Promise<ListMemberRecord> {
  const currentActor = await requireOwnerAccess(actor, listId, repository);
  const collaborators = await repository.listCollaborators(listId);
  const targetProfile = await repository.findProfileByEmail(normalizeEmail(email));
  const policyInput = {
    actor: currentActor,
    collaborators,
    targetProfile,
  };

  assertCanAddCollaborator(policyInput);

  return repository.addCollaborator(listId, policyInput.targetProfile);
}

export async function removeListMember({
  actor,
  listId,
  profileId,
  repository,
}: RemoveListMemberInput): Promise<void> {
  await requireOwnerAccess(actor, listId, repository);
  await repository.removeCollaborator(listId, profileId);
}

async function requireOwnerAccess(
  actor: CurrentActorIdentity | null,
  listId: string,
  repository: ListSharingRepository,
): Promise<CurrentActorIdentity> {
  if (!actor) {
    throw unauthorized("Authentication is required.");
  }

  const access = await repository.getAccess(listId, actor.profileId);
  assertCanManageSharing(access);

  return actor;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
