import { getList, getListMembers } from "@/storage/lists";
import { render, screen, waitFor } from "@testing-library/react-native";
import { useLocalSearchParams } from "expo-router";
import { useEffect as mockUseEffect } from "react";
import ListDetailScreen from "../../app/lists/[id]";

jest.mock("@react-navigation/native", () => ({
  useFocusEffect: (callback: () => void | (() => void)) => {
    mockUseEffect(callback, [callback]);
  },
}));

jest.mock("expo-router", () => ({
  router: {
    back: jest.fn(),
    replace: jest.fn(),
  },
  useLocalSearchParams: jest.fn(),
}));

jest.mock("@/storage/lists", () => ({
  addItem: jest.fn(),
  addListMember: jest.fn(),
  addSection: jest.fn(),
  deleteItem: jest.fn(),
  deleteList: jest.fn(),
  deleteSection: jest.fn(),
  getList: jest.fn(),
  getListMembers: jest.fn(),
  moveSection: jest.fn(),
  removeListMember: jest.fn(),
  renameItem: jest.fn(),
  renameSection: jest.fn(),
  resetCheckedItems: jest.fn(),
  toggleItemChecked: jest.fn(),
  updateList: jest.fn(),
}));

const mockedGetList = jest.mocked(getList);
const mockedGetListMembers = jest.mocked(getListMembers);
const mockedUseLocalSearchParams = jest.mocked(useLocalSearchParams);

const ownerList = {
  capabilities: {
    canDelete: true,
    canEdit: true,
    canShare: true,
    canShop: true,
  },
  createdAt: "2026-01-01T00:00:00.000Z",
  currentUserRole: "owner" as const,
  id: "list-1",
  name: "Groceries",
  ownerProfileId: "profile-owner",
  sections: [],
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("ListDetailScreen sharing controls", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseLocalSearchParams.mockReturnValue({ id: "list-1" });
  });

  it("shows owner-only sharing and delete controls", async () => {
    mockedGetList.mockResolvedValue(ownerList);
    mockedGetListMembers.mockResolvedValue([]);

    render(<ListDetailScreen />);

    await waitFor(() => {
      expect(screen.getByText("Sharing")).toBeTruthy();
    });
    expect(screen.getByLabelText("Delete list")).toBeTruthy();
    expect(mockedGetListMembers).toHaveBeenCalledWith("list-1");
  });

  it("hides sharing and delete controls for collaborators", async () => {
    mockedGetList.mockResolvedValue({
      ...ownerList,
      capabilities: {
        canDelete: false,
        canEdit: true,
        canShare: false,
        canShop: true,
      },
      currentUserRole: "collaborator",
    });

    render(<ListDetailScreen />);

    await waitFor(() => {
      expect(screen.getByDisplayValue("Groceries")).toBeTruthy();
    });
    expect(screen.queryByText("Sharing")).toBeNull();
    expect(screen.queryByLabelText("Delete list")).toBeNull();
    expect(mockedGetListMembers).not.toHaveBeenCalled();
  });
});
