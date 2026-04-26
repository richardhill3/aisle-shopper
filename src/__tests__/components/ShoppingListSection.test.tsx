import { Alert } from "react-native";
import { fireEvent, render, screen } from "@testing-library/react-native";
import type { ShoppingSection } from "@/storage/lists";
import ShoppingListSection from "../../components/ShoppingListSection";

const section: ShoppingSection = {
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
    {
      checked: true,
      createdAt: "2026-01-01T00:00:00.000Z",
      id: "item-2",
      name: "Eggs",
      position: 1,
      sectionId: "section-1",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
  ],
  listId: "list-1",
  name: "Dairy",
  position: 0,
  updatedAt: "2026-01-01T00:00:00.000Z",
};

function renderSection(
  overrides: Partial<React.ComponentProps<typeof ShoppingListSection>> = {},
) {
  const props: React.ComponentProps<typeof ShoppingListSection> = {
    collapsed: false,
    mode: "edit",
    onAddItem: jest.fn(),
    onDeleteItem: jest.fn(),
    onDeleteSection: jest.fn(),
    onMoveSection: jest.fn(),
    onRenameItem: jest.fn(),
    onRenameSection: jest.fn(),
    onToggleCollapsed: jest.fn(),
    onToggleItem: jest.fn(),
    section,
    sectionCount: 2,
    sectionIndex: 0,
    ...overrides,
  };

  render(<ShoppingListSection {...props} />);
  return props;
}

describe("ShoppingListSection", () => {
  it("adds and renames items and sections in edit mode", () => {
    const props = renderSection();

    fireEvent.changeText(screen.getByPlaceholderText("Aisle name"), "Cheese");
    fireEvent(screen.getByDisplayValue("Cheese"), "blur");
    expect(props.onRenameSection).toHaveBeenCalledWith("Cheese");

    fireEvent.changeText(screen.getByDisplayValue("Milk"), "Whole milk");
    fireEvent(screen.getByDisplayValue("Whole milk"), "blur");
    expect(props.onRenameItem).toHaveBeenCalledWith("item-1", "Whole milk");

    fireEvent.changeText(screen.getByPlaceholderText("Add item"), "Yogurt");
    fireEvent(screen.getByDisplayValue("Yogurt"), "submitEditing");
    expect(props.onAddItem).toHaveBeenCalledWith("Yogurt");
  });

  it("confirms destructive actions and disables boundary move buttons", () => {
    const alertSpy = jest.spyOn(Alert, "alert");
    const props = renderSection();

    const moveUp = screen.getByLabelText("Move aisle up");
    expect(
      moveUp.props.accessibilityState?.disabled ?? moveUp.props.disabled,
    ).toBeTruthy();

    fireEvent.press(screen.getByLabelText("Move aisle down"));
    expect(props.onMoveSection).toHaveBeenCalledWith("down");

    fireEvent.press(screen.getByLabelText("Delete aisle"));
    expect(alertSpy).toHaveBeenCalledWith(
      "Delete aisle?",
      "This removes the aisle and every item in it.",
      expect.any(Array),
    );
  });

  it("renders shop mode checkboxes and collapse toggles", () => {
    const props = renderSection({ mode: "shop" });

    const milk = screen.getByText("Milk");
    fireEvent.press(milk);
    expect(props.onToggleItem).toHaveBeenCalledWith("item-1");

    const checkbox = screen.getAllByRole("checkbox")[1];
    expect(checkbox.props.accessibilityState.checked).toBe(true);

    fireEvent.press(screen.getByText("Dairy"));
    expect(props.onToggleCollapsed).toHaveBeenCalledTimes(1);
  });
});
