import type { ListMember, Profile } from "../../../../shared/src";
import type { ListMemberRecord } from "../../application/listSharingUseCases";
import type { ProfileRecord } from "../../application/profileUseCases";

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
