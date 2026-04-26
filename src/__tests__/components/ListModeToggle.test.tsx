import { fireEvent, render, screen } from "@testing-library/react-native";
import ListModeToggle from "../../components/ListModeToggle";

describe("ListModeToggle", () => {
  it("selects edit and shop modes", () => {
    const onChangeMode = jest.fn();

    render(<ListModeToggle mode="edit" onChangeMode={onChangeMode} />);

    fireEvent.press(screen.getByText("Shop"));
    fireEvent.press(screen.getByText("Edit"));

    expect(onChangeMode).toHaveBeenNthCalledWith(1, "shop");
    expect(onChangeMode).toHaveBeenNthCalledWith(2, "edit");
  });
});
