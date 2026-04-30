import type { ListMember } from "../../../../shared/src";
import type { ListMemberRecord } from "../../application/listSharingUseCases";

export function mapListMember(record: ListMemberRecord): ListMember {
  return {
    id: record.id,
    email: record.email,
    displayName: record.displayName,
    createdAt: record.createdAt.toISOString(),
  };
}
