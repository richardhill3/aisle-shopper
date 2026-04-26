jest.mock("@expo/vector-icons", () => {
  const React = require("react");
  const { Text } = require("react-native");

  return {
    Ionicons: ({ name }: { name: string }) =>
      React.createElement(Text, null, name),
  };
});

jest.mock("@/utils/theme", () => {
  const React = require("react");
  const {
    createGlobalStyles,
    defaultPaletteKey,
    palettes,
  } = require("@/styles/global");
  const colors = palettes[defaultPaletteKey];

  return {
    ThemeProvider: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
    useTheme: () => ({
      colors,
      globalStyles: createGlobalStyles(colors),
      selectedPaletteKey: defaultPaletteKey,
      setSelectedPaletteKey: jest.fn(),
    }),
  };
});

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0, top: 0 }),
}));
