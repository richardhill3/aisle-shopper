import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ListResponse, ListsResponse, ShoppingList } from "@shared";
import { ApiClientError, apiRequest } from "@/utils/api";
import { isSignedIn } from "@/utils/auth";

export type { ShoppingItem, ShoppingList, ShoppingSection } from "@shared";

const guestListsKey = "aisle-shopper:guest-lists";

export async function getLists(): Promise<ShoppingList[]> {
  if (await shouldUseApi()) {
    const { lists } = await apiRequest<ListsResponse>("/lists");
    return Promise.all(lists.map((list) => getRequiredList(list.id)));
  }

  return readGuestLists();
}

export async function getRecentLists(limit = 3): Promise<ShoppingList[]> {
  if (await shouldUseApi()) {
    const { lists } = await apiRequest<ListsResponse>(
      `/lists/recent?limit=${limit}`,
    );
    return Promise.all(lists.map((list) => getRequiredList(list.id)));
  }

  return (await readGuestLists()).slice(0, limit);
}

export async function getList(id: string): Promise<ShoppingList | null> {
  if (await shouldUseApi()) {
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

  return (await readGuestLists()).find((list) => list.id === id) ?? null;
}

export async function createList(name: string): Promise<ShoppingList> {
  if (await shouldUseApi()) {
    const { list } = await apiRequest<ListResponse>("/lists", {
      body: JSON.stringify({ name }),
      method: "POST",
    });
    return list;
  }

  const now = new Date().toISOString();
  const list: ShoppingList = {
    createdAt: now,
    id: createId(),
    name,
    sections: [],
    updatedAt: now,
  };
  await writeGuestLists([list, ...(await readGuestLists())]);
  return cloneList(list);
}

export async function updateList(
  id: string,
  updates: Pick<ShoppingList, "name">,
): Promise<ShoppingList | null> {
  if (await shouldUseApi()) {
    const { list } = await apiRequest<ListResponse>(`/lists/${id}`, {
      body: JSON.stringify(updates),
      method: "PATCH",
    });
    return list;
  }

  return updateGuestList(id, (list) => {
    list.name = updates.name;
    touchList(list);
  });
}

export async function deleteList(id: string): Promise<void> {
  if (await shouldUseApi()) {
    await apiRequest<void>(`/lists/${id}`, {
      method: "DELETE",
    });
    return;
  }

  await writeGuestLists(
    (await readGuestLists()).filter((list) => list.id !== id),
  );
}

export async function addSection(
  listId: string,
  name: string,
): Promise<ShoppingList | null> {
  if (await shouldUseApi()) {
    const { list } = await apiRequest<ListResponse>(
      `/lists/${listId}/sections`,
      {
        body: JSON.stringify({ name }),
        method: "POST",
      },
    );
    return list;
  }

  return updateGuestList(listId, (list) => {
    const now = new Date().toISOString();
    list.sections.push({
      createdAt: now,
      id: createId(),
      items: [],
      listId,
      name,
      position: list.sections.length,
      updatedAt: now,
    });
    touchList(list);
  });
}

export async function renameSection(
  listId: string,
  sectionId: string,
  name: string,
): Promise<ShoppingList | null> {
  if (await shouldUseApi()) {
    const { list } = await apiRequest<ListResponse>(
      `/lists/${listId}/sections/${sectionId}`,
      {
        body: JSON.stringify({ name }),
        method: "PATCH",
      },
    );
    return list;
  }

  return updateGuestList(listId, (list) => {
    const section = list.sections.find(
      (candidate) => candidate.id === sectionId,
    );

    if (section) {
      section.name = name;
      section.updatedAt = new Date().toISOString();
      touchList(list);
    }
  });
}

export async function deleteSection(
  listId: string,
  sectionId: string,
): Promise<ShoppingList | null> {
  if (await shouldUseApi()) {
    const { list } = await apiRequest<ListResponse>(
      `/lists/${listId}/sections/${sectionId}`,
      {
        method: "DELETE",
      },
    );
    return list;
  }

  return updateGuestList(listId, (list) => {
    list.sections = list.sections.filter((section) => section.id !== sectionId);
    reindexSections(list);
    touchList(list);
  });
}

export async function moveSection(
  listId: string,
  sectionId: string,
  direction: "up" | "down",
): Promise<ShoppingList | null> {
  if (await shouldUseApi()) {
    const { list } = await apiRequest<ListResponse>(
      `/lists/${listId}/sections/${sectionId}/position`,
      {
        body: JSON.stringify({ direction }),
        method: "PATCH",
      },
    );
    return list;
  }

  return updateGuestList(listId, (list) => {
    const currentIndex = list.sections.findIndex(
      (section) => section.id === sectionId,
    );
    const nextIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

    if (
      currentIndex < 0 ||
      nextIndex < 0 ||
      nextIndex >= list.sections.length
    ) {
      return;
    }

    const current = list.sections[currentIndex];
    list.sections[currentIndex] = list.sections[nextIndex];
    list.sections[nextIndex] = current;
    reindexSections(list);
    touchList(list);
  });
}

export async function addItem(
  listId: string,
  sectionId: string,
  name: string,
): Promise<ShoppingList | null> {
  if (await shouldUseApi()) {
    const { list } = await apiRequest<ListResponse>(
      `/lists/${listId}/sections/${sectionId}/items`,
      {
        body: JSON.stringify({ name }),
        method: "POST",
      },
    );
    return list;
  }

  return updateGuestList(listId, (list) => {
    const section = list.sections.find(
      (candidate) => candidate.id === sectionId,
    );

    if (!section) {
      return;
    }

    const now = new Date().toISOString();
    section.items.push({
      checked: false,
      createdAt: now,
      id: createId(),
      name,
      position: section.items.length,
      sectionId,
      updatedAt: now,
    });
    section.updatedAt = now;
    touchList(list);
  });
}

export async function renameItem(
  listId: string,
  sectionId: string,
  itemId: string,
  name: string,
): Promise<ShoppingList | null> {
  if (await shouldUseApi()) {
    const { list } = await apiRequest<ListResponse>(
      `/lists/${listId}/sections/${sectionId}/items/${itemId}`,
      {
        body: JSON.stringify({ name }),
        method: "PATCH",
      },
    );
    return list;
  }

  return updateGuestItem(listId, sectionId, itemId, (item) => {
    item.name = name;
  });
}

export async function deleteItem(
  listId: string,
  sectionId: string,
  itemId: string,
): Promise<ShoppingList | null> {
  if (await shouldUseApi()) {
    const { list } = await apiRequest<ListResponse>(
      `/lists/${listId}/sections/${sectionId}/items/${itemId}`,
      {
        method: "DELETE",
      },
    );
    return list;
  }

  return updateGuestList(listId, (list) => {
    const section = list.sections.find(
      (candidate) => candidate.id === sectionId,
    );

    if (!section) {
      return;
    }

    section.items = section.items.filter((item) => item.id !== itemId);
    reindexItems(section);
    section.updatedAt = new Date().toISOString();
    touchList(list);
  });
}

export async function toggleItemChecked(
  listId: string,
  sectionId: string,
  itemId: string,
): Promise<ShoppingList | null> {
  if (await shouldUseApi()) {
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

  return updateGuestItem(listId, sectionId, itemId, (item) => {
    item.checked = !item.checked;
  });
}

export async function resetCheckedItems(
  listId: string,
): Promise<ShoppingList | null> {
  if (await shouldUseApi()) {
    const { list } = await apiRequest<ListResponse>(
      `/lists/${listId}/items/reset-checked`,
      {
        method: "POST",
      },
    );
    return list;
  }

  return updateGuestList(listId, (list) => {
    for (const section of list.sections) {
      for (const item of section.items) {
        item.checked = false;
        item.updatedAt = new Date().toISOString();
      }
      section.updatedAt = new Date().toISOString();
    }
    touchList(list);
  });
}

async function shouldUseApi() {
  try {
    return await isSignedIn();
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.startsWith("Missing Expo Supabase configuration.")
    ) {
      return false;
    }

    throw error;
  }
}

async function getRequiredList(id: string): Promise<ShoppingList> {
  const list = await getList(id);

  if (!list) {
    throw new Error("List not found.");
  }

  return list;
}

async function readGuestLists() {
  const value = await AsyncStorage.getItem(guestListsKey);
  const lists = value ? (JSON.parse(value) as ShoppingList[]) : [];
  return lists.map(cloneList).sort(sortByUpdatedAt);
}

async function writeGuestLists(lists: ShoppingList[]) {
  await AsyncStorage.setItem(
    guestListsKey,
    JSON.stringify(lists.map(cloneList).sort(sortByUpdatedAt)),
  );
}

async function updateGuestList(
  id: string,
  update: (list: ShoppingList) => void,
) {
  const lists = await readGuestLists();
  const list = lists.find((candidate) => candidate.id === id);

  if (!list) {
    return null;
  }

  update(list);
  await writeGuestLists(lists);
  return cloneList(list);
}

async function updateGuestItem(
  listId: string,
  sectionId: string,
  itemId: string,
  update: (item: ShoppingList["sections"][number]["items"][number]) => void,
) {
  return updateGuestList(listId, (list) => {
    const section = list.sections.find(
      (candidate) => candidate.id === sectionId,
    );
    const item = section?.items.find((candidate) => candidate.id === itemId);

    if (!section || !item) {
      return;
    }

    update(item);
    const now = new Date().toISOString();
    item.updatedAt = now;
    section.updatedAt = now;
    touchList(list);
  });
}

function touchList(list: ShoppingList) {
  list.updatedAt = new Date().toISOString();
}

function reindexSections(list: ShoppingList) {
  list.sections.forEach((section, index) => {
    section.position = index;
  });
}

function reindexItems(section: ShoppingList["sections"][number]) {
  section.items.forEach((item, index) => {
    item.position = index;
  });
}

function cloneList(list: ShoppingList): ShoppingList {
  return JSON.parse(JSON.stringify(list)) as ShoppingList;
}

function sortByUpdatedAt(a: ShoppingList, b: ShoppingList) {
  return Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
}

function createId() {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `local-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
}
