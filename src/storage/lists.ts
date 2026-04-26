import type { ListResponse, ListsResponse, ShoppingList } from "@shared";
import { ApiClientError, apiRequest } from "@/utils/api";

export type { ShoppingItem, ShoppingList, ShoppingSection } from "@shared";

export async function getLists(): Promise<ShoppingList[]> {
  const { lists } = await apiRequest<ListsResponse>("/lists");
  return Promise.all(lists.map((list) => getRequiredList(list.id)));
}

export async function getRecentLists(limit = 3): Promise<ShoppingList[]> {
  const { lists } = await apiRequest<ListsResponse>(
    `/lists/recent?limit=${limit}`,
  );
  return Promise.all(lists.map((list) => getRequiredList(list.id)));
}

export async function getList(id: string): Promise<ShoppingList | null> {
  try {
    const { list } = await apiRequest<ListResponse>(`/lists/${id}`);
    return list;
  } catch (error) {
    if (error instanceof ApiClientError && error.status === 404) {
      return null;
    }

    throw error;
  }
}

export async function createList(name: string): Promise<ShoppingList> {
  const { list } = await apiRequest<ListResponse>("/lists", {
    body: JSON.stringify({ name }),
    method: "POST",
  });
  return list;
}

export async function updateList(
  id: string,
  updates: Pick<ShoppingList, "name">,
): Promise<ShoppingList | null> {
  const { list } = await apiRequest<ListResponse>(`/lists/${id}`, {
    body: JSON.stringify(updates),
    method: "PATCH",
  });
  return list;
}

export async function deleteList(id: string): Promise<void> {
  await apiRequest<void>(`/lists/${id}`, {
    method: "DELETE",
  });
}

export async function addSection(
  listId: string,
  name: string,
): Promise<ShoppingList | null> {
  const { list } = await apiRequest<ListResponse>(`/lists/${listId}/sections`, {
    body: JSON.stringify({ name }),
    method: "POST",
  });
  return list;
}

export async function renameSection(
  listId: string,
  sectionId: string,
  name: string,
): Promise<ShoppingList | null> {
  const { list } = await apiRequest<ListResponse>(
    `/lists/${listId}/sections/${sectionId}`,
    {
      body: JSON.stringify({ name }),
      method: "PATCH",
    },
  );
  return list;
}

export async function deleteSection(
  listId: string,
  sectionId: string,
): Promise<ShoppingList | null> {
  const { list } = await apiRequest<ListResponse>(
    `/lists/${listId}/sections/${sectionId}`,
    {
      method: "DELETE",
    },
  );
  return list;
}

export async function moveSection(
  listId: string,
  sectionId: string,
  direction: "up" | "down",
): Promise<ShoppingList | null> {
  const { list } = await apiRequest<ListResponse>(
    `/lists/${listId}/sections/${sectionId}/position`,
    {
      body: JSON.stringify({ direction }),
      method: "PATCH",
    },
  );
  return list;
}

export async function addItem(
  listId: string,
  sectionId: string,
  name: string,
): Promise<ShoppingList | null> {
  const { list } = await apiRequest<ListResponse>(
    `/lists/${listId}/sections/${sectionId}/items`,
    {
      body: JSON.stringify({ name }),
      method: "POST",
    },
  );
  return list;
}

export async function renameItem(
  listId: string,
  sectionId: string,
  itemId: string,
  name: string,
): Promise<ShoppingList | null> {
  const { list } = await apiRequest<ListResponse>(
    `/lists/${listId}/sections/${sectionId}/items/${itemId}`,
    {
      body: JSON.stringify({ name }),
      method: "PATCH",
    },
  );
  return list;
}

export async function deleteItem(
  listId: string,
  sectionId: string,
  itemId: string,
): Promise<ShoppingList | null> {
  const { list } = await apiRequest<ListResponse>(
    `/lists/${listId}/sections/${sectionId}/items/${itemId}`,
    {
      method: "DELETE",
    },
  );
  return list;
}

export async function toggleItemChecked(
  listId: string,
  sectionId: string,
  itemId: string,
): Promise<ShoppingList | null> {
  const currentList = await getRequiredList(listId);
  const section = currentList.sections.find(
    (candidate) => candidate.id === sectionId,
  );
  const item = section?.items.find((candidate) => candidate.id === itemId);

  if (!item) {
    return null;
  }

  const { list } = await apiRequest<ListResponse>(
    `/lists/${listId}/sections/${sectionId}/items/${itemId}`,
    {
      body: JSON.stringify({ checked: !item.checked }),
      method: "PATCH",
    },
  );
  return list;
}

export async function resetCheckedItems(
  listId: string,
): Promise<ShoppingList | null> {
  const { list } = await apiRequest<ListResponse>(
    `/lists/${listId}/items/reset-checked`,
    {
      method: "POST",
    },
  );
  return list;
}

async function getRequiredList(id: string): Promise<ShoppingList> {
  const list = await getList(id);

  if (!list) {
    throw new Error("List not found.");
  }

  return list;
}
