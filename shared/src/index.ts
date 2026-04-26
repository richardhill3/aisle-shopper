export type ShoppingItem = {
  id: string;
  sectionId: string;
  name: string;
  checked: boolean;
  position: number;
  createdAt: string;
  updatedAt: string;
};

export type ShoppingSection = {
  id: string;
  listId: string;
  name: string;
  position: number;
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

export type ShoppingListSummary = {
  id: string;
  name: string;
  sectionCount: number;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
};

export type ApiErrorCode =
  | "invalid_request"
  | "not_found"
  | "internal_error";

export type ApiErrorResponse = {
  error: {
    code: ApiErrorCode;
    message: string;
  };
};

export type ListsResponse = {
  lists: ShoppingListSummary[];
};

export type ListResponse = {
  list: ShoppingList;
};

export type CreateListRequest = {
  name: string;
};

export type UpdateListRequest = {
  name: string;
};

export type CreateSectionRequest = {
  name: string;
};

export type UpdateSectionRequest = {
  name: string;
};

export type MoveSectionRequest = {
  direction: "up" | "down";
};

export type CreateItemRequest = {
  name: string;
};

export type UpdateItemRequest = {
  name?: string;
  checked?: boolean;
};
