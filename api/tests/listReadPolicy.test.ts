import { describe, expect, it } from "vitest";
import {
  capabilitiesForListRole,
  listRoleForAccess,
  type ListAccess,
} from "../src/domain/listReadPolicy";

describe("list read policy", () => {
  it.each([
    [{ ownerProfileId: null, memberProfileId: null }, null, "guest"],
    [{ ownerProfileId: "owner-profile", memberProfileId: null }, null, "guest"],
    [
      { ownerProfileId: "owner-profile", memberProfileId: null },
      "owner-profile",
      "owner",
    ],
    [
      { ownerProfileId: "owner-profile", memberProfileId: "collab-profile" },
      "collab-profile",
      "collaborator",
    ],
  ] as Array<[ListAccess, string | null, "guest" | "owner" | "collaborator"]>)(
    "maps access %j and actor %s to %s",
    (access, actorProfileId, expectedRole) => {
      expect(listRoleForAccess(access, actorProfileId)).toBe(expectedRole);
    },
  );

  it("maps guest capabilities for transitional unauthenticated lists", () => {
    expect(capabilitiesForListRole("guest")).toEqual({
      canDelete: true,
      canEdit: true,
      canShare: true,
      canShop: true,
    });
  });

  it("maps owner capabilities", () => {
    expect(capabilitiesForListRole("owner")).toEqual({
      canDelete: true,
      canEdit: true,
      canShare: true,
      canShop: true,
    });
  });

  it("maps collaborator capabilities", () => {
    expect(capabilitiesForListRole("collaborator")).toEqual({
      canDelete: false,
      canEdit: true,
      canShare: false,
      canShop: true,
    });
  });
});
