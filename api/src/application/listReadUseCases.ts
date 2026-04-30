import {
  capabilitiesForListRole,
  listRoleForAccess,
  type ListAccess,
  type ListCapabilities,
  type ListReadRole,
} from "../domain";

export type CurrentListReadActor = {
  profileId: string;
};

export type ListItemRecord = {
  id: string;
  sectionId: string;
  name: string;
  checked: boolean;
  position: number;
  createdAt: Date;
  updatedAt: Date;
};

export type ListSectionRecord = {
  id: string;
  listId: string;
  name: string;
  position: number;
  items: ListItemRecord[];
  createdAt: Date;
  updatedAt: Date;
};

export type ListSummaryRecord = {
  id: string;
  name: string;
  ownerProfileId: string | null;
  sectionCount: number;
  itemCount: number;
  access: ListAccess;
  createdAt: Date;
  updatedAt: Date;
};

export type ListRecord = ListSummaryRecord & {
  sections: ListSectionRecord[];
};

export type ListSummaryView = Omit<ListSummaryRecord, "access"> & {
  currentUserRole: ListReadRole;
  capabilities: ListCapabilities;
};

export type ListView = Omit<ListRecord, "access"> & {
  currentUserRole: ListReadRole;
  capabilities: ListCapabilities;
};

export type ListReadRepository = {
  listSummaries(
    limit: number,
    offset: number,
    actorProfileId: string | null,
  ): Promise<ListSummaryRecord[]>;
  getList(
    listId: string,
    actorProfileId: string | null,
  ): Promise<ListRecord | null>;
};

export type ListSummariesInput = {
  actor: CurrentListReadActor | null;
  limit: number;
  offset: number;
  repository: ListReadRepository;
};

export type RecentListSummariesInput = Omit<ListSummariesInput, "offset">;

export type GetListInput = {
  actor: CurrentListReadActor | null;
  listId: string;
  repository: ListReadRepository;
};

export async function listSummaries({
  actor,
  limit,
  offset,
  repository,
}: ListSummariesInput): Promise<ListSummaryView[]> {
  const actorProfileId = actor?.profileId ?? null;
  const records = await repository.listSummaries(limit, offset, actorProfileId);

  return records.map((record) => mapListSummaryRecord(record, actorProfileId));
}

export async function recentListSummaries({
  actor,
  limit,
  repository,
}: RecentListSummariesInput): Promise<ListSummaryView[]> {
  return listSummaries({ actor, limit, offset: 0, repository });
}

export async function getList({
  actor,
  listId,
  repository,
}: GetListInput): Promise<ListView | null> {
  const actorProfileId = actor?.profileId ?? null;
  const record = await repository.getList(listId, actorProfileId);

  return record ? mapListRecord(record, actorProfileId) : null;
}

export function mapListSummaryRecord(
  record: ListSummaryRecord,
  actorProfileId: string | null,
): ListSummaryView {
  const { access, ...summary } = record;
  const currentUserRole = listRoleForAccess(access, actorProfileId);

  return {
    ...summary,
    currentUserRole,
    capabilities: capabilitiesForListRole(currentUserRole),
  };
}

export function mapListRecord(
  record: ListRecord,
  actorProfileId: string | null,
): ListView {
  const { access, ...list } = record;
  const currentUserRole = listRoleForAccess(access, actorProfileId);

  return {
    ...list,
    currentUserRole,
    capabilities: capabilitiesForListRole(currentUserRole),
  };
}
