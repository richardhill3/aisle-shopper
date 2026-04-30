import type {
  ListMember,
  Profile,
  ShoppingItem,
  ShoppingList,
  ShoppingListSummary,
  ShoppingSection,
} from "../../../../shared/src";
import type {
  ListItemRecord,
  ListSectionRecord,
  ListSummaryView,
  ListView,
} from "../../application/listReadUseCases";
import type { ListMemberRecord } from "../../application/listSharingUseCases";
import type { ProfileRecord } from "../../application/profileUseCases";

function iso(value: Date) {
  return value.toISOString();
}

export function mapListMember(record: ListMemberRecord): ListMember {
  return {
    id: record.id,
    email: record.email,
    displayName: record.displayName,
    createdAt: record.createdAt.toISOString(),
  };
}

export function mapProfile(record: ProfileRecord): Profile {
  return {
    id: record.id,
    supabaseUserId: record.supabaseUserId,
    email: record.email,
    displayName: record.displayName,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

export function mapListSummary(record: ListSummaryView): ShoppingListSummary {
  return {
    id: record.id,
    name: record.name,
    sectionCount: record.sectionCount,
    itemCount: record.itemCount,
    ownerProfileId: record.ownerProfileId,
    currentUserRole: record.currentUserRole,
    capabilities: record.capabilities,
    createdAt: iso(record.createdAt),
    updatedAt: iso(record.updatedAt),
  };
}

export function mapList(record: ListView): ShoppingList {
  return {
    id: record.id,
    name: record.name,
    sections: record.sections.map(mapSection),
    ownerProfileId: record.ownerProfileId,
    currentUserRole: record.currentUserRole,
    capabilities: record.capabilities,
    createdAt: iso(record.createdAt),
    updatedAt: iso(record.updatedAt),
  };
}

function mapSection(record: ListSectionRecord): ShoppingSection {
  return {
    id: record.id,
    listId: record.listId,
    name: record.name,
    position: record.position,
    items: record.items.map(mapItem),
    createdAt: iso(record.createdAt),
    updatedAt: iso(record.updatedAt),
  };
}

function mapItem(record: ListItemRecord): ShoppingItem {
  return {
    id: record.id,
    sectionId: record.sectionId,
    name: record.name,
    checked: record.checked,
    position: record.position,
    createdAt: iso(record.createdAt),
    updatedAt: iso(record.updatedAt),
  };
}
