import type { ShoppingList } from "@shared";
import {
  addListMember,
  addItem,
  addSection,
  createList,
  deleteItem,
  deleteList,
  deleteSection,
  getList,
  getListMembers,
  getLists,
  getRecentLists,
  moveSection,
  removeListMember,
  renameItem,
  renameSection,
  resetCheckedItems,
  toggleItemChecked,
  updateList,
} from "../../storage/lists";
import { ApiClientError, apiRequest } from "@/utils/api";
import { getCurrentSession, isSignedIn } from "@/utils/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";

jest.mock("@/utils/api", () => {
  class MockApiClientError extends Error {
    status: number;
    code: string;

    constructor(status: number, code: string, message: string) {
      super(message);
      this.status = status;
      this.code = code;
    }
  }

  return {
    ApiClientError: MockApiClientError,
    apiRequest: jest.fn(),
  };
});

jest.mock("@/utils/auth", () => ({
  getCurrentSession: jest.fn(),
  isSignedIn: jest.fn(),
}));

const mockedApiRequest = jest.mocked(apiRequest);
const mockedGetCurrentSession = jest.mocked(getCurrentSession);
const mockedIsSignedIn = jest.mocked(isSignedIn);

const list: ShoppingList = {
  capabilities: {
    canDelete: true,
    canEdit: true,
    canShare: true,
    canShop: true,
  },
  createdAt: "2026-01-01T00:00:00.000Z",
  currentUserRole: "owner",
  id: "list-1",
  name: "Groceries",
  ownerProfileId: "profile-owner",
  sections: [
    {
      createdAt: "2026-01-01T00:00:00.000Z",
      id: "section-1",
      items: [
        {
          checked: false,
          createdAt: "2026-01-01T00:00:00.000Z",
          id: "item-1",
          name: "Milk",
          position: 0,
          sectionId: "section-1",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
      listId: "list-1",
      name: "Dairy",
      position: 0,
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
  ],
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("lists storage API adapter", () => {
  beforeEach(() => {
    mockedApiRequest.mockReset();
    mockedGetCurrentSession.mockResolvedValue({
      access_token: "token-1",
      expires_at: 1,
      expires_in: 3600,
      refresh_token: "refresh-token",
      token_type: "bearer",
      user: { id: "user-1" },
    } as never);
    mockedIsSignedIn.mockResolvedValue(true);
    AsyncStorage.clear();
  });

  it("fetches full lists from summary endpoints", async () => {
    const apiList: ShoppingList = {
      ...list,
      capabilities: {
        canDelete: false,
        canEdit: true,
        canShare: false,
        canShop: true,
      },
      currentUserRole: "collaborator",
      ownerProfileId: "profile-owner",
    };
    mockedApiRequest
      .mockResolvedValueOnce({ lists: [{ id: "list-1" }] })
      .mockResolvedValueOnce({ list: apiList });

    await expect(getLists()).resolves.toEqual([apiList]);

    expect(mockedApiRequest).toHaveBeenNthCalledWith(1, "/lists");
    expect(mockedApiRequest).toHaveBeenNthCalledWith(2, "/lists/list-1");

    mockedApiRequest
      .mockResolvedValueOnce({ lists: [{ id: "list-1" }] })
      .mockResolvedValueOnce({ list: apiList });

    await expect(getRecentLists(2)).resolves.toEqual([apiList]);
    expect(mockedApiRequest).toHaveBeenNthCalledWith(
      3,
      "/lists/recent?limit=2",
    );
  });

  it("maps create, update, and delete list calls", async () => {
    mockedApiRequest.mockResolvedValue({ list });

    await createList("Groceries");
    expect(mockedApiRequest).toHaveBeenCalledWith("/lists", {
      body: JSON.stringify({ name: "Groceries" }),
      method: "POST",
    });

    await updateList("list-1", { name: "New name" });
    expect(mockedApiRequest).toHaveBeenCalledWith("/lists/list-1", {
      body: JSON.stringify({ name: "New name" }),
      method: "PATCH",
    });

    await deleteList("list-1");
    expect(mockedApiRequest).toHaveBeenCalledWith("/lists/list-1", {
      method: "DELETE",
    });
  });

  it("maps list member calls", async () => {
    const member = {
      createdAt: "2026-01-01T00:00:00.000Z",
      displayName: "Morgan",
      email: "morgan@example.com",
      id: "profile-member",
    };
    mockedApiRequest
      .mockResolvedValueOnce({ members: [member] })
      .mockResolvedValueOnce({ member })
      .mockResolvedValueOnce(undefined);

    await expect(getListMembers("list-1")).resolves.toEqual([member]);
    expect(mockedApiRequest).toHaveBeenCalledWith("/lists/list-1/members");

    await expect(
      addListMember("list-1", " Morgan@Example.com "),
    ).resolves.toEqual(member);
    expect(mockedApiRequest).toHaveBeenCalledWith("/lists/list-1/members", {
      body: JSON.stringify({ email: "morgan@example.com" }),
      method: "POST",
    });

    await removeListMember("list-1", "profile-member");
    expect(mockedApiRequest).toHaveBeenCalledWith(
      "/lists/list-1/members/profile-member",
      { method: "DELETE" },
    );
  });

  it("maps section and item mutations", async () => {
    mockedApiRequest.mockResolvedValue({ list });

    await addSection("list-1", "Dairy");
    await renameSection("list-1", "section-1", "Produce");
    await deleteSection("list-1", "section-1");
    await moveSection("list-1", "section-1", "down");
    await addItem("list-1", "section-1", "Milk");
    await renameItem("list-1", "section-1", "item-1", "Whole milk");
    await deleteItem("list-1", "section-1", "item-1");
    await resetCheckedItems("list-1");

    expect(mockedApiRequest).toHaveBeenCalledWith("/lists/list-1/sections", {
      body: JSON.stringify({ name: "Dairy" }),
      method: "POST",
    });
    expect(mockedApiRequest).toHaveBeenCalledWith(
      "/lists/list-1/sections/section-1",
      {
        body: JSON.stringify({ name: "Produce" }),
        method: "PATCH",
      },
    );
    expect(mockedApiRequest).toHaveBeenCalledWith(
      "/lists/list-1/sections/section-1",
      { method: "DELETE" },
    );
    expect(mockedApiRequest).toHaveBeenCalledWith(
      "/lists/list-1/sections/section-1/position",
      {
        body: JSON.stringify({ direction: "down" }),
        method: "PATCH",
      },
    );
    expect(mockedApiRequest).toHaveBeenCalledWith(
      "/lists/list-1/sections/section-1/items",
      {
        body: JSON.stringify({ name: "Milk" }),
        method: "POST",
      },
    );
    expect(mockedApiRequest).toHaveBeenCalledWith(
      "/lists/list-1/sections/section-1/items/item-1",
      {
        body: JSON.stringify({ name: "Whole milk" }),
        method: "PATCH",
      },
    );
    expect(mockedApiRequest).toHaveBeenCalledWith(
      "/lists/list-1/sections/section-1/items/item-1",
      { method: "DELETE" },
    );
    expect(mockedApiRequest).toHaveBeenCalledWith(
      "/lists/list-1/items/reset-checked",
      { method: "POST" },
    );
  });

  it("returns null only for getList 404s", async () => {
    mockedApiRequest.mockRejectedValueOnce(
      new ApiClientError(404, "not_found", "Missing"),
    );
    await expect(getList("missing")).resolves.toBeNull();

    mockedApiRequest.mockRejectedValueOnce(
      new ApiClientError(500, "internal_error", "Broken"),
    );
    await expect(getList("broken")).rejects.toThrow("Broken");
  });

  it("toggles item checked state from the current list", async () => {
    mockedApiRequest.mockResolvedValueOnce({ list }).mockResolvedValueOnce({
      list: {
        ...list,
        sections: [
          {
            ...list.sections[0],
            items: [{ ...list.sections[0].items[0], checked: true }],
          },
        ],
      },
    });

    await toggleItemChecked("list-1", "section-1", "item-1");

    expect(mockedApiRequest).toHaveBeenNthCalledWith(1, "/lists/list-1");
    expect(mockedApiRequest).toHaveBeenNthCalledWith(
      2,
      "/lists/list-1/sections/section-1/items/item-1",
      {
        body: JSON.stringify({ checked: true }),
        method: "PATCH",
      },
    );
  });

  it("stores guest lists locally without calling the API", async () => {
    mockedIsSignedIn.mockResolvedValue(false);

    const created = await createList("Groceries");
    const withSection = await addSection(created.id, "Dairy");
    const sectionId = withSection?.sections[0].id as string;
    const withItem = await addItem(created.id, sectionId, "Milk");
    const itemId = withItem?.sections[0].items[0].id as string;

    await expect(getLists()).resolves.toMatchObject([
      {
        id: created.id,
        capabilities: {
          canDelete: true,
          canEdit: true,
          canShare: true,
          canShop: true,
        },
        currentUserRole: "guest",
        name: "Groceries",
        ownerProfileId: null,
        sections: [
          {
            name: "Dairy",
            items: [{ checked: false, name: "Milk" }],
          },
        ],
      },
    ]);

    await toggleItemChecked(created.id, sectionId, itemId);
    await expect(getList(created.id)).resolves.toMatchObject({
      sections: [{ items: [{ checked: true }] }],
    });

    await resetCheckedItems(created.id);
    await expect(getList(created.id)).resolves.toMatchObject({
      sections: [{ items: [{ checked: false }] }],
    });

    await deleteList(created.id);
    await expect(getLists()).resolves.toEqual([]);
    expect(mockedApiRequest).not.toHaveBeenCalled();
  });

  it("keeps guest local mutations behind the storage facade", async () => {
    mockedIsSignedIn.mockResolvedValue(false);

    const created = await createList("Store");
    const updated = await updateList(created.id, { name: "Weekly shop" });
    const withProduce = await addSection(created.id, "Produce");
    const produceId = withProduce?.sections[0].id as string;
    const withDairy = await addSection(created.id, "Dairy");
    const dairyId = withDairy?.sections[1].id as string;

    await moveSection(created.id, dairyId, "up");
    await renameSection(created.id, produceId, "Fruit and veg");
    await deleteSection(created.id, dairyId);

    await expect(getRecentLists()).resolves.toMatchObject([
      {
        id: created.id,
        name: updated?.name,
        sections: [{ name: "Fruit and veg", position: 0 }],
      },
    ]);
  });

  it("imports guest lists once for a signed-in user", async () => {
    mockedIsSignedIn.mockResolvedValue(false);
    const created = await createList("Weekend shop");
    const withProduce = await addSection(created.id, "Produce");
    const produceId = withProduce?.sections[0].id as string;
    const withDairy = await addSection(created.id, "Dairy");
    const dairyId = withDairy?.sections[1].id as string;
    const withApples = await addItem(created.id, produceId, "Apples");
    const applesId = withApples?.sections[0].items[0].id as string;
    await addItem(created.id, dairyId, "Milk");
    await toggleItemChecked(created.id, produceId, applesId);

    const importedList: ShoppingList = {
      ...list,
      id: "api-list-1",
      name: "Weekend shop",
      sections: [],
    };
    const importedProduce = {
      ...list.sections[0],
      id: "api-section-produce",
      items: [],
      listId: "api-list-1",
      name: "Produce",
      position: 0,
    };
    const importedDairy = {
      ...list.sections[0],
      id: "api-section-dairy",
      items: [],
      listId: "api-list-1",
      name: "Dairy",
      position: 1,
    };
    const importedApples = {
      ...list.sections[0].items[0],
      checked: false,
      id: "api-item-apples",
      name: "Apples",
      sectionId: "api-section-produce",
    };
    const importedMilk = {
      ...list.sections[0].items[0],
      id: "api-item-milk",
      name: "Milk",
      sectionId: "api-section-dairy",
    };

    mockedIsSignedIn.mockResolvedValue(true);
    mockedApiRequest
      .mockResolvedValueOnce({ list: importedList })
      .mockResolvedValueOnce({
        list: { ...importedList, sections: [importedProduce] },
      })
      .mockResolvedValueOnce({
        list: {
          ...importedList,
          sections: [
            { ...importedProduce, items: [importedApples] },
            importedDairy,
          ],
        },
      })
      .mockResolvedValueOnce({
        list: {
          ...importedList,
          sections: [
            {
              ...importedProduce,
              items: [{ ...importedApples, checked: true }],
            },
            importedDairy,
          ],
        },
      })
      .mockResolvedValueOnce({
        list: {
          ...importedList,
          sections: [
            {
              ...importedProduce,
              items: [{ ...importedApples, checked: true }],
            },
            importedDairy,
          ],
        },
      })
      .mockResolvedValueOnce({
        list: {
          ...importedList,
          sections: [
            {
              ...importedProduce,
              items: [{ ...importedApples, checked: true }],
            },
            { ...importedDairy, items: [importedMilk] },
          ],
        },
      })
      .mockResolvedValueOnce({ lists: [{ id: "api-list-1" }] })
      .mockResolvedValueOnce({
        list: {
          ...importedList,
          sections: [
            {
              ...importedProduce,
              items: [{ ...importedApples, checked: true }],
            },
            { ...importedDairy, items: [importedMilk] },
          ],
        },
      });

    await getLists();

    expect(mockedApiRequest).toHaveBeenNthCalledWith(1, "/lists", {
      body: JSON.stringify({ name: "Weekend shop" }),
      method: "POST",
    });
    expect(mockedApiRequest).toHaveBeenNthCalledWith(
      2,
      "/lists/api-list-1/sections",
      {
        body: JSON.stringify({ name: "Produce" }),
        method: "POST",
      },
    );
    expect(mockedApiRequest).toHaveBeenNthCalledWith(
      3,
      "/lists/api-list-1/sections/api-section-produce/items",
      {
        body: JSON.stringify({ name: "Apples" }),
        method: "POST",
      },
    );
    expect(mockedApiRequest).toHaveBeenNthCalledWith(
      4,
      "/lists/api-list-1/sections/api-section-produce/items/api-item-apples",
      {
        body: JSON.stringify({ checked: true }),
        method: "PATCH",
      },
    );
    expect(mockedApiRequest).toHaveBeenNthCalledWith(
      5,
      "/lists/api-list-1/sections",
      {
        body: JSON.stringify({ name: "Dairy" }),
        method: "POST",
      },
    );
    expect(mockedApiRequest).toHaveBeenNthCalledWith(
      6,
      "/lists/api-list-1/sections/api-section-dairy/items",
      {
        body: JSON.stringify({ name: "Milk" }),
        method: "POST",
      },
    );
    await expect(
      AsyncStorage.getItem("aisle-shopper:guest-imports:user-1"),
    ).resolves.toBe("complete");

    mockedApiRequest.mockClear();
    mockedApiRequest
      .mockResolvedValueOnce({ lists: [{ id: "api-list-1" }] })
      .mockResolvedValueOnce({ list: importedList });

    await getLists();

    expect(mockedApiRequest).toHaveBeenCalledTimes(2);
    expect(mockedApiRequest).toHaveBeenNthCalledWith(1, "/lists");
  });

  it("preserves guest lists and leaves import incomplete when import fails", async () => {
    mockedIsSignedIn.mockResolvedValue(false);
    const created = await createList("Retry later");

    mockedIsSignedIn.mockResolvedValue(true);
    mockedApiRequest.mockRejectedValueOnce(new Error("Network failed"));

    await expect(getLists()).rejects.toThrow("Network failed");
    await expect(
      AsyncStorage.getItem("aisle-shopper:guest-imports:user-1"),
    ).resolves.toBeNull();

    mockedIsSignedIn.mockResolvedValue(false);
    await expect(getLists()).resolves.toMatchObject([
      { id: created.id, name: "Retry later" },
    ]);
  });
});
