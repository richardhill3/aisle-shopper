export type ListReadRole = "guest" | "owner" | "collaborator";

export type ListCapabilities = {
  canDelete: boolean;
  canEdit: boolean;
  canShare: boolean;
  canShop: boolean;
};

export type ListAccess = {
  ownerProfileId: string | null;
  memberProfileId: string | null;
};

export function listRoleForAccess(
  access: ListAccess,
  actorProfileId: string | null,
): ListReadRole {
  if (!actorProfileId) {
    return "guest";
  }

  if (access.ownerProfileId === actorProfileId) {
    return "owner";
  }

  if (access.memberProfileId === actorProfileId) {
    return "collaborator";
  }

  return "guest";
}

export function capabilitiesForListRole(role: ListReadRole): ListCapabilities {
  return {
    canDelete: role !== "collaborator",
    canEdit: true,
    canShare: role !== "collaborator",
    canShop: true,
  };
}
