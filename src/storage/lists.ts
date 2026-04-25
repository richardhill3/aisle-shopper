import AsyncStorage from "@react-native-async-storage/async-storage";

const listsKey = "aisle-shopper:lists";

export type ShoppingItem = {
  id: string;
  name: string;
  checked: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ShoppingSection = {
  id: string;
  name: string;
  items: ShoppingItem[];
  createdAt: string;
  updatedAt: string;
};

export type ShoppingList = {
  id: string;
  name: string;
  sections: ShoppingSection[];
  createdAt: string;
  updatedAt: string;
};

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

async function readLists(): Promise<ShoppingList[]> {
  const value = await AsyncStorage.getItem(listsKey);

  if (!value) {
    return [];
  }

  try {
    const lists = JSON.parse(value);

    if (Array.isArray(lists)) {
      return lists as ShoppingList[];
    }
  } catch {
    return [];
  }

  return [];
}

async function writeLists(lists: ShoppingList[]): Promise<void> {
  await AsyncStorage.setItem(listsKey, JSON.stringify(lists));
}

async function updateLists(
  updater: (lists: ShoppingList[]) => ShoppingList[],
): Promise<ShoppingList[]> {
  const lists = await readLists();
  const updatedLists = updater(lists);
  await writeLists(updatedLists);
  return updatedLists;
}

function sortByUpdatedAt(lists: ShoppingList[]) {
  return [...lists].sort(
    (first, second) =>
      new Date(second.updatedAt).getTime() -
      new Date(first.updatedAt).getTime(),
  );
}

export async function getLists(): Promise<ShoppingList[]> {
  return sortByUpdatedAt(await readLists());
}

export async function getRecentLists(limit = 3): Promise<ShoppingList[]> {
  const lists = await getLists();
  return lists.slice(0, limit);
}

export async function getList(id: string): Promise<ShoppingList | null> {
  const lists = await readLists();
  return lists.find((list) => list.id === id) ?? null;
}

export async function createList(name: string): Promise<ShoppingList> {
  const now = new Date().toISOString();
  const list: ShoppingList = {
    id: createId("list"),
    name,
    sections: [],
    createdAt: now,
    updatedAt: now,
  };

  await updateLists((lists) => [list, ...lists]);

  return list;
}

export async function updateList(
  id: string,
  updates: Pick<ShoppingList, "name">,
): Promise<ShoppingList | null> {
  const now = new Date().toISOString();
  let updatedList: ShoppingList | null = null;

  await updateLists((lists) =>
    lists.map((list) => {
      if (list.id !== id) {
        return list;
      }

      updatedList = {
        ...list,
        ...updates,
        updatedAt: now,
      };

      return updatedList;
    }),
  );

  return updatedList;
}

export async function deleteList(id: string): Promise<void> {
  await updateLists((lists) => lists.filter((list) => list.id !== id));
}

export async function addSection(
  listId: string,
  name: string,
): Promise<ShoppingList | null> {
  const now = new Date().toISOString();
  const section: ShoppingSection = {
    id: createId("section"),
    name,
    items: [],
    createdAt: now,
    updatedAt: now,
  };

  return updateStoredList(listId, (list) => ({
    ...list,
    sections: [...list.sections, section],
  }));
}

export async function renameSection(
  listId: string,
  sectionId: string,
  name: string,
): Promise<ShoppingList | null> {
  const now = new Date().toISOString();

  return updateStoredList(listId, (list) => ({
    ...list,
    sections: list.sections.map((section) =>
      section.id === sectionId ? { ...section, name, updatedAt: now } : section,
    ),
  }));
}

export async function deleteSection(
  listId: string,
  sectionId: string,
): Promise<ShoppingList | null> {
  return updateStoredList(listId, (list) => ({
    ...list,
    sections: list.sections.filter((section) => section.id !== sectionId),
  }));
}

export async function moveSection(
  listId: string,
  sectionId: string,
  direction: "up" | "down",
): Promise<ShoppingList | null> {
  return updateStoredList(listId, (list) => {
    const currentIndex = list.sections.findIndex(
      (section) => section.id === sectionId,
    );
    const nextIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

    if (
      currentIndex < 0 ||
      nextIndex < 0 ||
      nextIndex >= list.sections.length
    ) {
      return list;
    }

    const sections = [...list.sections];
    const [section] = sections.splice(currentIndex, 1);
    sections.splice(nextIndex, 0, section);

    return {
      ...list,
      sections,
    };
  });
}

export async function addItem(
  listId: string,
  sectionId: string,
  name: string,
): Promise<ShoppingList | null> {
  const now = new Date().toISOString();
  const item: ShoppingItem = {
    id: createId("item"),
    name,
    checked: false,
    createdAt: now,
    updatedAt: now,
  };

  return updateStoredList(listId, (list) => ({
    ...list,
    sections: list.sections.map((section) =>
      section.id === sectionId
        ? {
            ...section,
            items: [...section.items, item],
            updatedAt: now,
          }
        : section,
    ),
  }));
}

export async function renameItem(
  listId: string,
  sectionId: string,
  itemId: string,
  name: string,
): Promise<ShoppingList | null> {
  const now = new Date().toISOString();

  return updateStoredList(listId, (list) => ({
    ...list,
    sections: list.sections.map((section) =>
      section.id === sectionId
        ? {
            ...section,
            items: section.items.map((item) =>
              item.id === itemId ? { ...item, name, updatedAt: now } : item,
            ),
            updatedAt: now,
          }
        : section,
    ),
  }));
}

export async function deleteItem(
  listId: string,
  sectionId: string,
  itemId: string,
): Promise<ShoppingList | null> {
  const now = new Date().toISOString();

  return updateStoredList(listId, (list) => ({
    ...list,
    sections: list.sections.map((section) =>
      section.id === sectionId
        ? {
            ...section,
            items: section.items.filter((item) => item.id !== itemId),
            updatedAt: now,
          }
        : section,
    ),
  }));
}

export async function toggleItemChecked(
  listId: string,
  sectionId: string,
  itemId: string,
): Promise<ShoppingList | null> {
  const now = new Date().toISOString();

  return updateStoredList(listId, (list) => ({
    ...list,
    sections: list.sections.map((section) =>
      section.id === sectionId
        ? {
            ...section,
            items: section.items.map((item) =>
              item.id === itemId
                ? { ...item, checked: !item.checked, updatedAt: now }
                : item,
            ),
            updatedAt: now,
          }
        : section,
    ),
  }));
}

export async function resetCheckedItems(
  listId: string,
): Promise<ShoppingList | null> {
  const now = new Date().toISOString();

  return updateStoredList(listId, (list) => ({
    ...list,
    sections: list.sections.map((section) => ({
      ...section,
      items: section.items.map((item) => ({
        ...item,
        checked: false,
        updatedAt: now,
      })),
      updatedAt: now,
    })),
  }));
}

async function updateStoredList(
  listId: string,
  updater: (list: ShoppingList) => ShoppingList,
): Promise<ShoppingList | null> {
  const now = new Date().toISOString();
  let updatedList: ShoppingList | null = null;

  await updateLists((lists) =>
    lists.map((list) => {
      if (list.id !== listId) {
        return list;
      }

      updatedList = {
        ...updater(list),
        updatedAt: now,
      };

      return updatedList;
    }),
  );

  return updatedList;
}
