import { fireEvent, render, screen } from "@testing-library/react-native";
import { router } from "expo-router";
import type { ShoppingList } from "@/storage/lists";
import RecentLists from "./RecentLists";

jest.mock("expo-router", () => ({
  router: {
    push: jest.fn(),
  },
}));

const list: ShoppingList = {
  createdAt: "2026-01-01T00:00:00.000Z",
  id: "list-1",
  name: "Weekly groceries",
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

describe("RecentLists", () => {
  it("renders an empty state", () => {
    render(<RecentLists lists={[]} />);

    expect(screen.getByText("No lists yet.")).toBeTruthy();
  });

  it("renders recent lists and navigates to details", () => {
    render(<RecentLists lists={[list]} />);

    fireEvent.press(screen.getByText("Weekly groceries"));

    expect(router.push).toHaveBeenCalledWith({
      params: { id: "list-1" },
      pathname: "/lists/[id]",
    });
  });
});
