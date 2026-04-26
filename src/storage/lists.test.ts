import type { ShoppingList } from "@shared";
import {
  addItem,
  addSection,
  createList,
  deleteItem,
  deleteList,
  deleteSection,
  getList,
  getLists,
  getRecentLists,
  moveSection,
  renameItem,
  renameSection,
  resetCheckedItems,
  toggleItemChecked,
  updateList,
} from "./lists";
import { ApiClientError, apiRequest } from "@/utils/api";

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

const mockedApiRequest = jest.mocked(apiRequest);

const list: ShoppingList = {
  createdAt: "2026-01-01T00:00:00.000Z",
  id: "list-1",
  name: "Groceries",
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
  });

  it("fetches full lists from summary endpoints", async () => {
    mockedApiRequest
      .mockResolvedValueOnce({ lists: [{ id: "list-1" }] })
      .mockResolvedValueOnce({ list });

    await expect(getLists()).resolves.toEqual([list]);

    expect(mockedApiRequest).toHaveBeenNthCalledWith(1, "/lists");
    expect(mockedApiRequest).toHaveBeenNthCalledWith(2, "/lists/list-1");

    mockedApiRequest
      .mockResolvedValueOnce({ lists: [{ id: "list-1" }] })
      .mockResolvedValueOnce({ list });

    await expect(getRecentLists(2)).resolves.toEqual([list]);
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
});
