import { createList } from "@/storage/lists";
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import { router } from "expo-router";
import { Alert } from "react-native";
import CreateListScreen from "../../app/(tabs)/create-list";

jest.mock("expo-router", () => ({
  router: {
    push: jest.fn(),
  },
}));

jest.mock("@/storage/lists", () => ({
  createList: jest.fn(),
}));

describe("CreateListScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("validates empty input", async () => {
    const alertSpy = jest.spyOn(Alert, "alert");

    render(<CreateListScreen />);

    fireEvent.press(screen.getByText("Create list"));

    expect(alertSpy).toHaveBeenCalledWith(
      "List name required",
      "Enter a list name before creating it.",
    );
  });

  it("creates a list and navigates to detail", async () => {
    jest.mocked(createList).mockResolvedValue({
      createdAt: "2026-01-01T00:00:00.000Z",
      id: "list-1",
      name: "Groceries",
      sections: [],
      updatedAt: "2026-01-01T00:00:00.000Z",
    });

    render(<CreateListScreen />);

    fireEvent.changeText(screen.getByPlaceholderText("List name"), "Groceries");
    fireEvent.press(screen.getByText("Create list"));

    await waitFor(() => {
      expect(createList).toHaveBeenCalledWith("Groceries");
      expect(router.push).toHaveBeenCalledWith({
        params: { id: "list-1" },
        pathname: "/lists/[id]",
      });
    });
  });
});
