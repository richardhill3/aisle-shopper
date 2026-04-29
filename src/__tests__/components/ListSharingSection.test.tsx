import type { ListMember } from "@shared";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import { Alert, Platform } from "react-native";

import ListSharingSection from "@/components/ListSharingSection";
import { ApiClientError } from "@/utils/api";

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
  };
});

const member: ListMember = {
  createdAt: "2026-01-01T00:00:00.000Z",
  displayName: "Morgan",
  email: "morgan@example.com",
  id: "profile-member",
};

describe("ListSharingSection", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(Platform, "OS", {
      configurable: true,
      value: "ios",
    });
  });

  it("shows collaborators and adds by email", async () => {
    const onAddMember = jest.fn().mockResolvedValue(undefined);

    render(
      <ListSharingSection
        members={[member]}
        onAddMember={onAddMember}
        onRemoveMember={jest.fn()}
      />,
    );

    expect(screen.getByText("Sharing")).toBeTruthy();
    expect(screen.getByText("morgan@example.com")).toBeTruthy();
    expect(screen.getByText("Morgan")).toBeTruthy();

    fireEvent.changeText(
      screen.getByPlaceholderText("Collaborator email"),
      " Alex@Example.com ",
    );
    fireEvent.press(screen.getByLabelText("Add collaborator"));

    await waitFor(() => {
      expect(onAddMember).toHaveBeenCalledWith("Alex@Example.com");
      expect(
        screen.getByPlaceholderText("Collaborator email").props.value,
      ).toBe("");
    });
  });

  it("confirms collaborator removal", async () => {
    const alertSpy = jest.spyOn(Alert, "alert");
    const onRemoveMember = jest.fn();

    render(
      <ListSharingSection
        members={[member]}
        onAddMember={jest.fn()}
        onRemoveMember={onRemoveMember}
      />,
    );

    fireEvent.press(screen.getByLabelText("Remove morgan@example.com"));

    expect(alertSpy).toHaveBeenCalledWith(
      "Remove collaborator?",
      "Morgan will lose access to this list.",
      expect.any(Array),
    );

    const actions = alertSpy.mock.calls[0][2] as {
      onPress?: () => void;
      text: string;
    }[];
    await act(async () => {
      await actions.find((action) => action.text === "Remove")?.onPress?.();
    });

    expect(onRemoveMember).toHaveBeenCalledWith("profile-member");
  });

  it("uses browser confirmation for collaborator removal on web", async () => {
    Object.defineProperty(Platform, "OS", {
      configurable: true,
      value: "web",
    });
    const confirmSpy = jest.fn().mockReturnValueOnce(true);
    Object.defineProperty(globalThis, "confirm", {
      configurable: true,
      value: confirmSpy,
    });
    const alertSpy = jest.spyOn(Alert, "alert");
    const onRemoveMember = jest.fn().mockResolvedValue(undefined);

    render(
      <ListSharingSection
        members={[member]}
        onAddMember={jest.fn()}
        onRemoveMember={onRemoveMember}
      />,
    );

    fireEvent.press(screen.getByLabelText("Remove morgan@example.com"));

    await waitFor(() => {
      expect(confirmSpy).toHaveBeenCalledWith(
        "Morgan will lose access to this list.",
      );
      expect(onRemoveMember).toHaveBeenCalledWith("profile-member");
    });
    expect(alertSpy).not.toHaveBeenCalled();
  });

  it("surfaces API validation errors", async () => {
    const alertSpy = jest.spyOn(Alert, "alert");
    const onAddMember = jest
      .fn()
      .mockRejectedValue(
        new ApiClientError(400, "invalid_request", "Profile not found."),
      );

    render(
      <ListSharingSection
        members={[]}
        onAddMember={onAddMember}
        onRemoveMember={jest.fn()}
      />,
    );

    fireEvent.changeText(
      screen.getByPlaceholderText("Collaborator email"),
      "missing@example.com",
    );
    fireEvent.press(screen.getByLabelText("Add collaborator"));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        "Unable to share list",
        "Profile not found.",
      );
    });
  });
});
