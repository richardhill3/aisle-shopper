import { getLists } from "@/storage/lists";
import { render, screen, waitFor } from "@testing-library/react-native";
import ListsScreen from "../../app/(tabs)/lists";

jest.mock("@react-navigation/native", () => ({
  useFocusEffect: (callback: () => void | (() => void)) => callback(),
}));

jest.mock("expo-router", () => ({
  router: {
    push: jest.fn(),
  },
}));

jest.mock("@/storage/lists", () => ({
  getLists: jest.fn(),
}));

describe("ListsScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders an empty state", async () => {
    jest.mocked(getLists).mockResolvedValue([]);

    render(<ListsScreen />);

    await waitFor(() => {
      expect(screen.getByText("No lists yet.")).toBeTruthy();
    });
  });

  it("renders saved lists", async () => {
    jest.mocked(getLists).mockResolvedValue([
      {
        capabilities: {
          canDelete: true,
          canEdit: true,
          canShare: true,
          canShop: true,
        },
        createdAt: "2026-01-01T00:00:00.000Z",
        currentUserRole: "guest",
        id: "list-1",
        name: "Groceries",
        ownerProfileId: null,
        sections: [],
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ]);

    render(<ListsScreen />);

    await waitFor(() => {
      expect(screen.getByText("Groceries")).toBeTruthy();
    });
  });
});
