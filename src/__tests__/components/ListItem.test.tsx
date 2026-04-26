import { fireEvent, render, screen } from "@testing-library/react-native";
import ListItem from "../../components/ListItem";

describe("ListItem", () => {
  it("renders list details and handles presses", () => {
    const onPress = jest.fn();

    render(
      <ListItem
        name="Weekly groceries"
        itemCount={2}
        sectionCount={1}
        onPress={onPress}
      />,
    );

    expect(screen.getByText("Weekly groceries")).toBeTruthy();
    expect(screen.getByText(/2 items.*1 aisle/)).toBeTruthy();

    fireEvent.press(screen.getByRole("button"));

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
